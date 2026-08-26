import type {
  FittingRoomActivityEntry,
  FittingRoomActivityKind,
  FittingRoomControl,
  FittingRoomProduct,
  FittingRoomProductId,
  FittingRoomReservation,
  FittingRoomSnapshot,
  FittingRoomSubscriber,
  FittingRoomValidation,
  FittingRoomValidationIssue,
  ProductSearchFilters,
  ReservationGrant,
  ReservationReview,
  ShopperContext,
} from '../types'
import { RevisionConflictError } from './mission-control'

interface FittingRoomState {
  revision: number
  availabilityRevision: number
  boardRevision: number
  quantities: Record<FittingRoomProductId, number>
  boardItemIds: FittingRoomProductId[]
  humanLockedItemIds: FittingRoomProductId[]
  review: ReservationReview | null
  activeGrant: ReservationGrant | null
  reservation: FittingRoomReservation | null
  demoInventoryUpdateApplied: boolean
  activity: FittingRoomActivityEntry[]
  nextReviewNumber: number
  nextReservationNumber: number
}

interface FittingRoomRuntime {
  state: FittingRoomState
  currentSnapshot: FittingRoomSnapshot
  readonly subscribers: Set<FittingRoomSubscriber>
}

export class FittingRoomStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FittingRoomStateError'
  }
}

const shopper: ShopperContext = {
  profileRevision: 1,
  brief:
    'Build me a couture vampire look for Saturday. Nothing tight around my neck, I need to dance, reuse my black boots, keep it under $250 and use only things I can pick up Friday. Make it fashion, not costume shop. Show me before reserving anything.',
  size: 'M',
  pickupOn: '2026-10-30',
  eventOn: '2026-10-31',
  budgetCents: 25000,
  excludedContactZones: ['neck'],
  minimumMovement: 'high',
  excludedCategories: ['footwear'],
  ownedItems: ['Black boots'],
}

const catalogue: readonly Omit<FittingRoomProduct, 'fridayQuantity'>[] = [
  {
    id: 'FV-101',
    name: 'Nocturne Tailored Vest',
    category: 'top',
    color: 'black',
    styleTags: ['tailored', 'gothic'],
    size: 'M',
    priceCents: 10800,
    neckContact: 'none',
    movement: 'high',
    description: 'An open-V black vest with a structured waist.',
  },
  {
    id: 'FV-206',
    name: 'Blood Moon Bias Skirt',
    category: 'bottom',
    color: 'burgundy',
    styleTags: ['romantic', 'gothic'],
    size: 'M',
    priceCents: 7800,
    neckContact: 'none',
    movement: 'high',
    description: 'A fluid burgundy skirt cut for unrestricted movement.',
  },
  {
    id: 'FV-207',
    name: 'Cathedral Black Satin Skirt',
    category: 'bottom',
    color: 'black',
    styleTags: ['tailored', 'gothic'],
    size: 'M',
    priceCents: 7200,
    neckContact: 'none',
    movement: 'high',
    description: 'A full black satin skirt with a clean architectural line.',
  },
  {
    id: 'FV-304',
    name: 'Raven Crystal Cuff',
    category: 'accessory',
    color: 'black',
    styleTags: ['dramatic', 'gothic'],
    size: 'M',
    priceCents: 2400,
    neckContact: 'none',
    movement: 'secure',
    description: 'A secure wrist cuff with dark crystal detailing.',
  },
  {
    id: 'FV-408',
    name: 'Opera Organza Sleeves',
    category: 'layer',
    color: 'black',
    styleTags: ['dramatic', 'romantic'],
    size: 'M',
    priceCents: 4400,
    neckContact: 'none',
    movement: 'high',
    description: 'Sheer detachable sleeves with an exaggerated silhouette.',
  },
  {
    id: 'FV-409',
    name: 'Wraith Bell-Sleeve Shrug',
    category: 'layer',
    color: 'black',
    styleTags: ['dramatic', 'gothic'],
    size: 'M',
    priceCents: 3800,
    neckContact: 'none',
    movement: 'high',
    description: 'An open-front black shrug with sweeping bell sleeves.',
  },
]

