export type ShoppingSlot = 'base' | 'layer' | 'bag' | 'accent'

export type ShoppingSize = 'XS' | 'S' | 'M' | 'L' | 'ONE'

export type ShoppingDestinationId = 'home' | 'event-hotel'

export type ShoppingStyleTag =
  | 'dramatic'
  | 'polished'
  | 'sharp'
  | 'editorial'
  | 'minimal'
  | 'romantic'
  | 'classic'
  | 'modern'

export interface ShoppingVariant {
  readonly id: string
  readonly size: ShoppingSize
  readonly priceCents: number
  readonly quantity: number
}

export interface ShoppingProduct {
  readonly id: string
  readonly sku: string
  readonly name: string
  readonly slot: ShoppingSlot
  readonly color: string
  readonly styleTags: readonly ShoppingStyleTag[]
  readonly description: string
  readonly assetPath: string
  readonly variants: readonly ShoppingVariant[]
}

export interface ShoppingOwnedItem {
  readonly id: 'owned-blue-boots'
  readonly name: 'Cobalt-blue ankle boots'
  readonly size: '8'
  readonly assetPath: '/shopping/owned-blue-boots.webp'
  readonly provenance: 'Owned item provided for this demo'
}

export interface ShoppingContext {
  readonly brief: string
  readonly clothingSize: 'M'
  readonly shoeSize: '8'
  readonly budgetCents: number
  readonly neededBy: '2026-09-04'
  readonly eventOn: '2026-09-05'
  readonly destinationId: ShoppingDestinationId
  readonly ownedItems: readonly [ShoppingOwnedItem]
  readonly stylePreferences: readonly ['dramatic', 'polished', 'sharp']
}

export interface ShoppingRevisions {
  readonly revision: number
  readonly catalogueRevision: 'shopping-catalogue-v1'
  readonly availabilityRevision: number
  readonly deliveryMatrixRevision: number
  readonly fulfilmentContextRevision: number
  readonly shopperContextRevision: number
  readonly lookRevision: number
  readonly cartRevision: number
}

export type ShoppingConflictCode =
  | 'INVALID_FILTER'
  | 'UNKNOWN_PRODUCT'
  | 'UNKNOWN_VARIANT'
  | 'DESTINATION_MISMATCH'
  | 'DELIVERY_UNAVAILABLE'
  | 'DELIVERY_CHANGED'
  | 'OUT_OF_STOCK'
  | 'SIZE_UNAVAILABLE'
  | 'BUDGET_EXCEEDED'
  | 'MISSING_FULFILMENT_QUOTE'
  | 'STALE_REVISION'
  | 'SLOT_CONFLICT'
  | 'REVIEW_INVALIDATED'
  | 'GRANT_INVALID'
  | 'GRANT_EXPIRED'

export interface ShoppingConflict {
  readonly code: ShoppingConflictCode
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}

export type ShoppingOperationResult<T> =
  | {
      readonly ok: true
      readonly data: T
      readonly revisions: ShoppingRevisions
    }
  | {
      readonly ok: false
      readonly error: ShoppingConflict
      readonly stateChanged: false
      readonly revisions: ShoppingRevisions
    }

export interface ShoppingProductSearchFilters {
  readonly slots?: readonly ShoppingSlot[]
  readonly colors?: readonly string[]
  readonly styleTags?: readonly ShoppingStyleTag[]
  readonly sizes?: readonly ShoppingSize[]
  readonly maxItemPriceCents?: number
  readonly excludeVariantIds?: readonly string[]
  readonly limit: number
}

export interface ShoppingSearchResult {
  readonly matches: readonly ShoppingProduct[]
  readonly totalMatches: number
  readonly inspectedVariantCount: number
}

export interface FulfilmentQuote {
  readonly quoteId: string
  readonly variantId: string
  readonly destinationId: ShoppingDestinationId
  readonly neededBy: '2026-09-04'
  readonly arrivesOn: string
  readonly quotedAtRevision: number
  readonly availabilityRevision: number
  readonly deliveryMatrixRevision: number
  readonly fulfilmentContextRevision: number
}

export interface FulfilmentCheck {
  readonly quotes: readonly FulfilmentQuote[]
}

export interface ShoppingValidationIssue {
  readonly code:
    | 'EMPTY_LOOK'
    | 'REQUIRED_SLOT_MISSING'
    | 'DUPLICATE_SLOT'
    | 'SIZE_UNAVAILABLE'
    | 'OUT_OF_STOCK'
    | 'BUDGET_EXCEEDED'
  readonly message: string
  readonly slot?: ShoppingSlot
  readonly variantId?: string
}

