import type {
  CartReviewRequest,
  FulfilmentCheck,
  FulfilmentQuote,
  ShoppingActivityEntry,
  ShoppingActivityKind,
  ShoppingCart,
  ShoppingCartLine,
  ShoppingCartPatch,
  ShoppingCartReview,
  ShoppingConflict,
  ShoppingContext,
  ShoppingControl,
  ShoppingDestinationId,
  ShoppingGrant,
  ShoppingOperationResult,
  ShoppingProduct,
  ShoppingProductSearchFilters,
  ShoppingRevisions,
  ShoppingSize,
  ShoppingSlot,
  ShoppingSnapshot,
  ShoppingSubscriber,
  ShoppingValidation,
  ShoppingValidationIssue,
  ShoppingVariant,
} from '../types'

interface DeliveryPromise {
  readonly home: string
  readonly 'event-hotel': string
}

interface ShoppingState {
  revision: number
  availabilityRevision: number
  deliveryMatrixRevision: number
  fulfilmentContextRevision: number
  shopperContextRevision: number
  lookRevision: number
  cartRevision: number
  destinationId: ShoppingDestinationId
  lookVariantIds: string[]
  cart: ShoppingCart
  review: ShoppingCartReview | null
  activeGrant: ShoppingGrant | null
  activity: ShoppingActivityEntry[]
  nextReviewNumber: number
}

interface ShoppingRuntime {
  state: ShoppingState
  currentSnapshot: ShoppingSnapshot
  readonly subscribers: Set<ShoppingSubscriber>
}

export interface ShoppingClock {
  now(): Date
}

export class ShoppingStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShoppingStateError'
  }
}

const catalogueRevision = 'shopping-catalogue-v1' as const
const requiredSlots: readonly ShoppingSlot[] = ['base', 'layer', 'bag', 'accent']
const sized: readonly ShoppingSize[] = ['XS', 'S', 'M', 'L']

function variants(
  stem: string,
  priceCents: number,
  quantities: Partial<Record<ShoppingSize, number>> = {},
): readonly ShoppingVariant[] {
  return sized.map((size) => ({
    id: `variant-${stem}-${size.toLowerCase()}`,
    size,
    priceCents,
    quantity: quantities[size] ?? 2,
  }))
}

function oneSize(stem: string, priceCents: number): readonly ShoppingVariant[] {
  return [{ id: `variant-${stem}-one`, size: 'ONE', priceCents, quantity: 3 }]
}