const initialQuantities: Record<FittingRoomProductId, number> = {
  'FV-101': 2,
  'FV-206': 2,
  'FV-207': 3,
  'FV-304': 4,
  'FV-408': 1,
  'FV-409': 1,
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function products(state: FittingRoomState): readonly FittingRoomProduct[] {
  return catalogue.map((product) => ({
    ...product,
    fridayQuantity: state.quantities[product.id],
  }))
}

function findProduct(
  state: FittingRoomState,
  itemId: FittingRoomProductId,
): FittingRoomProduct {
  const product = products(state).find((candidate) => candidate.id === itemId)
  if (!product) throw new FittingRoomStateError(`Unknown product ${itemId}.`)
  return product
}

function subtotal(state: FittingRoomState): number {
  return state.boardItemIds.reduce(
    (total, itemId) => total + findProduct(state, itemId).priceCents,
    0,
  )
}

function validate(state: FittingRoomState): FittingRoomValidation {
  const issues: FittingRoomValidationIssue[] = []
  const boardProducts = state.boardItemIds.map((itemId) =>
    findProduct(state, itemId),
  )
  const currentSubtotal = subtotal(state)

  if (boardProducts.length === 0) {
    issues.push({ code: 'EMPTY_LOOK', message: 'The fitting room is empty.' })
  }

  for (const category of ['top', 'bottom', 'accessory'] as const) {
    if (!boardProducts.some((product) => product.category === category)) {
      issues.push({
        code: 'REQUIRED_CATEGORY_MISSING',
        category,
        message: `The look needs one ${category}.`,
      })
    }
  }

  if (currentSubtotal > shopper.budgetCents) {
    issues.push({
      code: 'BUDGET_EXCEEDED',
      message: 'The retailer-item subtotal exceeds $250.',
    })
  }

  for (const product of boardProducts) {
    const heldForThisSession = state.reservation?.itemIds.includes(product.id)
      ? 1
      : 0
    if (product.fridayQuantity + heldForThisSession < 1) {
      issues.push({
        code: 'PICKUP_UNAVAILABLE',
        itemId: product.id,
        message: `${product.name} is not available for Friday pickup.`,
      })
    }
    if (product.neckContact === 'neck') {
      issues.push({
        code: 'CONTACT_ZONE_CONFLICT',
        itemId: product.id,
        message: `${product.name} touches an excluded contact zone.`,
      })
    }
    if (product.category !== 'accessory' && product.movement !== 'high') {
      issues.push({
        code: 'MOVEMENT_REQUIREMENT_FAILED',
        itemId: product.id,
        message: `${product.name} does not meet the movement requirement.`,
      })
    }
  }

  return {
    valid: issues.length === 0,
    revision: state.revision,
    boardRevision: state.boardRevision,
    availabilityRevision: state.availabilityRevision,
    subtotalCents: currentSubtotal,
    issues,
  }
}

function snapshot(state: FittingRoomState): FittingRoomSnapshot {
  return deepFreeze({
    revision: state.revision,
    catalogueRevision: 'catalogue-v1',
    availabilityRevision: state.availabilityRevision,
    boardRevision: state.boardRevision,
    shopper: { ...shopper },
    products: products(state),
    boardItemIds: [...state.boardItemIds],
    humanLockedItemIds: [...state.humanLockedItemIds],
    subtotalCents: subtotal(state),
    validation: validate(state),
    review: state.review
      ? { ...state.review, lines: state.review.lines.map((line) => ({ ...line })) }
      : null,
    activeGrant: state.activeGrant ? { ...state.activeGrant } : null,
    reservation: state.reservation
      ? { ...state.reservation, itemIds: [...state.reservation.itemIds] }
      : null,
    demoInventoryUpdateApplied: state.demoInventoryUpdateApplied,
    activity: state.activity.map((entry) => ({ ...entry })),
  })
}

function activity(
  entries: readonly FittingRoomActivityEntry[],
  kind: FittingRoomActivityKind,
  message: string,
): FittingRoomActivityEntry[] {
  const sequence = entries.length + 1
  return [
    ...entries,
    {
      id: `activity-${String(sequence).padStart(3, '0')}`,
      sequence,
      kind,
      message,
    },
  ]
}

function assertExpectedRevision(state: FittingRoomState, expectedRevision: number) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== state.revision) {
    throw new RevisionConflictError(expectedRevision, state.revision)
  }
}

function assertNoReservation(state: FittingRoomState) {
  if (state.reservation) {
    throw new FittingRoomStateError(
      'The simulated look is already held. Reset the prototype to start again.',
    )
  }
}

