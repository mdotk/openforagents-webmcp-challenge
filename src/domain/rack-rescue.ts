import type {
  RackConflict,
  RackDish,
  RackDishId,
  RackOrientation,
  RackPlacement,
  RackPlanPreview,
  RackRescueControl,
  RackSnapshot,
  RackSubscriber,
} from '../types'

const ROWS = 6 as const
const COLUMNS = 8 as const
const SPRAY_CELLS = ['3:2', '4:2'] as const
const RESERVED_TRAY_CELLS = Object.freeze([
  '0:0',
  '1:0',
  '2:0',
  '0:1',
  '1:1',
  '2:1',
])

export const rackRescueMugTargets = Object.freeze([
  Object.freeze({ column: 5, row: 0 }),
  Object.freeze({ column: 5, row: 3 }),
  Object.freeze({ column: 0, row: 5 }),
] as const)

const dishDefinitions = Object.freeze([
  ['RR-RED-MUG', 'Your red mug', 'mug', 'red-mug.webp', 'red'],
  ['RR-CHILD-CUP', "Child's cup", 'child-cup', 'child-cup.webp', 'yellow'],
  ['RR-IVORY-PLATE-1', 'Ivory plate 1', 'plate', 'ivory-plate.webp', 'ivory'],
  ['RR-IVORY-PLATE-2', 'Ivory plate 2', 'plate', 'ivory-plate.webp', 'ivory'],
  ['RR-IVORY-PLATE-3', 'Ivory plate 3', 'plate', 'ivory-plate.webp', 'ivory'],
  ['RR-IVORY-PLATE-4', 'Ivory plate 4', 'plate', 'ivory-plate.webp', 'ivory'],
  ['RR-BLUE-PLATE-1', 'Blue plate 1', 'plate', 'blue-plate.webp', 'blue'],
  ['RR-BLUE-PLATE-2', 'Blue plate 2', 'plate', 'blue-plate.webp', 'blue'],
  ['RR-IVORY-BOWL-1', 'Ivory bowl 1', 'bowl', 'ivory-bowl.webp', 'ivory'],
  ['RR-IVORY-BOWL-2', 'Ivory bowl 2', 'bowl', 'ivory-bowl.webp', 'ivory'],
  ['RR-BLUE-BOWL-1', 'Blue bowl 1', 'bowl', 'blue-bowl.webp', 'blue'],
  ['RR-BLUE-BOWL-2', 'Blue bowl 2', 'bowl', 'blue-bowl.webp', 'blue'],
  ['RR-CUTLERY', 'Cutlery basket', 'cutlery', 'cutlery.webp', 'steel'],
  ['RR-ROASTING-TRAY', 'Forgotten roasting tray', 'tray', 'roasting-tray.webp', 'steel'],
] as const)

const dishIds = new Set<RackDishId>(dishDefinitions.map(([id]) => id))

interface InternalState {
  revision: number
  placements: RackPlacement[]
  preview: RackPlanPreview | null
  roastingTrayRevealed: boolean
  mugLocked: boolean
  activity: string[]
  previewSequence: number
  undoSequence: number
  undo:
    | {
        token: string
        createdAtRevision: number
        placements: RackPlacement[]
      }
    | null
}

export class RackRescueStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RackRescueStateError'
  }
}

function clonePlacement(placement: RackPlacement): RackPlacement {
  return { ...placement }
}

function dishById(id: RackDishId) {
  return dishDefinitions.find(([dishId]) => dishId === id)
}

function dimensions(dishId: RackDishId, orientation: RackOrientation) {
  const kind = dishById(dishId)?.[2]
  if (kind === 'plate') return orientation === 'north' ? [1, 2] : [2, 1]
  if (kind === 'cutlery') return orientation === 'north' ? [1, 2] : [2, 1]
  if (kind === 'tray') return orientation === 'north' ? [4, 2] : [2, 4]
  return [1, 1]
}

function placementRules(id: RackDishId): readonly string[] {
  if (id === 'RR-RED-MUG') {
    return ['Keep the exact human-pinned placement when locked.']
  }
  if (id === 'RR-CHILD-CUP') return ['Place in columns 6–7 and rows 0–1.']
  if (id === 'RR-CUTLERY') return ['Place at column 7 and row 2 or lower.']
  if (id === 'RR-ROASTING-TRAY') {
    return ['The tray is unavailable until the person reveals it.']
  }
  return ['Keep every occupied cell inside the rack and clear of the spray arm.']
}

