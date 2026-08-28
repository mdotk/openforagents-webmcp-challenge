import type {
  RackDishId,
  RackMoveInput,
  RackRescueControl,
  RackRescueToolsRegistration,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
} from '../types'

export const permanentRackRescueToolNames = Object.freeze([
  'get_rack_state',
  'inspect_dishes',
  'preview_load_plan',
  'apply_load_plan',
  'undo_load_plan',
] as const)

const rackToolNames = new Set<string>(permanentRackRescueToolNames)
const dishIds = Object.freeze([
  'RR-RED-MUG',
  'RR-CHILD-CUP',
  'RR-IVORY-PLATE-1',
  'RR-IVORY-PLATE-2',
  'RR-IVORY-PLATE-3',
  'RR-IVORY-PLATE-4',
  'RR-BLUE-PLATE-1',
  'RR-BLUE-PLATE-2',
  'RR-IVORY-BOWL-1',
  'RR-IVORY-BOWL-2',
  'RR-BLUE-BOWL-1',
  'RR-BLUE-BOWL-2',
  'RR-CUTLERY',
  'RR-ROASTING-TRAY',
] as const)

const emptySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
})

const dishIdSchema = Object.freeze({
  type: 'string',
  pattern: '^RR-[A-Z0-9-]+$',
  description: 'Use a canonical dish ID returned by get_rack_state.',
})
const dishIdsSchema = Object.freeze({
  type: 'array',
  items: dishIdSchema,
  minItems: 1,
  maxItems: 14,
  uniqueItems: true,
})

const inspectSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({ dish_ids: dishIdsSchema }),
  required: Object.freeze(['dish_ids']),
  additionalProperties: false as const,
})

const moveSchema = Object.freeze({
  type: 'object',
  properties: Object.freeze({
    dish_id: dishIdSchema,
    column: Object.freeze({ type: 'integer', minimum: 0, maximum: 7 }),
    row: Object.freeze({ type: 'integer', minimum: 0, maximum: 5 }),
    orientation: Object.freeze({ type: 'string', enum: ['north', 'east'] }),
  }),
  required: Object.freeze(['dish_id', 'column', 'row', 'orientation']),
  additionalProperties: false,
})

const previewSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    moves: Object.freeze({
      type: 'array',
      items: moveSchema,
      minItems: 1,
      maxItems: 14,
    }),
  }),
  required: Object.freeze(['expected_revision', 'moves']),
  additionalProperties: false as const,
})

const applySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    preview_id: Object.freeze({ type: 'string', pattern: '^rack-preview-[0-9]{3}$' }),
  }),
  required: Object.freeze(['expected_revision', 'preview_id']),
  additionalProperties: false as const,
})

const undoSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    undo_token: Object.freeze({ type: 'string', pattern: '^rack-undo-[0-9]{3}$' }),
  }),
  required: Object.freeze(['expected_revision', 'undo_token']),
  additionalProperties: false as const,
})

function structuredResult(summary: string, value: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: summary }], structuredContent: value }
}

function agentRackState(control: RackRescueControl) {
  const snapshot = control.getSnapshot()
  const dishTypes = Object.fromEntries(
    [...new Set(snapshot.dishes.map((dish) => dish.kind))].map((kind) => {
      const representative = snapshot.dishes.find((dish) => dish.kind === kind)!
      return [
        kind,
        {
          allowedOrientations: representative.allowedOrientations,
          footprints: representative.footprints,
          placementRules: representative.placementRules,
        },
      ]
    }),
  )
  return {
    revision: snapshot.revision,
    rack: snapshot.rack,
    dishes: snapshot.dishes.map((dish) => ({
      id: dish.id,
      kind: dish.kind,
      lockedByHuman: dish.lockedByHuman,
      placement:
        snapshot.placements.find((placement) => placement.dishId === dish.id) ??
        null,
    })),
    dishTypes,
    preview: snapshot.preview,
    undo: snapshot.undo,
    roastingTrayRevealed: snapshot.roastingTrayRevealed,
  }
}