function invalidateAuthority(
  state: FittingRoomState,
  reason: string,
): Pick<FittingRoomState, 'review' | 'activeGrant' | 'activity'> {
  const hasAuthority =
    state.activeGrant || state.review?.status === 'pending' || state.review?.status === 'approved'
  if (!hasAuthority) {
    return {
      review: state.review,
      activeGrant: state.activeGrant,
      activity: state.activity,
    }
  }
  return {
    review: state.review ? { ...state.review, status: 'invalidated' } : null,
    activeGrant: null,
    activity: activity(state.activity, 'scope-invalidated', reason),
  }
}

function publish(runtime: FittingRoomRuntime): FittingRoomSnapshot {
  const nextSnapshot = snapshot(runtime.state)
  runtime.currentSnapshot = nextSnapshot
  for (const subscriber of runtime.subscribers) subscriber(nextSnapshot)
  return nextSnapshot
}

function replaceState(
  runtime: FittingRoomRuntime,
  update: Omit<Partial<FittingRoomState>, 'revision'>,
): FittingRoomSnapshot {
  runtime.state = {
    ...runtime.state,
    ...update,
    revision: runtime.state.revision + 1,
  }
  return publish(runtime)
}

function uniqueIds(itemIds: readonly FittingRoomProductId[]) {
  if (new Set(itemIds).size !== itemIds.length) {
    throw new FittingRoomStateError('Product identifiers must be unique.')
  }
}