function occupiedCells(placement: RackPlacement): string[] {
  const [width, height] = dimensions(placement.dishId, placement.orientation)
  const cells: string[] = []
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      cells.push(`${placement.column + column}:${placement.row + row}`)
    }
  }
  return cells
}

function samePlacement(left: RackPlacement | undefined, right: RackPlacement) {
  return Boolean(
    left &&
      left.dishId === right.dishId &&
      left.column === right.column &&
      left.row === right.row &&
      left.orientation === right.orientation,
  )
}

function validatePlacements(
  state: InternalState,
  placements: readonly RackPlacement[],
): RackConflict[] {
  const conflicts: RackConflict[] = []
  const requiredIds = dishDefinitions
    .map(([id]) => id)
    .filter((id) => id !== 'RR-ROASTING-TRAY' || state.roastingTrayRevealed)
  const byDish = new Map<RackDishId, RackPlacement[]>()
  const byCell = new Map<string, RackDishId[]>()

  for (const placement of placements) {
    const existing = byDish.get(placement.dishId) ?? []
    existing.push(placement)
    byDish.set(placement.dishId, existing)

    const cells = occupiedCells(placement)
    const outOfBounds = cells.filter((cell) => {
      const [column, row] = cell.split(':').map(Number)
      return column < 0 || column >= COLUMNS || row < 0 || row >= ROWS
    })
    if (outOfBounds.length) {
      conflicts.push({
        code: 'OUT_OF_BOUNDS',
        message: `${dishById(placement.dishId)?.[1]} does not fit inside the rack.`,
        dishIds: [placement.dishId],
        cells: outOfBounds,
      })
    }
    for (const cell of cells) {
      const occupants = byCell.get(cell) ?? []
      occupants.push(placement.dishId)
      byCell.set(cell, occupants)
    }
    const blocked = cells.filter((cell) => SPRAY_CELLS.includes(cell as (typeof SPRAY_CELLS)[number]))
    if (blocked.length) {
      conflicts.push({
        code: 'SPRAY_BLOCKED',
        message: `${dishById(placement.dishId)?.[1]} blocks the central spray arm.`,
        dishIds: [placement.dishId],
        cells: blocked,
      })
    }
    if (
      placement.dishId === 'RR-CHILD-CUP' &&
      !(placement.column >= 6 && placement.row <= 1)
    ) {
      conflicts.push({
        code: 'CHILD_CUP_ZONE',
        message: "The child's cup must stay in the gentle upper-right zone.",
        dishIds: [placement.dishId],
        cells,
      })
    }
    if (
      placement.dishId === 'RR-CUTLERY' &&
      !(placement.column === 7 && placement.row >= 2)
    ) {
      conflicts.push({
        code: 'CUTLERY_ZONE',
        message: 'Cutlery must stay in the right-side basket zone.',
        dishIds: [placement.dishId],
        cells,
      })
    }
    if (
      !state.roastingTrayRevealed &&
      cells.some((cell) => RESERVED_TRAY_CELLS.includes(cell))
    ) {
      conflicts.push({
        code: 'RESERVED_TRAY_SPACE',
        message: 'This placement uses the space you asked the agent to keep free for a pan.',
        dishIds: [placement.dishId],
        cells: cells.filter((cell) => RESERVED_TRAY_CELLS.includes(cell)),
      })
    }
  }

  for (const id of requiredIds) {
    const matches = byDish.get(id) ?? []
    if (matches.length !== 1) {
      conflicts.push({
        code: 'MISSING_DISH',
        message:
          matches.length === 0
            ? `${dishById(id)?.[1]} is missing from the plan.`
            : `${dishById(id)?.[1]} appears more than once.`,
        dishIds: [id],
        cells: [],
      })
    }
  }

  if (!state.roastingTrayRevealed && byDish.has('RR-ROASTING-TRAY')) {
    conflicts.push({
      code: 'MISSING_DISH',
      message: 'The roasting tray has not been revealed yet.',
      dishIds: ['RR-ROASTING-TRAY'],
      cells: [],
    })
  }

  for (const [cell, occupants] of byCell) {
    if (occupants.length > 1) {
      conflicts.push({
        code: 'OVERLAP',
        message: `${occupants.length} dishes overlap in rack cell ${cell}.`,
        dishIds: occupants,
        cells: [cell],
      })
    }
  }

  if (state.mugLocked) {
    const current = state.placements.find((placement) => placement.dishId === 'RR-RED-MUG')
    const proposed = placements.find((placement) => placement.dishId === 'RR-RED-MUG')
    if (!proposed || !samePlacement(current, proposed)) {
      conflicts.push({
        code: 'LOCKED_DISH',
        message: 'The red mug is pinned by the person and cannot be moved.',
        dishIds: ['RR-RED-MUG'],
        cells: proposed ? occupiedCells(proposed) : [],
      })
    }
  }

  return conflicts
}

