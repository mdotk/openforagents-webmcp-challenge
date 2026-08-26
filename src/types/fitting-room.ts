export type FittingRoomProductId =
  | 'FV-101'
  | 'FV-206'
  | 'FV-207'
  | 'FV-304'
  | 'FV-408'
  | 'FV-409'

export type ProductCategory = 'top' | 'bottom' | 'layer' | 'accessory'
export type ProductColor = 'black' | 'burgundy'
export type ProductStyleTag =
  | 'tailored'
  | 'dramatic'
  | 'gothic'
  | 'romantic'
export type ProductMovement = 'high' | 'secure'
export type ProductContactZone = 'none' | 'neck'

export interface FittingRoomProduct {
  readonly id: FittingRoomProductId
  readonly name: string
  readonly category: ProductCategory
  readonly color: ProductColor
  readonly styleTags: readonly ProductStyleTag[]
  readonly size: 'M'
  readonly priceCents: number
  readonly fridayQuantity: number
  readonly neckContact: ProductContactZone
  readonly movement: ProductMovement
  readonly description: string
}

export interface ShopperContext {
  readonly profileRevision: number
  readonly brief: string
  readonly size: 'M'
  readonly pickupOn: '2026-10-30'
  readonly eventOn: '2026-10-31'
  readonly budgetCents: 25000
  readonly excludedContactZones: readonly ['neck']
  readonly minimumMovement: 'high'
  readonly excludedCategories: readonly ['footwear']
  readonly ownedItems: readonly ['Black boots']
}

export type FittingRoomValidationCode =
  | 'EMPTY_LOOK'
  | 'BUDGET_EXCEEDED'
  | 'PICKUP_UNAVAILABLE'
  | 'CONTACT_ZONE_CONFLICT'
  | 'MOVEMENT_REQUIREMENT_FAILED'
  | 'REQUIRED_CATEGORY_MISSING'

export interface FittingRoomValidationIssue {
  readonly code: FittingRoomValidationCode
  readonly message: string
  readonly itemId?: FittingRoomProductId
  readonly category?: 'top' | 'bottom' | 'accessory'
}

export interface FittingRoomValidation {
  readonly valid: boolean
  readonly revision: number
  readonly boardRevision: number
  readonly availabilityRevision: number
  readonly subtotalCents: number
  readonly issues: readonly FittingRoomValidationIssue[]
}

export type ReservationReviewStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'invalidated'
  | 'consumed'

export interface ReservationReviewLine {
  readonly itemId: FittingRoomProductId
  readonly name: string
  readonly size: 'M'
  readonly priceCents: number
}

export interface ReservationReview {
  readonly id: string
  readonly status: ReservationReviewStatus
  readonly boardRevision: number
  readonly profileRevision: number
  readonly availabilityRevision: number
  readonly lines: readonly ReservationReviewLine[]
  readonly subtotalCents: number
  readonly currency: 'USD'
  readonly pickupSlot: 'friday-16:00'
  readonly holdMinutes: 15
  readonly chargedNowCents: 0
}

export interface ReservationGrant {
  readonly id: string
  readonly reviewId: string
  readonly approvedAtRevision: number
  readonly boardRevision: number
  readonly profileRevision: number
  readonly availabilityRevision: number
  readonly usesRemaining: 1
}

export interface FittingRoomReservation {
  readonly id: string
  readonly reviewId: string
  readonly itemIds: readonly FittingRoomProductId[]
  readonly subtotalCents: number
  readonly currency: 'USD'
  readonly pickupOn: '2026-10-30'
  readonly expiresAt: '2026-10-30T18:57:00Z'
  readonly chargedCents: 0
  readonly authorityConsumed: true
}

export type FittingRoomActivityKind =
  | 'session-started'
  | 'look-updated'
  | 'human-lock-updated'
  | 'demo-inventory-updated'
  | 'review-requested'
  | 'review-approved'
  | 'review-declined'
  | 'grant-revoked'
  | 'grant-expired'
  | 'scope-invalidated'
  | 'look-held'

export interface FittingRoomActivityEntry {
  readonly id: string
  readonly sequence: number
  readonly kind: FittingRoomActivityKind
  readonly message: string
}

export interface FittingRoomSnapshot {
  readonly revision: number
  readonly catalogueRevision: 'catalogue-v1'
  readonly availabilityRevision: number
  readonly boardRevision: number
  readonly shopper: ShopperContext
  readonly products: readonly FittingRoomProduct[]
  readonly boardItemIds: readonly FittingRoomProductId[]
  readonly humanLockedItemIds: readonly FittingRoomProductId[]
  readonly subtotalCents: number
  readonly validation: FittingRoomValidation
  readonly review: ReservationReview | null
  readonly activeGrant: ReservationGrant | null
  readonly reservation: FittingRoomReservation | null
  readonly demoInventoryUpdateApplied: boolean
  readonly activity: readonly FittingRoomActivityEntry[]
}

export interface ProductSearchFilters {
  readonly categories?: readonly ProductCategory[]
  readonly colors?: readonly ProductColor[]
  readonly styleTags?: readonly ProductStyleTag[]
  readonly size: 'M'
  readonly pickupOn: '2026-10-30'
  readonly excludedContactZones?: readonly ['neck']
  readonly minimumMovement?: 'high'
  readonly maxItemPriceCents?: number
  readonly limit: number
}

export type FittingRoomSubscriber = (snapshot: FittingRoomSnapshot) => void

export interface FittingRoomControl {
  getSnapshot(): FittingRoomSnapshot
  subscribe(subscriber: FittingRoomSubscriber): () => void
  searchProducts(filters: ProductSearchFilters): readonly FittingRoomProduct[]
  inspectProducts(
    itemIds: readonly FittingRoomProductId[],
  ): readonly FittingRoomProduct[]
  updateFittingRoom(
    expectedRevision: number,
    addItemIds: readonly FittingRoomProductId[],
    removeItemIds: readonly FittingRoomProductId[],
  ): FittingRoomSnapshot
  setHumanLock(
    expectedRevision: number,
    itemId: FittingRoomProductId,
    locked: boolean,
  ): FittingRoomSnapshot
  applyDemoInventoryUpdate(expectedRevision: number): FittingRoomSnapshot
  validateFittingRoom(expectedRevision: number): FittingRoomValidation
  requestReservationReview(
    expectedRevision: number,
    holdMinutes: 15,
    pickupSlot: 'friday-16:00',
  ): FittingRoomSnapshot
  approveReservationReview(reviewId: string): FittingRoomSnapshot
  declineReservationReview(reviewId: string): FittingRoomSnapshot
  revokeReservationGrant(grantId: string): FittingRoomSnapshot
  expireReservationGrant(grantId: string): FittingRoomSnapshot
  reserveApprovedLook(grantId: string): FittingRoomSnapshot
}

export interface FittingRoomToolsRegistration {
  readonly supported: boolean
  readonly permanentToolNames: readonly string[]
  getRegisteredToolNames(): Promise<readonly string[]>
  getLastError(): Error | null
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}