export function createFittingRoomControl(): FittingRoomControl {
  const initialState: FittingRoomState = {
    revision: 0,
    availabilityRevision: 1,
    boardRevision: 0,
    quantities: { ...initialQuantities },
    boardItemIds: [],
    humanLockedItemIds: [],
    review: null,
    activeGrant: null,
    reservation: null,
    demoInventoryUpdateApplied: false,
    activity: [
      {
        id: 'activity-001',
        sequence: 1,
        kind: 'session-started',
        message: 'The fictional fitting room is ready.',
      },
    ],
    nextReviewNumber: 1,
    nextReservationNumber: 1,
  }
  const runtime: FittingRoomRuntime = {
    state: initialState,
    currentSnapshot: snapshot(initialState),
    subscribers: new Set(),
  }

  const control: FittingRoomControl = {
    getSnapshot: () => runtime.currentSnapshot,

    subscribe(subscriber) {
      runtime.subscribers.add(subscriber)
      return () => runtime.subscribers.delete(subscriber)
    },

    searchProducts(filters: ProductSearchFilters) {
      if (filters.size !== shopper.size || filters.pickupOn !== shopper.pickupOn) {
        return []
      }
      const limit = Math.min(Math.max(filters.limit, 1), 12)
      return products(runtime.state)
        .filter((product) => product.fridayQuantity > 0)
        .filter(
          (product) =>
            !filters.categories?.length ||
            filters.categories.includes(product.category),
        )
        .filter(
          (product) =>
            !filters.colors?.length || filters.colors.includes(product.color),
        )
        .filter(
          (product) =>
            !filters.styleTags?.length ||
            filters.styleTags.every((tag) => product.styleTags.includes(tag)),
        )
        .filter(
          (product) =>
            !filters.excludedContactZones?.includes('neck') ||
            product.neckContact !== 'neck',
        )
        .filter(
          (product) =>
            filters.minimumMovement !== 'high' ||
            product.movement === 'high' ||
            product.category === 'accessory',
        )
        .filter(
          (product) =>
            filters.maxItemPriceCents === undefined ||
            product.priceCents <= filters.maxItemPriceCents,
        )
        .slice(0, limit)
    },

    inspectProducts(itemIds) {
      uniqueIds(itemIds)
      if (itemIds.length < 1 || itemIds.length > 8) {
        throw new FittingRoomStateError('Inspect between one and eight products.')
      }
      return itemIds.map((itemId) => findProduct(runtime.state, itemId))
    },

    updateFittingRoom(expectedRevision, addItemIds, removeItemIds) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNoReservation(state)
      uniqueIds(addItemIds)
      uniqueIds(removeItemIds)
      for (const itemId of [...addItemIds, ...removeItemIds]) {
        findProduct(state, itemId)
      }
      for (const itemId of removeItemIds) {
        if (state.humanLockedItemIds.includes(itemId)) {
          throw new FittingRoomStateError(
            `${findProduct(state, itemId).name} is pinned by the person.`,
          )
        }
      }
      const nextIds = state.boardItemIds.filter(
        (itemId) => !removeItemIds.includes(itemId),
      )
      for (const itemId of addItemIds) {
        if (!nextIds.includes(itemId)) nextIds.push(itemId)
      }
      if (nextIds.length > 5) {
        throw new FittingRoomStateError('The fitting room accepts up to five items.')
      }
      if (
        nextIds.length === state.boardItemIds.length &&
        nextIds.every((itemId, index) => state.boardItemIds[index] === itemId)
      ) {
        throw new FittingRoomStateError('The requested update does not change the look.')
      }
      const invalidated = invalidateAuthority(
        state,
        'The fitting-room revision changed, so the previous approval is no longer valid.',
      )
      return replaceState(runtime, {
        ...invalidated,
        boardItemIds: nextIds,
        boardRevision: state.boardRevision + 1,
        activity: activity(
          invalidated.activity,
          'look-updated',
          'The shared fitting-room look changed.',
        ),
      })
    },

    setHumanLock(expectedRevision, itemId, locked) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNoReservation(state)
      if (!state.boardItemIds.includes(itemId)) {
        throw new FittingRoomStateError('Only an item in the fitting room can be pinned.')
      }
      const currentlyLocked = state.humanLockedItemIds.includes(itemId)
      if (currentlyLocked === locked) {
        throw new FittingRoomStateError('The requested pin state is already active.')
      }
      const invalidated = invalidateAuthority(
        state,
        'The person changed an item lock, so the previous approval is no longer valid.',
      )
      return replaceState(runtime, {
        ...invalidated,
        humanLockedItemIds: locked
          ? [...state.humanLockedItemIds, itemId]
          : state.humanLockedItemIds.filter((candidate) => candidate !== itemId),
        boardRevision: state.boardRevision + 1,
        activity: activity(
          invalidated.activity,
          'human-lock-updated',
          `${findProduct(state, itemId).name} was ${locked ? 'pinned' : 'unpinned'} by the person.`,
        ),
      })
    },

    applyDemoInventoryUpdate(expectedRevision) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNoReservation(state)
      if (state.demoInventoryUpdateApplied) {
        throw new FittingRoomStateError('The demo inventory update already ran.')
      }
      const invalidated = invalidateAuthority(
        state,
        'Demo inventory changed, so the previous approval is no longer valid.',
      )
      return replaceState(runtime, {
        ...invalidated,
        quantities: { ...state.quantities, 'FV-408': 0 },
        availabilityRevision: state.availabilityRevision + 1,
        demoInventoryUpdateApplied: true,
        activity: activity(
          invalidated.activity,
          'demo-inventory-updated',
          'Demo inventory update: Opera Organza Sleeves lost Friday availability.',
        ),
      })
    },

    validateFittingRoom(expectedRevision) {
      assertExpectedRevision(runtime.state, expectedRevision)
      return validate(runtime.state)
    },

    requestReservationReview(expectedRevision, holdMinutes, pickupSlot) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNoReservation(state)
      if (holdMinutes !== 15 || pickupSlot !== 'friday-16:00') {
        throw new FittingRoomStateError('Only the documented demo hold is available.')
      }
      if (state.review?.status === 'pending' || state.activeGrant) {
        throw new FittingRoomStateError('A reservation review is already active.')
      }
      const validation = validate(state)
      if (!validation.valid) {
        throw new FittingRoomStateError(
          `The current look cannot be reviewed: ${validation.issues[0]?.message ?? 'validation failed'}`,
        )
      }
      const reviewId = `review-${String(state.nextReviewNumber).padStart(3, '0')}`
      const review: ReservationReview = {
        id: reviewId,
        status: 'pending',
        boardRevision: state.boardRevision,
        profileRevision: shopper.profileRevision,
        availabilityRevision: state.availabilityRevision,
        lines: state.boardItemIds.map((itemId) => {
          const product = findProduct(state, itemId)
          return {
            itemId,
            name: product.name,
            size: product.size,
            priceCents: product.priceCents,
          }
        }),
        subtotalCents: subtotal(state),
        currency: 'USD',
        pickupSlot,
        holdMinutes,
        chargedNowCents: 0,
      }
      return replaceState(runtime, {
        review,
        nextReviewNumber: state.nextReviewNumber + 1,
        activity: activity(
          state.activity,
          'review-requested',
          'The exact look is ready for human review. No hold exists yet.',
        ),
      })
    },

    approveReservationReview(reviewId) {
      const state = runtime.state
      assertNoReservation(state)
      if (!state.review || state.review.id !== reviewId || state.review.status !== 'pending') {
        throw new FittingRoomStateError('That reservation review is not pending.')
      }
      const validation = validate(state)
      if (!validation.valid) {
        throw new FittingRoomStateError('The look changed and cannot be approved.')
      }
      const approvedAtRevision = state.revision + 1
      return replaceState(runtime, {
        review: { ...state.review, status: 'approved' },
        activeGrant: {
          id: `reservation-grant-${state.review.id.slice(-3)}`,
          reviewId,
          approvedAtRevision,
          boardRevision: state.boardRevision,
          profileRevision: shopper.profileRevision,
          availabilityRevision: state.availabilityRevision,
          usesRemaining: 1,
        },
        activity: activity(
          state.activity,
          'review-approved',
          'Human approval created one exact simulated reservation capability.',
        ),
      })
    },

    declineReservationReview(reviewId) {
      const state = runtime.state
      if (!state.review || state.review.id !== reviewId || state.review.status !== 'pending') {
        throw new FittingRoomStateError('That reservation review is not pending.')
      }
      return replaceState(runtime, {
        review: { ...state.review, status: 'declined' },
        activity: activity(
          state.activity,
          'review-declined',
          'The person declined the simulated hold.',
        ),
      })
    },

    revokeReservationGrant(grantId) {
      const state = runtime.state
      if (!state.activeGrant || state.activeGrant.id !== grantId) {
        throw new FittingRoomStateError('The reservation grant is not active.')
      }
      return replaceState(runtime, {
        review: state.review ? { ...state.review, status: 'revoked' } : null,
        activeGrant: null,
        activity: activity(
          state.activity,
          'grant-revoked',
          'The person revoked the one-use simulated reservation capability.',
        ),
      })
    },

    expireReservationGrant(grantId) {
      const state = runtime.state
      if (!state.activeGrant || state.activeGrant.id !== grantId) {
        throw new FittingRoomStateError('The reservation grant is not active.')
      }
      return replaceState(runtime, {
        review: state.review ? { ...state.review, status: 'expired' } : null,
        activeGrant: null,
        activity: activity(
          state.activity,
          'grant-expired',
          'The one-use simulated reservation capability expired.',
        ),
      })
    },

    reserveApprovedLook(grantId) {
      const state = runtime.state
      if (!state.activeGrant || state.activeGrant.id !== grantId) {
        throw new FittingRoomStateError('The reservation grant is not active.')
      }
      if (!state.review || state.review.id !== state.activeGrant.reviewId) {
        throw new FittingRoomStateError('The approved reservation review is unavailable.')
      }
      if (
        state.revision !== state.activeGrant.approvedAtRevision ||
        state.boardRevision !== state.activeGrant.boardRevision ||
        shopper.profileRevision !== state.activeGrant.profileRevision ||
        state.availabilityRevision !== state.activeGrant.availabilityRevision
      ) {
        throw new FittingRoomStateError('The approved reservation scope is stale.')
      }
      const validation = validate(state)
      if (!validation.valid) {
        throw new FittingRoomStateError('The approved look no longer passes validation.')
      }
      const currentLines = state.boardItemIds.map((itemId) => {
        const product = findProduct(state, itemId)
        return `${itemId}:${product.priceCents}`
      })
      const reviewedLines = state.review.lines.map(
        (line) => `${line.itemId}:${line.priceCents}`,
      )
      if (
        currentLines.join('|') !== reviewedLines.join('|') ||
        subtotal(state) !== state.review.subtotalCents
      ) {
        throw new FittingRoomStateError('The approved look no longer matches its review.')
      }
      const reservationNumber = String(state.nextReservationNumber).padStart(3, '0')
      const reservation: FittingRoomReservation = {
        id: `FF-DEMO-${reservationNumber}`,
        reviewId: state.review.id,
        itemIds: [...state.boardItemIds],
        subtotalCents: state.review.subtotalCents,
        currency: 'USD',
        pickupOn: shopper.pickupOn,
        expiresAt: '2026-10-30T18:57:00Z',
        chargedCents: 0,
        authorityConsumed: true,
      }
      const nextQuantities = { ...state.quantities }
      for (const itemId of state.boardItemIds) {
        nextQuantities[itemId] -= 1
      }
      return replaceState(runtime, {
        quantities: nextQuantities,
        availabilityRevision: state.availabilityRevision + 1,
        review: { ...state.review, status: 'consumed' },
        activeGrant: null,
        reservation,
        nextReservationNumber: state.nextReservationNumber + 1,
        activity: activity(
          state.activity,
          'look-held',
          'The exact approved look received one browser-local simulated hold.',
        ),
      })
    },
  }

  return Object.freeze(control)
}