function expectedRevision(args: Record<string, unknown>) {
  if (!Number.isInteger(args.expected_revision) || (args.expected_revision as number) < 0) {
    throw new TypeError('expected_revision must be a non-negative integer.')
  }
  return args.expected_revision as number
}

function stringArgument(args: Record<string, unknown>, key: string) {
  if (typeof args[key] !== 'string' || !args[key]) {
    throw new TypeError(`${key} must be a non-empty string.`)
  }
  return args[key] as string
}

function getDishIds(args: Record<string, unknown>): readonly RackDishId[] {
  const value = args.dish_ids
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 14 ||
    new Set(value).size !== value.length ||
    !value.every((id) => typeof id === 'string' && dishIds.includes(id as RackDishId))
  ) {
    throw new TypeError('dish_ids must contain one to fourteen unique known dish IDs.')
  }
  return value as RackDishId[]
}

function getMoves(args: Record<string, unknown>): readonly RackMoveInput[] {
  const value = args.moves
  if (!Array.isArray(value) || value.length < 1 || value.length > 14) {
    throw new TypeError('moves must contain one to fourteen placements.')
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError('Every move must be an object.')
    }
    const move = entry as Record<string, unknown>
    if (
      Object.keys(move).some(
        (key) => !['dish_id', 'column', 'row', 'orientation'].includes(key),
      ) ||
      !dishIds.includes(move.dish_id as RackDishId) ||
      !Number.isInteger(move.column) ||
      !Number.isInteger(move.row) ||
      (move.orientation !== 'north' && move.orientation !== 'east')
    ) {
      throw new TypeError('A move contains unsupported or incomplete fields.')
    }
    return {
      dishId: move.dish_id as RackDishId,
      column: move.column as number,
      row: move.row as number,
      orientation: move.orientation,
    }
  })
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Tool execution was cancelled.', 'AbortError')
  }
}

function waitForAbortableCommit(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      throwIfAborted(signal)
    } catch (error) {
      reject(error)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : new DOMException('Tool execution was cancelled.', 'AbortError'),
      )
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      try {
        throwIfAborted(signal)
        resolve()
      } catch (error) {
        reject(error)
      }
    }, 75)
  })
}

function createTools(control: RackRescueControl): readonly WebMcpTool[] {
  const read = { readOnlyHint: true, untrustedContentHint: false } as const
  const write = { readOnlyHint: false, untrustedContentHint: false } as const
  return [
    {
      name: 'get_rack_state',
      description:
        'Read the current dishwasher rack, visible dishes, human locks, constraints, revision, preview and Undo state once. Use the returned summary instead of repeating this read in the same turn.',
      inputSchema: emptySchema,
      annotations: read,
      execute: () => {
        const snapshot = control.getSnapshot()
        const agentState = agentRackState(control)
        const visible = snapshot.dishes.filter((dish) => dish.visible).length
        return structuredResult(
          `Rack read successfully. Revision ${snapshot.revision}; ${visible} visible dishes; ${snapshot.placements.length} placed; ${snapshot.conflictCount} preview conflicts; red mug ${snapshot.dishes.find((dish) => dish.id === 'RR-RED-MUG')?.lockedByHuman ? 'pinned by the person' : 'not pinned'}; forgotten tray ${snapshot.roastingTrayRevealed ? 'revealed' : 'not yet revealed'}. Use this result and do not repeat the read in the same turn.`,
          agentState,
        )
      },
    },
    {
      name: 'inspect_dishes',
      description: 'Inspect one to fourteen visible fictional dishes by canonical ID.',
      inputSchema: inspectSchema,
      annotations: read,
      execute: (args) => {
        const dishes = control.inspectDishes(getDishIds(args))
        return structuredResult(`${dishes.length} dishes inspected.`, dishes)
      },
    },
    {
      name: 'preview_load_plan',
      description:
        'Show a complete proposed rack arrangement without moving any dish. Returns structured conflicts for bounds, overlaps, spray clearance, gentle-zone, basket, reserved-space and human-lock rules.',
      inputSchema: previewSchema,
      annotations: write,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        const next = control.previewLoadPlan(expectedRevision(args), getMoves(args))
        const preview = next.preview!
        return structuredResult(
          preview.valid
            ? `Preview ${preview.id} is valid with 0 conflicts. Nothing moved; apply this exact preview separately.`
            : `Preview ${preview.id} is blocked by ${preview.conflicts.length} visible conflict${preview.conflicts.length === 1 ? '' : 's'}. Nothing moved. ${preview.conflicts.map((conflict) => conflict.message).join(' ')}`,
          preview,
        )
      },
    },
    {
      name: 'apply_load_plan',
      description:
        'Apply only the exact current conflict-free preview. Human-pinned dishes remain fixed and one immediate Undo is created.',
      inputSchema: applySchema,
      annotations: write,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        const next = control.applyLoadPlan(
          expectedRevision(args),
          stringArgument(args, 'preview_id'),
        )
        return structuredResult(
          `Plan applied at revision ${next.revision}. ${next.placements.length} dishes placed; 0 conflicts; red mug remains pinned; immediate Undo token ${next.undo?.token}.`,
          next,
        )
      },
    },
    {
      name: 'undo_load_plan',
      description: 'Use the current one-use Undo token to reverse only the immediately prior agent-applied plan.',
      inputSchema: undoSchema,
      annotations: write,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        const next = control.undoLoadPlan(
          expectedRevision(args),
          stringArgument(args, 'undo_token'),
        )
        return structuredResult(
          `The prior agent plan was undone once. Rack revision is now ${next.revision}; no Undo remains.`,
          next,
        )
      },
    },
  ]
}

