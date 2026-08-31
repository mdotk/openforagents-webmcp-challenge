export type RackDishId =
  | 'RR-RED-MUG'
  | 'RR-CHILD-CUP'
  | 'RR-IVORY-PLATE-1'
  | 'RR-IVORY-PLATE-2'
  | 'RR-IVORY-PLATE-3'
  | 'RR-IVORY-PLATE-4'
  | 'RR-BLUE-PLATE-1'
  | 'RR-BLUE-PLATE-2'
  | 'RR-IVORY-BOWL-1'
  | 'RR-IVORY-BOWL-2'
  | 'RR-BLUE-BOWL-1'
  | 'RR-BLUE-BOWL-2'
  | 'RR-CUTLERY'
  | 'RR-ROASTING-TRAY'

export type RackDishKind =
  | 'mug'
  | 'child-cup'
  | 'plate'
  | 'bowl'
  | 'cutlery'
  | 'tray'

export type RackOrientation = 'north' | 'east'

export interface RackDish {
  readonly id: RackDishId
  readonly label: string
  readonly kind: RackDishKind
  readonly asset: string
  readonly color: 'red' | 'yellow' | 'ivory' | 'blue' | 'steel'
  readonly visible: boolean
  readonly lockedByHuman: boolean
  readonly allowedOrientations: readonly RackOrientation[]
  readonly footprints: {
    readonly north: { readonly columns: number; readonly rows: number }
    readonly east: { readonly columns: number; readonly rows: number }
  }
  readonly placementRules: readonly string[]
}

export interface RackPlacement {
  readonly dishId: RackDishId
  readonly column: number
  readonly row: number
  readonly orientation: RackOrientation
}

export type RackConflictCode =
  | 'OUT_OF_BOUNDS'
  | 'OVERLAP'
  | 'SPRAY_BLOCKED'
  | 'CHILD_CUP_ZONE'
  | 'CUTLERY_ZONE'
  | 'RESERVED_TRAY_SPACE'
  | 'LOCKED_DISH'
  | 'MISSING_DISH'

export interface RackConflict {
  readonly code: RackConflictCode
  readonly message: string
  readonly dishIds: readonly RackDishId[]
  readonly cells: readonly string[]
}

export interface RackPlanPreview {
  readonly id: string
  readonly basedOnRevision: number
  readonly placements: readonly RackPlacement[]
  readonly valid: boolean
  readonly conflicts: readonly RackConflict[]
}

export interface RackUndoGrant {
  readonly token: string
  readonly createdAtRevision: number
}

export interface RackSnapshot {
  readonly revision: number
  readonly rack: {
    readonly columns: 8
    readonly rows: 6
    readonly sprayClearanceCells: readonly ['3:2', '4:2']
    readonly reservedTrayCells: readonly string[]
  }
  readonly dishes: readonly RackDish[]
  readonly placements: readonly RackPlacement[]
  readonly preview: RackPlanPreview | null
  readonly undo: RackUndoGrant | null
  readonly roastingTrayRevealed: boolean
  readonly conflictCount: number
  readonly activity: readonly string[]
}

export interface RackMoveInput {
  readonly dishId: RackDishId
  readonly column: number
  readonly row: number
  readonly orientation: RackOrientation
}

export type RackSubscriber = (snapshot: RackSnapshot) => void

export interface RackRescueControl {
  getSnapshot(): RackSnapshot
  subscribe(subscriber: RackSubscriber): () => void
  inspectDishes(dishIds: readonly RackDishId[]): readonly RackDish[]
  pinRedMug(expectedRevision: number, column: number, row: number): RackSnapshot
  revealRoastingTray(expectedRevision: number): RackSnapshot
  previewLoadPlan(
    expectedRevision: number,
    moves: readonly RackMoveInput[],
  ): RackSnapshot
  applyLoadPlan(expectedRevision: number, previewId: string): RackSnapshot
  undoLoadPlan(expectedRevision: number, undoToken: string): RackSnapshot
}

export interface RackRescueToolsRegistration {
  readonly supported: boolean
  readonly permanentToolNames: readonly string[]
  getRegisteredToolNames(): Promise<readonly string[]>
  getLastError(): Error | null
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}