export interface ShoppingValidation {
  readonly valid: boolean
  readonly subtotalCents: number
  readonly issues: readonly ShoppingValidationIssue[]
}

export interface ShoppingCartLine {
  readonly variantId: string
  readonly productId: string
  readonly name: string
  readonly sku: string
  readonly size: ShoppingSize
  readonly quantity: 1
  readonly unitPriceCents: number
}

export interface ShoppingCart {
  readonly lines: readonly ShoppingCartLine[]
  readonly subtotalCents: number
  readonly chargedCents: 0
}

export interface ShoppingCartPatch {
  readonly add: readonly ShoppingCartLine[]
  readonly remove: readonly ShoppingCartLine[]
}

export type ShoppingReviewStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'dismissed'
  | 'revoked'
  | 'expired'
  | 'invalidated'
  | 'consumed'

export interface ShoppingReviewRationale {
  readonly variantId: string
  readonly reason: string
}

export interface ShoppingCartReview {
  readonly id: string
  readonly status: ShoppingReviewStatus
  readonly summary: string
  readonly rationales: readonly ShoppingReviewRationale[]
  readonly patch: ShoppingCartPatch
  readonly proposedCart: ShoppingCart
  readonly quoteIds: readonly string[]
  readonly fulfilmentQuotes: readonly FulfilmentQuote[]
  readonly boundRevisions: ShoppingRevisions
  readonly requiresHumanApproval: true
  readonly cartChanged: boolean
  readonly chargedCents: 0
}

export interface ShoppingGrant {
  readonly id: string
  readonly reviewId: string
  readonly expiresAt: string
  readonly usesRemaining: 1
  readonly boundRevisions: ShoppingRevisions
}

export type ShoppingActivityKind =
  | 'session-started'
  | 'look-updated'
  | 'destination-updated'
  | 'review-requested'
  | 'review-dismissed'
  | 'review-declined'
  | 'review-approved'
  | 'grant-revoked'
  | 'grant-expired'
  | 'scope-invalidated'
  | 'cart-updated'

export interface ShoppingActivityEntry {
  readonly id: string
  readonly sequence: number
  readonly kind: ShoppingActivityKind
  readonly message: string
}

export interface ShoppingSnapshot extends ShoppingRevisions {
  readonly context: ShoppingContext
  readonly products: readonly ShoppingProduct[]
  readonly lookVariantIds: readonly string[]
  readonly validation: ShoppingValidation
  readonly cart: ShoppingCart
  readonly review: ShoppingCartReview | null
  readonly activeGrant: ShoppingGrant | null
  readonly activity: readonly ShoppingActivityEntry[]
}

export interface CartReviewRequest {
  readonly expectedRevision: number
  readonly lookRevision: number
  readonly cartRevision: number
  readonly quoteIds: readonly string[]
  readonly summary: string
  readonly rationales: readonly ShoppingReviewRationale[]
}

export type ShoppingSubscriber = (snapshot: ShoppingSnapshot) => void

export interface ShoppingControl {
  getSnapshot(): ShoppingSnapshot
  subscribe(subscriber: ShoppingSubscriber): () => void
  searchProducts(filters: ShoppingProductSearchFilters): ShoppingSearchResult
  inspectProducts(productIds: readonly string[]): readonly ShoppingProduct[]
  checkFulfilment(
    variantIds: readonly string[],
    destinationId: ShoppingDestinationId,
    neededBy: '2026-09-04',
  ): ShoppingOperationResult<FulfilmentCheck>
  updateSharedLook(
    expectedRevision: number,
    addVariantIds: readonly string[],
    removeVariantIds: readonly string[],
  ): ShoppingOperationResult<ShoppingSnapshot>
  setDestination(destinationId: ShoppingDestinationId): ShoppingSnapshot
  requestCartReview(
    request: CartReviewRequest,
  ): ShoppingOperationResult<ShoppingSnapshot>
  keepEditing(reviewId: string): ShoppingSnapshot
  declineCartReview(reviewId: string): ShoppingSnapshot
  approveCartReview(reviewId: string): ShoppingSnapshot
  revokeCartGrant(grantId: string): ShoppingSnapshot
  expireCartGrant(grantId: string): ShoppingSnapshot
  applyApprovedCart(
    grantId: string,
  ): ShoppingOperationResult<ShoppingSnapshot>
}

export interface ShoppingToolsRegistration {
  readonly supported: boolean
  readonly permanentToolNames: readonly string[]
  getRegisteredToolNames(): Promise<readonly string[]>
  getLastError(): Error | null
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}
