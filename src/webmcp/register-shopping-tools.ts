import { shoppingCatalogue } from '../domain'
import type {
  CartReviewRequest,
  ShoppingControl,
  ShoppingDestinationId,
  ShoppingGrant,
  ShoppingOperationResult,
  ShoppingProductSearchFilters,
  ShoppingReviewRationale,
  ShoppingSize,
  ShoppingSlot,
  ShoppingSnapshot,
  ShoppingStyleTag,
  ShoppingToolsRegistration,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
} from '../types'

export const permanentShoppingToolNames = Object.freeze([
  'read_shopper_context',
  'search_products',
  'inspect_products',
  'check_fulfilment',
  'read_shared_look',
  'update_shared_look',
  'request_cart_review',
] as const)

export const APPLY_APPROVED_CART_TOOL_NAME = 'apply_approved_cart'

const allShoppingToolNames = new Set<string>([
  ...permanentShoppingToolNames,
  APPLY_APPROVED_CART_TOOL_NAME,
])

const productIds = Object.freeze(shoppingCatalogue.map((product) => product.id))
const variantIds = Object.freeze(
  shoppingCatalogue.flatMap((product) => product.variants.map((variant) => variant.id)),
)
const slots = Object.freeze(['base', 'layer', 'bag', 'accent'] as const)
const colors = Object.freeze([...new Set(shoppingCatalogue.map((product) => product.color))])
const styleTags = Object.freeze([
  'dramatic',
  'polished',
  'sharp',
  'editorial',
  'minimal',
  'romantic',
  'classic',
  'modern',
] as const)
const sizes = Object.freeze(['XS', 'S', 'M', 'L', 'ONE'] as const)
const destinations = Object.freeze(['home', 'event-hotel'] as const)

const emptySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
})

const stringArraySchema = (
  values: readonly string[],
  maxItems: number,
  minItems = 0,
) =>
  Object.freeze({
    type: 'array',
    items: Object.freeze({ type: 'string', enum: values }),
    uniqueItems: true,
    minItems,
    maxItems,
  })

const searchSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    categories: stringArraySchema(slots, 4, 1),
    colors: stringArraySchema(colors, colors.length),
    style_tags: stringArraySchema(styleTags, styleTags.length),
    sizes: stringArraySchema(sizes, sizes.length, 1),
    max_item_price_cents: Object.freeze({ type: 'integer', minimum: 0, maximum: 35000 }),
    exclude_variant_ids: stringArraySchema(variantIds, 12),
    limit: Object.freeze({ type: 'integer', minimum: 1, maximum: 12 }),
  }),
  required: Object.freeze(['categories', 'sizes', 'limit']),
  additionalProperties: false as const,
})

const inspectSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({ product_ids: stringArraySchema(productIds, 8, 1) }),
  required: Object.freeze(['product_ids']),
  additionalProperties: false as const,
})

const fulfilmentSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    variant_ids: stringArraySchema(variantIds, 8, 1),
    destination_id: Object.freeze({ type: 'string', enum: destinations }),
    needed_by: Object.freeze({ type: 'string', const: '2026-09-04' }),
  }),
  required: Object.freeze(['variant_ids', 'destination_id', 'needed_by']),
  additionalProperties: false as const,
})

const updateSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    add_variant_ids: stringArraySchema(variantIds, 4),
    remove_variant_ids: stringArraySchema(variantIds, 4),
  }),
  required: Object.freeze(['expected_revision', 'add_variant_ids', 'remove_variant_ids']),
  additionalProperties: false as const,
})

const rationaleSchema = Object.freeze({
  type: 'object',
  properties: Object.freeze({
    variant_id: Object.freeze({ type: 'string', enum: variantIds }),
    reason: Object.freeze({ type: 'string', minLength: 1, maxLength: 160 }),
  }),
  required: Object.freeze(['variant_id', 'reason']),
  additionalProperties: false,
})

const reviewSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    look_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    cart_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    quote_ids: Object.freeze({ type: 'array', items: Object.freeze({ type: 'string', minLength: 1 }), uniqueItems: true, minItems: 1, maxItems: 4 }),
    summary: Object.freeze({ type: 'string', minLength: 1, maxLength: 240 }),
    rationales: Object.freeze({ type: 'array', items: rationaleSchema, minItems: 1, maxItems: 4 }),
  }),
  required: Object.freeze(['expected_revision', 'look_revision', 'cart_revision', 'quote_ids', 'summary', 'rationales']),
  additionalProperties: false as const,
})

function structuredResult(summary: string, value: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: summary }], structuredContent: value }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function integer(args: Record<string, unknown>, key: string): number {
  const value = args[key]
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError(`${key} must be a non-negative integer.`)
  }
  return value as number
}

function boundedString(args: Record<string, unknown>, key: string, maximum: number): string {
  const value = args[key]
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
    throw new TypeError(`${key} must contain between 1 and ${maximum} characters.`)
  }
  return value
}

function stringArray<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowed: readonly T[] | null,
  options: { minItems?: number; maxItems: number; optional?: boolean },
): readonly T[] | undefined {
  const value = args[key]
  if (value === undefined && options.optional) return undefined
  if (!Array.isArray(value) || value.length < (options.minItems ?? 0) || value.length > options.maxItems) {
    throw new TypeError(`${key} must contain ${options.minItems ?? 0} to ${options.maxItems} items.`)
  }
  if (new Set(value).size !== value.length) throw new TypeError(`${key} must not contain duplicates.`)
  if (!value.every((item) => typeof item === 'string' && (!allowed || allowed.includes(item as T)))) {
    throw new TypeError(`${key} contains an unsupported value.`)
  }
  return value as readonly T[]
}

function searchFilters(args: Record<string, unknown>): ShoppingProductSearchFilters {
  const limit = integer(args, 'limit')
  if (limit < 1 || limit > 12) throw new TypeError('limit must be from 1 to 12.')
  const maxItemPrice = args.max_item_price_cents
  if (maxItemPrice !== undefined && (!Number.isInteger(maxItemPrice) || (maxItemPrice as number) < 0 || (maxItemPrice as number) > 35000)) {
    throw new TypeError('max_item_price_cents must be from 0 to 35000.')
  }
  return {
    slots: stringArray(args, 'categories', slots, { minItems: 1, maxItems: 4 }) as readonly ShoppingSlot[],
    colors: stringArray(args, 'colors', colors, { maxItems: colors.length, optional: true }),
    styleTags: stringArray(args, 'style_tags', styleTags, { maxItems: styleTags.length, optional: true }) as readonly ShoppingStyleTag[] | undefined,
    sizes: stringArray(args, 'sizes', sizes, { minItems: 1, maxItems: sizes.length }) as readonly ShoppingSize[],
    maxItemPriceCents: maxItemPrice as number | undefined,
    excludeVariantIds: stringArray(args, 'exclude_variant_ids', variantIds, { maxItems: 12, optional: true }),
    limit,
  }
}

function reviewRequest(args: Record<string, unknown>): CartReviewRequest {
  const rawRationales = args.rationales
  if (!Array.isArray(rawRationales) || rawRationales.length < 1 || rawRationales.length > 4) {
    throw new TypeError('rationales must contain one to four entries.')
  }
  const rationales: ShoppingReviewRationale[] = rawRationales.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Each rationale must be an object.')
    const entry = raw as Record<string, unknown>
    const keys = Object.keys(entry)
    if (keys.some((key) => key !== 'variant_id' && key !== 'reason')) throw new TypeError('Rationales contain unsupported fields.')
    const variantId = boundedString(entry, 'variant_id', 120)
    if (!variantIds.includes(variantId)) throw new TypeError('A rationale contains an unsupported variant_id.')
    return { variantId, reason: boundedString(entry, 'reason', 160) }
  })
  return {
    expectedRevision: integer(args, 'expected_revision'),
    lookRevision: integer(args, 'look_revision'),
    cartRevision: integer(args, 'cart_revision'),
    quoteIds: stringArray(args, 'quote_ids', null, { minItems: 1, maxItems: 4 }) ?? [],
    summary: boundedString(args, 'summary', 240),
    rationales,
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Tool execution was cancelled.', 'AbortError')
  }
}