const catalogue: readonly ShoppingProduct[] = [
  {
    id: 'product-midnight-column-dress',
    sku: 'OFA-MCD-BLK',
    name: 'Midnight Column Dress',
    slot: 'base',
    color: 'Black',
    styleTags: ['dramatic', 'polished', 'minimal'],
    description: 'A fluid black column dress with a clean asymmetric neckline.',
    assetPath: '/shopping/midnight-column-dress.webp',
    variants: variants('midnight-column-dress', 14900),
  },
  {
    id: 'product-ink-satin-jumpsuit',
    sku: 'OFA-ISJ-INK',
    name: 'Ink Satin Jumpsuit',
    slot: 'base',
    color: 'Ink',
    styleTags: ['sharp', 'modern', 'polished'],
    description: 'A softly tailored satin jumpsuit with a wide, dance-ready leg.',
    assetPath: '/shopping/ink-satin-jumpsuit.webp',
    variants: variants('ink-satin-jumpsuit', 13900),
  },
  {
    id: 'product-oxblood-slip-dress',
    sku: 'OFA-OSD-OXB',
    name: 'Oxblood Slip Dress',
    slot: 'base',
    color: 'Oxblood',
    styleTags: ['romantic', 'dramatic', 'classic'],
    description: 'A bias-cut oxblood slip dress with a restrained liquid sheen.',
    assetPath: '/shopping/oxblood-slip-dress.webp',
    variants: variants('oxblood-slip-dress', 13200),
  },
  {
    id: 'product-silver-cropped-blazer',
    sku: 'OFA-SCB-SLV',
    name: 'Silver Cropped Blazer',
    slot: 'layer',
    color: 'Silver',
    styleTags: ['editorial', 'sharp', 'dramatic'],
    description: 'A sculpted silver blazer that frames the dress and cobalt boots.',
    assetPath: '/shopping/silver-cropped-blazer.webp',
    variants: variants('silver-cropped-blazer', 9600),
  },
  {
    id: 'product-ink-sculpted-jacket',
    sku: 'OFA-ISJ-BLK',
    name: 'Ink Sculpted Jacket',
    slot: 'layer',
    color: 'Ink',
    styleTags: ['sharp', 'polished', 'modern'],
    description: 'A graphic ink jacket with a shaped waist and hotel-ready delivery.',
    assetPath: '/shopping/ink-sculpted-jacket.webp',
    variants: variants('ink-sculpted-jacket', 11400),
  },
  {
    id: 'product-noir-longline-blazer',
    sku: 'OFA-NLB-BLK',
    name: 'Noir Longline Blazer',
    slot: 'layer',
    color: 'Black',
    styleTags: ['classic', 'polished', 'sharp'],
    description: 'A longline evening blazer with a narrow satin lapel.',
    assetPath: '/shopping/noir-longline-blazer.webp',
    variants: variants('noir-longline-blazer', 12500, { M: 0 }),
  },
  {
    id: 'product-graphite-frame-bag',
    sku: 'OFA-GFB-GRA',
    name: 'Graphite Frame Bag',
    slot: 'bag',
    color: 'Graphite',
    styleTags: ['editorial', 'polished', 'modern'],
    description: 'A compact graphite frame bag with a subtle mirrored finish.',
    assetPath: '/shopping/graphite-frame-bag.webp',
    variants: oneSize('graphite-frame-bag', 5900),
  },
  {
    id: 'product-ink-slim-clutch',
    sku: 'OFA-ISC-INK',
    name: 'Ink Slim Clutch',
    slot: 'bag',
    color: 'Ink',
    styleTags: ['minimal', 'sharp', 'polished'],
    description: 'A slim ink clutch that preserves the silhouette and restores budget.',
    assetPath: '/shopping/ink-slim-clutch.webp',
    variants: oneSize('ink-slim-clutch', 4300),
  },
  {
    id: 'product-oxblood-mini-bag',
    sku: 'OFA-OMB-OXB',
    name: 'Oxblood Mini Bag',
    slot: 'bag',
    color: 'Oxblood',
    styleTags: ['romantic', 'dramatic', 'classic'],
    description: 'A compact oxblood top-handle bag with a restrained gloss.',
    assetPath: '/shopping/oxblood-mini-bag.webp',
    variants: oneSize('oxblood-mini-bag', 4900),
  },
  {
    id: 'product-silver-chain-belt',
    sku: 'OFA-SCBELT-SLV',
    name: 'Silver Chain Belt',
    slot: 'accent',
    color: 'Silver',
    styleTags: ['editorial', 'dramatic', 'sharp'],
    description: 'A fine silver chain belt that echoes the blazer without competing.',
    assetPath: '/shopping/silver-chain-belt.webp',
    variants: oneSize('silver-chain-belt', 3900),
  },
  {
    id: 'product-architectural-earrings',
    sku: 'OFA-AE-SLV',
    name: 'Architectural Earrings',
    slot: 'accent',
    color: 'Silver',
    styleTags: ['modern', 'sharp', 'polished'],
    description: 'Lightweight silver earrings with a graphic folded profile.',
    assetPath: '/shopping/architectural-earrings.webp',
    variants: oneSize('architectural-earrings', 3500),
  },
  {
    id: 'product-oxblood-silk-scarf',
    sku: 'OFA-OSS-OXB',
    name: 'Oxblood Silk Scarf',
    slot: 'accent',
    color: 'Oxblood',
    styleTags: ['romantic', 'classic', 'dramatic'],
    description: 'A narrow silk scarf designed for the wrist, bag or waist.',
    assetPath: '/shopping/oxblood-silk-scarf.webp',
    variants: oneSize('oxblood-silk-scarf', 2900),
  },
]