function assertRevision(state: InternalState, expectedRevision: number) {
  if (expectedRevision !== state.revision) {
    throw new RackRescueStateError(
      `Stale revision ${expectedRevision}; current revision is ${state.revision}. Read the rack again before changing it.`,
    )
  }
}

function toSnapshot(state: InternalState): RackSnapshot {
  const dishes: RackDish[] = dishDefinitions
    .filter(([id]) => id !== 'RR-ROASTING-TRAY' || state.roastingTrayRevealed)
    .map(([id, label, kind, asset, color]) => {
      const [northColumns, northRows] = dimensions(id, 'north')
      const [eastColumns, eastRows] = dimensions(id, 'east')
      return {
        id,
        label,
        kind,
        asset: `/rack-rescue/${asset}`,
        color,
        visible: true,
        lockedByHuman: id === 'RR-RED-MUG' && state.mugLocked,
        allowedOrientations: ['north', 'east'],
        footprints: {
          north: { columns: northColumns, rows: northRows },
          east: { columns: eastColumns, rows: eastRows },
        },
        placementRules: placementRules(id),
      }
    })
  return {
    revision: state.revision,
    rack: {
      columns: COLUMNS,
      rows: ROWS,
      sprayClearanceCells: SPRAY_CELLS,
      reservedTrayCells: state.roastingTrayRevealed ? [] : RESERVED_TRAY_CELLS,
    },
    dishes,
    placements: state.placements.map(clonePlacement),
    preview: state.preview
      ? {
          ...state.preview,
          placements: state.preview.placements.map(clonePlacement),
          conflicts: state.preview.conflicts.map((conflict) => ({
            ...conflict,
            dishIds: [...conflict.dishIds],
            cells: [...conflict.cells],
          })),
        }
      : null,
    undo: state.undo
      ? { token: state.undo.token, createdAtRevision: state.undo.createdAtRevision }
      : null,
    roastingTrayRevealed: state.roastingTrayRevealed,
    conflictCount: state.preview?.conflicts.length ?? 0,
    activity: [...state.activity],
  }
}