const ABORTABLE_COMMIT_DELAY_MS = 75

function waitForAbortableCommit(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      throwIfAborted(signal)
    } catch (error) {
      reject(error)
      return
    }
    let timer: ReturnType<typeof setTimeout>
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('Tool execution was cancelled.', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      cleanup()
      try {
        throwIfAborted(signal)
        resolve()
      } catch (error) {
        reject(error)
      }
    }, ABORTABLE_COMMIT_DELAY_MS)
  })
}

function operationSummary<T>(label: string, result: ShoppingOperationResult<T>): string {
  return result.ok
    ? `${label} succeeded at revision ${result.revisions.revision}.`
    : `${label} could not proceed: ${result.error.code}. ${result.error.message} State was not changed.`
}

function safeSharedLook(snapshot: ShoppingSnapshot) {
  const { activeGrant: _grant, products: _products, ...rest } = snapshot
  return {
    ...rest,
    temporaryCartCapabilityActive: Boolean(snapshot.activeGrant),
    productCount: snapshot.products.length,
    variantCount: snapshot.products.flatMap((product) => product.variants).length,
  }
}

function createPermanentTools(control: ShoppingControl): readonly WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: false } as const
  const write = { readOnlyHint: false, untrustedContentHint: false } as const
  return [
    {
      name: 'read_shopper_context',
      description: 'Read the visible fictional shopper brief, confirmed constraints, owned cobalt-blue boots and current delivery destination.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const current = control.getSnapshot()
        return structuredResult(
          `Shopper context read. Size M; owned cobalt-blue boots; $${(current.context.budgetCents / 100).toFixed(0)} retailer-item budget; needed by Friday; destination ${current.context.destinationId}.`,
          { context: current.context, shopperContextRevision: current.shopperContextRevision, fulfilmentContextRevision: current.fulfilmentContextRevision },
        )
      },
    },
    {
      name: 'search_products',
      description: 'Search bounded retailer-authored category, color, style, size, price and availability facts. This does not recommend an outfit.',
      inputSchema: searchSchema,
      annotations: readOnly,
      execute: (args) => {
        const current = control.getSnapshot()
        const results = control.searchProducts(searchFilters(args))
        return structuredResult(
          `Product search returned ${results.matches.length} of ${results.totalMatches} matching fictional styles.`,
          { ...results, catalogueRevision: current.catalogueRevision, availabilityRevision: current.availabilityRevision, deliveryMatrixRevision: current.deliveryMatrixRevision },
        )
      },
    },
    {
      name: 'inspect_products',
      description: 'Inspect one to eight exact fictional product color SKUs, including asset, variants, size, price, quantity and retailer-authored style facts.',
      inputSchema: inspectSchema,
      annotations: readOnly,
      execute: (args) => {
        const inspected = control.inspectProducts(stringArray(args, 'product_ids', productIds, { minItems: 1, maxItems: 8 }) ?? [])
        return structuredResult(`${inspected.length} exact product styles inspected.`, inspected)
      },
    },
    {
      name: 'check_fulfilment',
      description: 'Check current quantity and destination-specific delivery for one to eight exact variants. Returns revision-bound quotes and never chooses a substitute.',
      inputSchema: fulfilmentSchema,
      annotations: readOnly,
      execute: (args) => {
        const destination = args.destination_id
        if (!destinations.includes(destination as ShoppingDestinationId)) throw new TypeError('destination_id is unsupported.')
        if (args.needed_by !== '2026-09-04') throw new TypeError('needed_by must match the visible Friday deadline.')
        const result = control.checkFulfilment(
          stringArray(args, 'variant_ids', variantIds, { minItems: 1, maxItems: 8 }) ?? [],
          destination as ShoppingDestinationId,
          '2026-09-04',
        )
        return structuredResult(operationSummary('Fulfilment check', result), result)
      },
    },
    {
      name: 'read_shared_look',
      description: 'Read the visible shared styling canvas, validation, review and cart summary once. The active grant secret is never returned.',
      inputSchema: emptySchema,
      annotations: readOnly,
      execute: () => {
        const current = control.getSnapshot()
        return structuredResult(
          `Shared look read at revision ${current.revision}: ${current.lookVariantIds.length} retailer items, $${(current.validation.subtotalCents / 100).toFixed(2)}, validation ${current.validation.valid ? 'passes' : 'needs attention'}, cart ${current.cart.lines.length} lines. Use this result and do not repeat the read in the same turn.`,
          safeSharedLook(current),
        )
      },
    },
    {
      name: 'update_shared_look',
      description: 'Reversibly update the visible styling preview by exact variant ID. This does not change the cart or the owned blue boots.',
      inputSchema: updateSchema,
      annotations: write,
      execute: async (args, execution) => {
        await waitForAbortableCommit(execution?.signal)
        const result = control.updateSharedLook(
          integer(args, 'expected_revision'),
          stringArray(args, 'add_variant_ids', variantIds, { maxItems: 4 }) ?? [],
          stringArray(args, 'remove_variant_ids', variantIds, { maxItems: 4 }) ?? [],
        )
        return structuredResult(
          result.ok
            ? `Shared styling canvas updated to revision ${result.revisions.revision}. The cart is still unchanged.`
            : operationSummary('Shared look update', result),
          result,
        )
      },
    },
    {
      name: 'request_cart_review',
      description: 'Prepare an immutable human review for the exact current look using fresh delivery quotes. This changes no cart and charges nothing.',
      inputSchema: reviewSchema,
      annotations: write,
      execute: async (args, execution) => {
        await waitForAbortableCommit(execution?.signal)
        const result = control.requestCartReview(reviewRequest(args))
        return structuredResult(
          result.ok
            ? `Exact cart review ${result.data.review?.id} is visible. The cart is unchanged, $0 is charged, and human approval is required.`
            : operationSummary('Cart review request', result),
          result,
        )
      },
    },
  ]
}