const deliveryMatrix: Readonly<Record<string, DeliveryPromise>> = Object.fromEntries(
  catalogue.flatMap((product) =>
    product.variants.map((variant) => [
      variant.id,
      product.id === 'product-silver-cropped-blazer'
        ? { home: '2026-09-04', 'event-hotel': '2026-09-07' }
        : { home: '2026-09-03', 'event-hotel': '2026-09-04' },
    ]),
  ),
)

const ownedBoots = {
  id: 'owned-blue-boots',
  name: 'Cobalt-blue ankle boots',
  size: '8',
  assetPath: '/shopping/owned-blue-boots.webp',
  provenance: 'Owned item provided for this demo',
} as const

const baseContext: Omit<ShoppingContext, 'destinationId'> = {
  brief:
    'Style a sharp evening look around my cobalt-blue boots. I wear M, need it at my destination by Friday, and want the retailer items under $350. Show me the exact cart before changing it.',
  clothingSize: 'M',
  shoeSize: '8',
  budgetCents: 35000,
  neededBy: '2026-09-04',
  eventOn: '2026-09-05',
  ownedItems: [ownedBoots],
  stylePreferences: ['dramatic', 'polished', 'sharp'],
}

const emptyCart: ShoppingCart = { lines: [], subtotalCents: 0, chargedCents: 0 }

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) deepFreeze(nested)
  }
  return value
}

function revisions(state: ShoppingState): ShoppingRevisions {
  return {
    revision: state.revision,
    catalogueRevision,
    availabilityRevision: state.availabilityRevision,
    deliveryMatrixRevision: state.deliveryMatrixRevision,
    fulfilmentContextRevision: state.fulfilmentContextRevision,
    shopperContextRevision: state.shopperContextRevision,
    lookRevision: state.lookRevision,
    cartRevision: state.cartRevision,
  }
}

function revisionsAfterNextMutation(state: ShoppingState): ShoppingRevisions {
  return { ...revisions(state), revision: state.revision + 1 }
}

function conflict<T>(state: ShoppingState, error: ShoppingConflict): ShoppingOperationResult<T> {
  return deepFreeze({ ok: false, error, stateChanged: false, revisions: revisions(state) })
}

function success<T>(state: ShoppingState, data: T): ShoppingOperationResult<T> {
  return deepFreeze({ ok: true, data, revisions: revisions(state) })
}

function context(state: ShoppingState): ShoppingContext {
  return { ...baseContext, destinationId: state.destinationId }
}

function allVariants(): readonly { product: ShoppingProduct; variant: ShoppingVariant }[] {
  return catalogue.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  )
}

function findProduct(productId: string): ShoppingProduct | undefined {
  return catalogue.find((candidate) => candidate.id === productId)
}