export function createRackRescueControl(): RackRescueControl {
  const state: InternalState = {
    revision: 0,
    placements: [],
    preview: null,
    roastingTrayRevealed: false,
    mugLocked: false,
    activity: ['The rack is empty. Thirteen dishes are waiting; one tray is still forgotten.'],
    previewSequence: 0,
    undoSequence: 0,
    undo: null,
  }
  const subscribers = new Set<RackSubscriber>()
  let currentSnapshot = toSnapshot(state)
  const publish = () => {
    currentSnapshot = toSnapshot(state)
    for (const subscriber of subscribers) subscriber(currentSnapshot)
    return currentSnapshot
  }

  return {
    getSnapshot: () => currentSnapshot,
    subscribe(subscriber) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    inspectDishes(ids) {
      if (!ids.length || ids.length > 14 || new Set(ids).size !== ids.length) {
        throw new TypeError('dish_ids must contain one to fourteen unique dish IDs.')
      }
      if (!ids.every((id) => dishIds.has(id))) {
        throw new TypeError('dish_ids contains an unknown dish ID.')
      }
      if (
        !ids.every((id) =>
          currentSnapshot.dishes.some((dish) => dish.id === id),
        )
      ) {
        throw new RackRescueStateError(
          'A requested dish is not currently visible on the page.',
        )
      }
      return ids.map((id) => currentSnapshot.dishes.find((dish) => dish.id === id)!)
    },
    pinRedMug(expectedRevision, column, row) {
      assertRevision(state, expectedRevision)
      if (state.mugLocked) throw new RackRescueStateError('The red mug is already pinned.')
      if (!Number.isInteger(column) || !Number.isInteger(row)) {
        throw new TypeError('The mug position requires integer column and row values.')
      }
      if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) {
        throw new RackRescueStateError('That mug position is outside the rack.')
      }
      const cell = `${column}:${row}`
      if (SPRAY_CELLS.includes(cell as (typeof SPRAY_CELLS)[number])) {
        throw new RackRescueStateError('The mug cannot block the central spray arm.')
      }
      if (!state.roastingTrayRevealed && RESERVED_TRAY_CELLS.includes(cell)) {
        throw new RackRescueStateError('That spot is being kept clear for the forgotten roasting tray.')
      }
      if (!rackRescueMugTargets.some((target) => target.column === column && target.row === row)) {
        throw new RackRescueStateError('Choose one of the three marked mug spots.')
      }
      const occupiedByAnotherDish = state.placements.some(
        (placement) =>
          placement.dishId !== 'RR-RED-MUG' && occupiedCells(placement).includes(cell),
      )
      if (occupiedByAnotherDish) {
        throw new RackRescueStateError('That mug spot is already occupied.')
      }
      state.placements = [
        ...state.placements.filter((placement) => placement.dishId !== 'RR-RED-MUG'),
        { dishId: 'RR-RED-MUG', column, row, orientation: 'north' },
      ]
      state.mugLocked = true
      state.preview = null
      state.undo = null
      state.revision += 1
      state.activity.push(`You placed the red mug at column ${column}, row ${row}. The agent must work around it.`)
      return publish()
    },
    revealRoastingTray(expectedRevision) {
      assertRevision(state, expectedRevision)
      if (state.roastingTrayRevealed) {
        throw new RackRescueStateError('The roasting tray is already visible.')
      }
      state.roastingTrayRevealed = true
      state.preview = null
      state.undo = null
      state.revision += 1
      state.activity.push('You found the roasting tray. The previous plan must be reconsidered.')
      return publish()
    },
    previewLoadPlan(expectedRevision, moves) {
      assertRevision(state, expectedRevision)
      if (!Array.isArray(moves) || moves.length > 14) {
        throw new TypeError('moves must contain at most fourteen placements.')
      }
      const placements = moves.map((move) => {
        if (!dishIds.has(move.dishId)) throw new TypeError('moves contains an unknown dish ID.')
        if (!Number.isInteger(move.column) || !Number.isInteger(move.row)) {
          throw new TypeError('Every move requires integer column and row values.')
        }
        if (move.orientation !== 'north' && move.orientation !== 'east') {
          throw new TypeError('Every move orientation must be north or east.')
        }
        return { ...move }
      })
      const conflicts = validatePlacements(state, placements)
      state.previewSequence += 1
      state.preview = {
        id: `rack-preview-${String(state.previewSequence).padStart(3, '0')}`,
        basedOnRevision: state.revision,
        placements,
        valid: conflicts.length === 0,
        conflicts,
      }
      state.undo = null
      state.revision += 1
      state.activity.push(
        conflicts.length
          ? `The agent showed a plan with ${conflicts.length} visible conflict${conflicts.length === 1 ? '' : 's'}. Nothing moved.`
          : 'The agent showed a valid load plan. Nothing moves until it is applied.',
      )
      return publish()
    },
    applyLoadPlan(expectedRevision, previewId) {
      assertRevision(state, expectedRevision)
      if (!state.preview || state.preview.id !== previewId) {
        throw new RackRescueStateError('That preview is not the current rack plan.')
      }
      if (!state.preview.valid) {
        throw new RackRescueStateError('A plan with conflicts cannot be applied.')
      }
      const previousPlacements = state.placements.map(clonePlacement)
      state.placements = state.preview.placements.map(clonePlacement)
      state.preview = null
      state.undoSequence += 1
      state.revision += 1
      state.undo = {
        token: `rack-undo-${String(state.undoSequence).padStart(3, '0')}`,
        createdAtRevision: state.revision,
        placements: previousPlacements,
      }
      state.activity.push('The valid plan was applied. One immediate Undo is available.')
      return publish()
    },
    undoLoadPlan(expectedRevision, undoToken) {
      assertRevision(state, expectedRevision)
      if (!state.undo || state.undo.token !== undoToken) {
        throw new RackRescueStateError('That Undo is unavailable or has already been used.')
      }
      if (state.undo.createdAtRevision !== state.revision) {
        throw new RackRescueStateError('Undo expired after a later change.')
      }
      state.placements = state.undo.placements.map(clonePlacement)
      state.undo = null
      state.preview = null
      state.revision += 1
      state.activity.push('The last agent-applied plan was undone once.')
      return publish()
    },
  }
}