function defaultDocumentScope(): WebMcpDocumentScope | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as WebMcpDocumentScope
}

export async function registerShoppingTools(
  control: ShoppingControl,
  documentScope: WebMcpDocumentScope | undefined = defaultDocumentScope(),
): Promise<ShoppingToolsRegistration> {
  const modelContext = documentScope?.modelContext
  const supported = Boolean(modelContext && typeof modelContext.registerTool === 'function' && typeof modelContext.getTools === 'function')
  let lastError: Error | null = null
  let disposed = false
  let registeredToolNames = new Set<string>()
  let work = Promise.resolve()
  let inventoryWork = Promise.resolve()
  const permanentController = new AbortController()
  let grantController: AbortController | null = null
  let settlingGrantController: AbortController | null = null
  let registeredGrantId: string | null = null
  let unsubscribe = () => {}

  const recordError = (error: unknown) => {
    lastError = toError(error)
  }
  const refreshInventory = async () => {
    if (!modelContext) {
      registeredToolNames = new Set()
      return
    }
    const tools = await modelContext.getTools()
    registeredToolNames = new Set(tools.map((tool) => tool.name).filter((name) => allShoppingToolNames.has(name)))
  }
  const scheduleInventoryRefresh = () => {
    inventoryWork = inventoryWork.then(refreshInventory).catch(recordError)
  }
  const toolChangeListener: EventListener = () => scheduleInventoryRefresh()
  const enqueue = (task: () => Promise<void>) => {
    work = work.then(task).catch(recordError)
  }

  const createGrantTool = (grant: ShoppingGrant, registrationController: AbortController): WebMcpTool => {
    let authorityConsumed = false
    const delay = Math.max(0, new Date(grant.expiresAt).getTime() - Date.now())
    const expiryTimer = setTimeout(() => {
      if (control.getSnapshot().activeGrant?.id === grant.id) control.expireCartGrant(grant.id)
    }, delay)
    registrationController.signal.addEventListener('abort', () => clearTimeout(expiryTimer), { once: true })

    return {
      name: APPLY_APPROVED_CART_TOOL_NAME,
      description: 'Apply the exact person-approved browser-local cart patch once. No variant, size, quantity, price or delivery argument can be changed; checkout remains human-only.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (_args, execution) => {
        if (authorityConsumed) throw new Error('The one-use approved cart capability is not active.')
        await waitForAbortableCommit(execution?.signal)
        if (authorityConsumed) throw new Error('The one-use approved cart capability is not active.')
        const result = control.applyApprovedCart(grant.id)
        if (!result.ok) return structuredResult(operationSummary('Approved cart patch', result), result)
        authorityConsumed = true
        settlingGrantController = registrationController
        enqueue(async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
          registrationController.abort()
          if (grantController === registrationController) {
            grantController = null
            registeredGrantId = null
          }
          if (settlingGrantController === registrationController) settlingGrantController = null
          await refreshInventory()
        })
        return structuredResult(
          `The exact approved cart patch was applied once. ${result.data.cart.lines.length} cart lines total $${(result.data.cart.subtotalCents / 100).toFixed(2)}; $0 charged; authority consumed; checkout remains human-only.`,
          { ...result, authorityConsumed: true },
        )
      },
    }
  }

  const reconcileGrant = async (grant: ShoppingGrant | null) => {
    if (disposed || !modelContext) return
    if (grant?.id === registeredGrantId && !grantController?.signal.aborted) return
    if (!grant && grantController === settlingGrantController) {
      await refreshInventory()
      return
    }
    grantController?.abort()
    grantController = null
    registeredGrantId = null
    if (grant) {
      const controller = new AbortController()
      grantController = controller
      registeredGrantId = grant.id
      try {
        await modelContext.registerTool(createGrantTool(grant, controller), { signal: controller.signal })
      } catch (error) {
        controller.abort()
        if (grantController === controller) {
          grantController = null
          registeredGrantId = null
        }
        throw error
      }
      if (disposed || control.getSnapshot().activeGrant?.id !== grant.id) {
        controller.abort()
        if (grantController === controller) {
          grantController = null
          registeredGrantId = null
        }
      }
    }
    await refreshInventory()
  }

  const whenIdle = async () => {
    while (true) {
      const currentWork = work
      const currentInventory = inventoryWork
      await Promise.all([currentWork, currentInventory])
      if (currentWork === work && currentInventory === inventoryWork) return
    }
  }

  const registration: ShoppingToolsRegistration = {
    supported,
    permanentToolNames: permanentShoppingToolNames,
    async getRegisteredToolNames() {
      await whenIdle()
      try {
        await refreshInventory()
      } catch (error) {
        recordError(error)
      }
      return [...registeredToolNames].sort()
    },
    getLastError: () => lastError,
    whenIdle,
    async dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
      modelContext?.removeEventListener?.('toolchange', toolChangeListener)
      grantController?.abort()
      grantController = null
      settlingGrantController = null
      registeredGrantId = null
      permanentController.abort()
      scheduleInventoryRefresh()
      await whenIdle()
    },
  }

  if (!supported || !modelContext) return registration
  modelContext.addEventListener?.('toolchange', toolChangeListener)
  const outcomes = await Promise.allSettled(
    createPermanentTools(control).map((tool) => modelContext.registerTool(tool, { signal: permanentController.signal })),
  )
  for (const outcome of outcomes) if (outcome.status === 'rejected') recordError(outcome.reason)
  await refreshInventory().catch(recordError)
  unsubscribe = control.subscribe((next: ShoppingSnapshot) => enqueue(() => reconcileGrant(next.activeGrant)))
  enqueue(() => reconcileGrant(control.getSnapshot().activeGrant))
  await whenIdle()
  return registration
}