function defaultDocumentScope(): WebMcpDocumentScope | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as WebMcpDocumentScope
}

export async function registerRackRescueTools(
  control: RackRescueControl,
  documentScope: WebMcpDocumentScope | undefined = defaultDocumentScope(),
): Promise<RackRescueToolsRegistration> {
  const modelContext = documentScope?.modelContext
  const supported = Boolean(
    modelContext &&
      typeof modelContext.registerTool === 'function' &&
      typeof modelContext.getTools === 'function',
  )
  const controller = new AbortController()
  let lastError: Error | null = null
  let registered = new Set<string>()
  let disposed = false
  let inventoryWork = Promise.resolve()

  const refresh = async () => {
    registered = new Set(
      (await modelContext?.getTools() ?? [])
        .map((tool) => tool.name)
        .filter((name) => rackToolNames.has(name)),
    )
  }
  const scheduleRefresh = () => {
    inventoryWork = inventoryWork.then(refresh).catch((error: unknown) => {
      lastError = error instanceof Error ? error : new Error(String(error))
    })
  }
  const listener: EventListener = () => scheduleRefresh()
  const whenIdle = async () => {
    while (true) {
      const pending = inventoryWork
      await pending
      if (pending === inventoryWork) return
    }
  }

  const registration: RackRescueToolsRegistration = {
    supported,
    permanentToolNames: permanentRackRescueToolNames,
    async getRegisteredToolNames() {
      await whenIdle()
      if (modelContext) await refresh().catch((error: unknown) => {
        lastError = error instanceof Error ? error : new Error(String(error))
      })
      return [...registered].sort()
    },
    getLastError: () => lastError,
    whenIdle,
    async dispose() {
      if (disposed) return
      disposed = true
      modelContext?.removeEventListener?.('toolchange', listener)
      controller.abort()
      scheduleRefresh()
      await whenIdle()
    },
  }

  if (!supported || !modelContext) return registration
  modelContext.addEventListener?.('toolchange', listener)
  const outcomes = await Promise.allSettled(
    createTools(control).map((tool) =>
      modelContext.registerTool(tool, { signal: controller.signal }),
    ),
  )
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') {
      lastError = outcome.reason instanceof Error
        ? outcome.reason
        : new Error(String(outcome.reason))
    }
  }
  await refresh().catch((error: unknown) => {
    lastError = error instanceof Error ? error : new Error(String(error))
  })
  return registration
}