function findVariant(variantId: string) {
  return allVariants().find(({ variant }) => variant.id === variantId)
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

function validation(state: ShoppingState): ShoppingValidation {
  const issues: ShoppingValidationIssue[] = []
  const selected = state.lookVariantIds
    .map(findVariant)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const subtotalCents = selected.reduce((total, { variant }) => total + variant.priceCents, 0)

  if (selected.length === 0) {
    issues.push({ code: 'EMPTY_LOOK', message: 'No retailer items are in the shared look yet.' })
  }
  for (const slot of requiredSlots) {
    const matches = selected.filter(({ product }) => product.slot === slot)
    if (matches.length === 0) {
      issues.push({ code: 'REQUIRED_SLOT_MISSING', slot, message: `The look needs one ${slot} item.` })
    } else if (matches.length > 1) {
      issues.push({ code: 'DUPLICATE_SLOT', slot, message: `The look has more than one ${slot} item.` })
    }
  }
  for (const { product, variant } of selected) {
    if (variant.size !== 'ONE' && variant.size !== baseContext.clothingSize) {
      issues.push({ code: 'SIZE_UNAVAILABLE', slot: product.slot, variantId: variant.id, message: `${product.name} is not the confirmed size M.` })
    }
    if (variant.quantity < 1) {
      issues.push({ code: 'OUT_OF_STOCK', slot: product.slot, variantId: variant.id, message: `${product.name} is not currently available.` })
    }
  }
  if (subtotalCents > baseContext.budgetCents) {
    issues.push({ code: 'BUDGET_EXCEEDED', message: `The retailer-item subtotal is $${(subtotalCents / 100).toFixed(2)}, above the $350.00 budget.` })
  }
  return { valid: issues.length === 0, subtotalCents, issues }
}

function cartLine(variantId: string): ShoppingCartLine {
  const found = findVariant(variantId)
  if (!found) throw new ShoppingStateError(`Unknown variant ${variantId}.`)
  return {
    variantId,
    productId: found.product.id,
    name: found.product.name,
    sku: found.product.sku,
    size: found.variant.size,
    quantity: 1,
    unitPriceCents: found.variant.priceCents,
  }
}

function proposedCart(variantIds: readonly string[]): ShoppingCart {
  const lines = variantIds.map(cartLine)
  return { lines, subtotalCents: lines.reduce((sum, line) => sum + line.unitPriceCents, 0), chargedCents: 0 }
}

function patchFrom(cart: ShoppingCart, proposed: ShoppingCart): ShoppingCartPatch {
  return {
    add: proposed.lines.filter((line) => !cart.lines.some((existing) => existing.variantId === line.variantId)),
    remove: cart.lines.filter((line) => !proposed.lines.some((next) => next.variantId === line.variantId)),
  }
}

function activity(entries: readonly ShoppingActivityEntry[], kind: ShoppingActivityKind, message: string): ShoppingActivityEntry[] {
  const sequence = entries.length + 1
  return [...entries, { id: `activity-${String(sequence).padStart(3, '0')}`, sequence, kind, message }]
}

function snapshot(state: ShoppingState): ShoppingSnapshot {
  return deepFreeze({
    ...revisions(state),
    context: context(state),
    products: catalogue,
    lookVariantIds: [...state.lookVariantIds],
    validation: validation(state),
    cart: { ...state.cart, lines: state.cart.lines.map((line) => ({ ...line })) },
    review: state.review
      ? {
          ...state.review,
          rationales: state.review.rationales.map((rationale) => ({ ...rationale })),
          patch: {
            add: state.review.patch.add.map((line) => ({ ...line })),
            remove: state.review.patch.remove.map((line) => ({ ...line })),
          },
          proposedCart: { ...state.review.proposedCart, lines: state.review.proposedCart.lines.map((line) => ({ ...line })) },
          quoteIds: [...state.review.quoteIds],
          boundRevisions: { ...state.review.boundRevisions },
        }
      : null,
    activeGrant: state.activeGrant ? { ...state.activeGrant, boundRevisions: { ...state.activeGrant.boundRevisions } } : null,
    activity: state.activity.map((entry) => ({ ...entry })),
  })
}

function publish(runtime: ShoppingRuntime): ShoppingSnapshot {
  const next = snapshot(runtime.state)
  runtime.currentSnapshot = next
  for (const subscriber of runtime.subscribers) subscriber(next)
  return next
}

function replaceState(runtime: ShoppingRuntime, update: Omit<Partial<ShoppingState>, 'revision'>): ShoppingSnapshot {
  runtime.state = { ...runtime.state, ...update, revision: runtime.state.revision + 1 }
  return publish(runtime)
}

function invalidateAuthority(state: ShoppingState, reason: string) {
  if (!state.review && !state.activeGrant) return { review: state.review, activeGrant: state.activeGrant, activity: state.activity }
  return {
    review: state.review ? { ...state.review, status: 'invalidated' as const } : null,
    activeGrant: null,
    activity: activity(state.activity, 'scope-invalidated', reason),
  }
}

function quoteId(state: ShoppingState, variantId: string, destinationId: ShoppingDestinationId): string {
  return [
    'quote',
    variantId,
    destinationId,
    baseContext.neededBy,
    state.availabilityRevision,
    state.deliveryMatrixRevision,
    state.fulfilmentContextRevision,
  ].join('--')
}

function quote(state: ShoppingState, variantId: string, destinationId: ShoppingDestinationId): FulfilmentQuote {
  const arrivesOn = deliveryMatrix[variantId]?.[destinationId]
  if (!arrivesOn) throw new ShoppingStateError(`No delivery fixture exists for ${variantId}.`)
  return {
    quoteId: quoteId(state, variantId, destinationId),
    variantId,
    destinationId,
    neededBy: baseContext.neededBy,
    arrivesOn,
    quotedAtRevision: state.revision,
    availabilityRevision: state.availabilityRevision,
    deliveryMatrixRevision: state.deliveryMatrixRevision,
    fulfilmentContextRevision: state.fulfilmentContextRevision,
  }
}

function compareIso(first: string, second: string) {
  return first.localeCompare(second)
}

function boundRevisionsMatch(current: ShoppingRevisions, bound: ShoppingRevisions): boolean {
  return Object.entries(current).every(([key, value]) => bound[key as keyof ShoppingRevisions] === value)
}

function grantExpired(grant: ShoppingGrant, clock: ShoppingClock): boolean {
  return clock.now().getTime() >= new Date(grant.expiresAt).getTime()
}

export function createShoppingControl(
  clock: ShoppingClock = { now: () => new Date() },
): ShoppingControl {
  const initialState: ShoppingState = {
    revision: 0,
    availabilityRevision: 1,
    deliveryMatrixRevision: 1,
    fulfilmentContextRevision: 1,
    shopperContextRevision: 1,
    lookRevision: 0,
    cartRevision: 0,
    destinationId: 'home',
    lookVariantIds: [],
    cart: emptyCart,
    review: null,
    activeGrant: null,
    activity: [{ id: 'activity-001', sequence: 1, kind: 'session-started', message: 'The fictional retailer canvas is ready.' }],
    nextReviewNumber: 1,
  }
  const runtime: ShoppingRuntime = { state: initialState, currentSnapshot: snapshot(initialState), subscribers: new Set() }

  const control: ShoppingControl = {
    getSnapshot: () => runtime.currentSnapshot,
    subscribe(subscriber) {
      runtime.subscribers.add(subscriber)
      return () => runtime.subscribers.delete(subscriber)
    },
    searchProducts(filters: ShoppingProductSearchFilters) {
      if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 12) {
        throw new ShoppingStateError('Search limit must be an integer from 1 to 12.')
      }
      if (filters.maxItemPriceCents !== undefined && (!Number.isInteger(filters.maxItemPriceCents) || filters.maxItemPriceCents < 0)) {
        throw new ShoppingStateError('Maximum item price must be a non-negative integer.')
      }
      let matches = catalogue.filter((product) =>
        (!filters.slots?.length || filters.slots.includes(product.slot)) &&
        (!filters.colors?.length || filters.colors.includes(product.color)) &&
        (!filters.styleTags?.length || filters.styleTags.every((tag) => product.styleTags.includes(tag))) &&
        (!filters.sizes?.length || product.variants.some((variant) => filters.sizes?.includes(variant.size))) &&
        product.variants.some((variant) =>
          variant.quantity > 0 &&
          (filters.maxItemPriceCents === undefined || variant.priceCents <= filters.maxItemPriceCents) &&
          !filters.excludeVariantIds?.includes(variant.id),
        ),
      )
      const totalMatches = matches.length
      matches = matches.slice(0, filters.limit)
      return deepFreeze({ matches, totalMatches, inspectedVariantCount: matches.reduce((sum, product) => sum + product.variants.length, 0) })
    },
    inspectProducts(productIds) {
      if (!unique(productIds) || productIds.length < 1 || productIds.length > 8) {
        throw new ShoppingStateError('Inspect between one and eight unique products.')
      }
      return deepFreeze(productIds.map((id) => {
        const product = findProduct(id)
        if (!product) throw new ShoppingStateError(`Unknown product ${id}.`)
        return product
      }))
    },
    checkFulfilment(variantIds, destinationId, neededBy) {
      const state = runtime.state
      if (!unique(variantIds) || variantIds.length < 1 || variantIds.length > 8) {
        return conflict(state, { code: 'UNKNOWN_VARIANT', message: 'Check between one and eight unique variants.' })
      }
      if (destinationId !== state.destinationId || neededBy !== baseContext.neededBy) {
        return conflict(state, { code: 'DESTINATION_MISMATCH', message: 'The requested destination or deadline does not match the visible shopper context.', details: { currentDestinationId: state.destinationId, neededBy: baseContext.neededBy } })
      }
      for (const variantId of variantIds) {
        const found = findVariant(variantId)
        if (!found) return conflict(state, { code: 'UNKNOWN_VARIANT', message: `Unknown variant ${variantId}.`, details: { variantId } })
        if (found.variant.quantity < 1) return conflict(state, { code: 'OUT_OF_STOCK', message: `${found.product.name} is out of stock.`, details: { variantId } })
        const current = quote(state, variantId, destinationId)
        if (compareIso(current.arrivesOn, neededBy) > 0) {
          const previous = quote(state, variantId, 'home')
          return conflict(state, {
            code: destinationId === 'event-hotel' && compareIso(previous.arrivesOn, neededBy) <= 0 ? 'DELIVERY_CHANGED' : 'DELIVERY_UNAVAILABLE',
            message: `${found.product.name} arrives ${current.arrivesOn}, after the ${neededBy} deadline.`,
            details: { variantId, previous: { destinationId: 'home', arrivesOn: previous.arrivesOn }, current: { destinationId, arrivesOn: current.arrivesOn }, neededBy },
          })
        }
      }
      const data: FulfilmentCheck = { quotes: variantIds.map((id) => quote(state, id, destinationId)) }
      return success(state, data)
    },
    updateSharedLook(expectedRevision, addVariantIds, removeVariantIds) {
      const state = runtime.state
      if (expectedRevision !== state.revision) return conflict(state, { code: 'STALE_REVISION', message: 'The shopping canvas changed. Read it again before updating.', details: { expectedRevision, currentRevision: state.revision } })
      if (!unique(addVariantIds) || !unique(removeVariantIds) || addVariantIds.some((id) => removeVariantIds.includes(id))) {
        return conflict(state, { code: 'SLOT_CONFLICT', message: 'Additions and removals must be unique and disjoint.' })
      }
      if (addVariantIds.length > 4 || removeVariantIds.length > 4) return conflict(state, { code: 'SLOT_CONFLICT', message: 'Update at most four variants at once.' })
      for (const id of [...addVariantIds, ...removeVariantIds]) {
        if (!findVariant(id)) return conflict(state, { code: 'UNKNOWN_VARIANT', message: `Unknown variant ${id}.`, details: { variantId: id } })
      }
      const next = state.lookVariantIds.filter((id) => !removeVariantIds.includes(id))
      for (const id of addVariantIds) if (!next.includes(id)) next.push(id)
      const occupied = new Set<ShoppingSlot>()
      for (const id of next) {
        const slot = findVariant(id)?.product.slot
        if (!slot || occupied.has(slot)) return conflict(state, { code: 'SLOT_CONFLICT', message: `The look can contain only one ${slot ?? 'unknown'} item.` })
        occupied.add(slot)
      }
      next.sort((first, second) => {
        const firstSlot = findVariant(first)?.product.slot ?? 'accent'
        const secondSlot = findVariant(second)?.product.slot ?? 'accent'
        return requiredSlots.indexOf(firstSlot) - requiredSlots.indexOf(secondSlot)
      })
      if (next.length === state.lookVariantIds.length && next.every((id, index) => id === state.lookVariantIds[index])) {
        return conflict(state, { code: 'SLOT_CONFLICT', message: 'The requested update does not change the look.' })
      }
      const invalidated = invalidateAuthority(state, 'The look changed, so the previous cart authority is no longer valid.')
      const nextSnapshot = replaceState(runtime, { ...invalidated, lookVariantIds: next, lookRevision: state.lookRevision + 1, activity: activity(invalidated.activity, 'look-updated', 'The agent updated the shared styling canvas.') })
      return success(runtime.state, nextSnapshot)
    },
    setDestination(destinationId) {
      const state = runtime.state
      if (destinationId === state.destinationId) return runtime.currentSnapshot
      const invalidated = invalidateAuthority(state, 'The destination changed, so previous delivery quotes and cart authority are no longer valid.')
      return replaceState(runtime, {
        ...invalidated,
        destinationId,
        shopperContextRevision: state.shopperContextRevision + 1,
        fulfilmentContextRevision: state.fulfilmentContextRevision + 1,
        activity: activity(invalidated.activity, 'destination-updated', `Delivery destination changed to ${destinationId === 'home' ? 'Home' : 'Event hotel'}.`),
      })
    },
    requestCartReview(request: CartReviewRequest) {
      const state = runtime.state
      if (request.expectedRevision !== state.revision || request.lookRevision !== state.lookRevision || request.cartRevision !== state.cartRevision) {
        return conflict(state, { code: 'STALE_REVISION', message: 'The look or cart changed. Read the shared canvas and check fulfilment again.' })
      }
      if (state.review?.status === 'pending' || state.activeGrant) return conflict(state, { code: 'REVIEW_INVALIDATED', message: 'A cart review or approved grant is already active.' })
      const currentValidation = validation(state)
      if (!currentValidation.valid) {
        const issue = currentValidation.issues[0]
        const code = issue?.code === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' : issue?.code === 'SIZE_UNAVAILABLE' ? 'SIZE_UNAVAILABLE' : issue?.code === 'BUDGET_EXCEEDED' ? 'BUDGET_EXCEEDED' : 'REVIEW_INVALIDATED'
        return conflict(state, { code, message: issue?.message ?? 'The look is not valid.' })
      }
      if (request.summary.length < 1 || request.summary.length > 240 || request.rationales.length < 1 || request.rationales.length > 4 || request.rationales.some((item) => item.reason.length < 1 || item.reason.length > 160 || !state.lookVariantIds.includes(item.variantId))) {
        return conflict(state, { code: 'REVIEW_INVALIDATED', message: 'The review summary or rationales do not match the current look.' })
      }
      const expectedQuoteIds = state.lookVariantIds.map((id) => quoteId(state, id, state.destinationId))
      if (!unique(request.quoteIds) || request.quoteIds.length !== expectedQuoteIds.length || expectedQuoteIds.some((id) => !request.quoteIds.includes(id))) {
        return conflict(state, { code: 'MISSING_FULFILMENT_QUOTE', message: 'Provide one current delivery quote for every retailer variant.' })
      }
      for (const variantId of state.lookVariantIds) {
        const found = findVariant(variantId)
        if (!found || found.variant.quantity < 1) return conflict(state, { code: 'OUT_OF_STOCK', message: `${found?.product.name ?? variantId} is unavailable.` })
        const currentQuote = quote(state, variantId, state.destinationId)
        if (compareIso(currentQuote.arrivesOn, baseContext.neededBy) > 0) return conflict(state, { code: 'DELIVERY_CHANGED', message: `${found.product.name} no longer reaches the destination by Friday.` })
      }
      const proposed = proposedCart(state.lookVariantIds)
      const reviewNumber = String(state.nextReviewNumber).padStart(3, '0')
      const bound = revisionsAfterNextMutation(state)
      const review: ShoppingCartReview = {
        id: `cart-review-${reviewNumber}`,
        status: 'pending',
        summary: request.summary,
        rationales: request.rationales.map((item) => ({ ...item })),
        patch: patchFrom(state.cart, proposed),
        proposedCart: proposed,
        quoteIds: [...request.quoteIds],
        boundRevisions: bound,
        requiresHumanApproval: true,
        cartChanged: false,
        chargedCents: 0,
      }
      const nextSnapshot = replaceState(runtime, { review, nextReviewNumber: state.nextReviewNumber + 1, activity: activity(state.activity, 'review-requested', 'The agent prepared an exact cart patch for human review. The cart is unchanged.') })
      return success(runtime.state, nextSnapshot)
    },
    keepEditing(reviewId) {
      const state = runtime.state
      if (!state.review || state.review.id !== reviewId || state.review.status !== 'pending') throw new ShoppingStateError('That cart review is not pending.')
      return replaceState(runtime, { review: { ...state.review, status: 'dismissed' }, activity: activity(state.activity, 'review-dismissed', 'The person kept editing. No cart change occurred.') })
    },
    declineCartReview(reviewId) {
      const state = runtime.state
      if (!state.review || state.review.id !== reviewId || state.review.status !== 'pending') throw new ShoppingStateError('That cart review is not pending.')
      return replaceState(runtime, { review: { ...state.review, status: 'declined' }, activity: activity(state.activity, 'review-declined', 'The person declined the cart proposal. No cart change occurred.') })
    },
    approveCartReview(reviewId) {
      const state = runtime.state
      if (!state.review || state.review.id !== reviewId || state.review.status !== 'pending') throw new ShoppingStateError('That cart review is not pending.')
      if (!boundRevisionsMatch(revisions(state), state.review.boundRevisions)) throw new ShoppingStateError('The review is stale and cannot be approved.')
      const expiresAt = new Date(clock.now().getTime() + 5 * 60 * 1000).toISOString()
      return replaceState(runtime, {
        review: { ...state.review, status: 'approved' },
        activeGrant: { id: `cart-grant-${reviewId.slice(-3)}`, reviewId, expiresAt, usesRemaining: 1, boundRevisions: revisionsAfterNextMutation(state) },
        activity: activity(state.activity, 'review-approved', 'Human approval created one exact, five-minute cart capability.'),
      })
    },
    revokeCartGrant(grantId) {
      const state = runtime.state
      if (!state.activeGrant || state.activeGrant.id !== grantId) throw new ShoppingStateError('That cart grant is not active.')
      return replaceState(runtime, { review: state.review ? { ...state.review, status: 'revoked' } : null, activeGrant: null, activity: activity(state.activity, 'grant-revoked', 'The person revoked the temporary cart capability.') })
    },
    expireCartGrant(grantId) {
      const state = runtime.state
      if (!state.activeGrant || state.activeGrant.id !== grantId) return runtime.currentSnapshot
      return replaceState(runtime, { review: state.review ? { ...state.review, status: 'expired' } : null, activeGrant: null, activity: activity(state.activity, 'grant-expired', 'The temporary cart capability expired.') })
    },
    applyApprovedCart(grantId) {
      const state = runtime.state
      const grant = state.activeGrant
      if (!grant || grant.id !== grantId || grant.usesRemaining !== 1) return conflict(state, { code: 'GRANT_INVALID', message: 'No matching one-use cart authority is active.' })
      if (grantExpired(grant, clock)) return conflict(state, { code: 'GRANT_EXPIRED', message: 'The cart authority expired before use.' })
      if (!state.review || state.review.id !== grant.reviewId || state.review.status !== 'approved') return conflict(state, { code: 'REVIEW_INVALIDATED', message: 'The approved cart review is no longer valid.' })
      if (!boundRevisionsMatch(revisions(state), grant.boundRevisions)) return conflict(state, { code: 'STALE_REVISION', message: 'The shopping state changed after approval.' })
      for (const variantId of state.lookVariantIds) {
        const found = findVariant(variantId)
        if (!found || found.variant.quantity < 1) return conflict(state, { code: 'OUT_OF_STOCK', message: `${found?.product.name ?? variantId} is no longer available.` })
        if (compareIso(quote(state, variantId, state.destinationId).arrivesOn, baseContext.neededBy) > 0) return conflict(state, { code: 'DELIVERY_CHANGED', message: `${found.product.name} no longer arrives in time.` })
      }
      const exactCart = state.review.proposedCart
      if (exactCart.subtotalCents !== validation(state).subtotalCents) return conflict(state, { code: 'REVIEW_INVALIDATED', message: 'The displayed cart total no longer matches the approved look.' })
      const nextSnapshot = replaceState(runtime, {
        cart: { ...exactCart, lines: exactCart.lines.map((line) => ({ ...line })) },
        cartRevision: state.cartRevision + 1,
        review: { ...state.review, status: 'consumed', cartChanged: true },
        activeGrant: null,
        activity: activity(state.activity, 'cart-updated', 'The exact approved patch was applied once. Checkout remains human-only.'),
      })
      return success(runtime.state, nextSnapshot)
    },
  }
  return control
}

export const shoppingCatalogue = catalogue
