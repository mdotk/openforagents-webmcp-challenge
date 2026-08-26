import type {
  FittingRoomControl,
  FittingRoomProductId,
  FittingRoomSnapshot,
  FittingRoomToolsRegistration,
  ProductSearchFilters,
  ReservationGrant,
  WebMcpDocumentScope,
  WebMcpTool,
  WebMcpToolResult,
} from '../types'

export const permanentFittingRoomToolNames = Object.freeze([
  'read_shopper_context',
  'search_products',
  'inspect_products',
  'read_fitting_room',
  'update_fitting_room',
  'validate_fitting_room',
  'request_reservation_review',
] as const)

export const RESERVE_APPROVED_LOOK_TOOL_NAME = 'reserve_approved_look'

const allFittingRoomToolNames = new Set<string>([
  ...permanentFittingRoomToolNames,
  RESERVE_APPROVED_LOOK_TOOL_NAME,
])

const productIds = Object.freeze([
  'FV-101',
  'FV-206',
  'FV-207',
  'FV-304',
  'FV-408',
  'FV-409',
] as const)
const categories = Object.freeze(['top', 'bottom', 'layer', 'accessory'] as const)
const colors = Object.freeze(['black', 'burgundy'] as const)
const styleTags = Object.freeze([
  'tailored',
  'dramatic',
  'gothic',
  'romantic',
] as const)

const emptySchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
})

const productIdArraySchema = Object.freeze({
  type: 'array',
  items: Object.freeze({ type: 'string', enum: productIds }),
  uniqueItems: true,
  maxItems: 8,
})

const searchSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    categories: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', enum: categories }),
      uniqueItems: true,
      maxItems: 4,
    }),
    colors: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', enum: colors }),
      uniqueItems: true,
      maxItems: 2,
    }),
    style_tags: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', enum: styleTags }),
      uniqueItems: true,
      maxItems: 4,
    }),
    size: Object.freeze({ type: 'string', const: 'M' }),
    pickup_on: Object.freeze({ type: 'string', const: '2026-10-30' }),
    excluded_contact_zones: Object.freeze({
      type: 'array',
      items: Object.freeze({ type: 'string', const: 'neck' }),
      uniqueItems: true,
      maxItems: 1,
    }),
    minimum_movement: Object.freeze({ type: 'string', const: 'high' }),
    max_item_price_cents: Object.freeze({
      type: 'integer',
      minimum: 0,
      maximum: 25000,
    }),
    limit: Object.freeze({ type: 'integer', minimum: 1, maximum: 12 }),
  }),
  required: Object.freeze(['size', 'pickup_on', 'limit']),
  additionalProperties: false as const,
})

const inspectSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({ item_ids: productIdArraySchema }),
  required: Object.freeze(['item_ids']),
  additionalProperties: false as const,
})

const updateSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    add_item_ids: productIdArraySchema,
    remove_item_ids: productIdArraySchema,
  }),
  required: Object.freeze([
    'expected_revision',
    'add_item_ids',
    'remove_item_ids',
  ]),
  additionalProperties: false as const,
})

const revisionSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
  }),
  required: Object.freeze(['expected_revision']),
  additionalProperties: false as const,
})

const reviewSchema = Object.freeze({
  type: 'object' as const,
  properties: Object.freeze({
    expected_revision: Object.freeze({ type: 'integer', minimum: 0 }),
    hold_minutes: Object.freeze({ type: 'integer', const: 15 }),
    pickup_slot: Object.freeze({ type: 'string', const: 'friday-16:00' }),
  }),
  required: Object.freeze([
    'expected_revision',
    'hold_minutes',
    'pickup_slot',
  ]),
  additionalProperties: false as const,
})

function structuredResult(summary: string, value: unknown): WebMcpToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: value,
  }
}

function getExpectedRevision(args: Record<string, unknown>): number {
  const value = args.expected_revision
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError('expected_revision must be a non-negative integer.')
  }
  return value as number
}

function getStringArray<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options: { required?: boolean; maxItems: number },
): readonly T[] | undefined {
  const value = args[key]
  if (value === undefined && !options.required) return undefined
  if (!Array.isArray(value) || value.length > options.maxItems) {
    throw new TypeError(`${key} must be an array with at most ${options.maxItems} items.`)
  }
  if (new Set(value).size !== value.length) {
    throw new TypeError(`${key} must not contain duplicates.`)
  }
  if (!value.every((item) => typeof item === 'string' && allowed.includes(item as T))) {
    throw new TypeError(`${key} contains an unsupported value.`)
  }
  return value as readonly T[]
}

function getProductIds(
  args: Record<string, unknown>,
  key: string,
  options: { required?: boolean; maxItems?: number } = {},
): readonly FittingRoomProductId[] {
  return (
    getStringArray(args, key, productIds, {
      required: options.required,
      maxItems: options.maxItems ?? 8,
    }) ?? []
  )
}

function getSearchFilters(args: Record<string, unknown>): ProductSearchFilters {
  if (args.size !== 'M') throw new TypeError('size must be M.')
  if (args.pickup_on !== '2026-10-30') {
    throw new TypeError('pickup_on must be the documented Friday fixture date.')
  }
  if (!Number.isInteger(args.limit) || (args.limit as number) < 1 || (args.limit as number) > 12) {
    throw new TypeError('limit must be an integer from 1 to 12.')
  }
  const maxItemPrice = args.max_item_price_cents
  if (
    maxItemPrice !== undefined &&
    (!Number.isInteger(maxItemPrice) ||
      (maxItemPrice as number) < 0 ||
      (maxItemPrice as number) > 25000)
  ) {
    throw new TypeError('max_item_price_cents must be an integer from 0 to 25000.')
  }
  if (args.minimum_movement !== undefined && args.minimum_movement !== 'high') {
    throw new TypeError('minimum_movement must be high.')
  }

  return {
    categories: getStringArray(args, 'categories', categories, { maxItems: 4 }),
    colors: getStringArray(args, 'colors', colors, { maxItems: 2 }),
    styleTags: getStringArray(args, 'style_tags', styleTags, { maxItems: 4 }),
    size: 'M',
    pickupOn: '2026-10-30',
    excludedContactZones:
      getStringArray(args, 'excluded_contact_zones', ['neck'] as const, {
        maxItems: 1,
      }) as readonly ['neck'] | undefined,
    minimumMovement: args.minimum_movement === 'high' ? 'high' : undefined,
    maxItemPriceCents: maxItemPrice as number | undefined,
    limit: args.limit as number,
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
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
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : new DOMException('Tool execution was cancelled.', 'AbortError'),
      )
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

function fittingRoomSummary(snapshot: FittingRoomSnapshot) {
  const itemNames = snapshot.boardItemIds.map(
    (itemId) => snapshot.products.find((product) => product.id === itemId)?.name,
  )
  return `Fitting room read successfully. Revision ${snapshot.revision}; board revision ${snapshot.boardRevision}; ${itemNames.length} retailer items; subtotal $${(snapshot.subtotalCents / 100).toFixed(2)}; validation ${snapshot.validation.valid ? 'passes' : 'needs attention'}; review ${snapshot.review?.status ?? 'none'}; simulated hold ${snapshot.reservation ? snapshot.reservation.id : 'none'}. Use this result and do not repeat the read in the same turn.`
}

function createPermanentTools(control: FittingRoomControl): readonly WebMcpTool[] {
  const readOnlyAnnotations = {
    readOnlyHint: true,
    untrustedContentHint: false,
  } as const
  const writeAnnotations = {
    readOnlyHint: false,
    untrustedContentHint: false,
  } as const

  return [
    {
      name: 'read_shopper_context',
      description:
        'Read the fictional shopper brief, confirmed constraints and owned items from this page.',
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: () => {
        const current = control.getSnapshot()
        return structuredResult(
          `Shopper context read successfully. Size ${current.shopper.size}; pickup ${current.shopper.pickupOn}; budget $250; neck clear; dance-ready; black boots already owned.`,
          current.shopper,
        )
      },
    },
    {
      name: 'search_products',
      description:
        'Search only retailer-authored fictional product fields such as category, color, style tags, size, pickup, movement and contact zone.',
      inputSchema: searchSchema,
      annotations: readOnlyAnnotations,
      execute: (args) => {
        const current = control.getSnapshot()
        const matches = control.searchProducts(getSearchFilters(args))
        return structuredResult(
          `Product search completed against availability revision ${current.availabilityRevision}. ${matches.length} matching fictional products returned.`,
          {
            catalogueRevision: current.catalogueRevision,
            availabilityRevision: current.availabilityRevision,
            matches,
          },
        )
      },
    },
    {
      name: 'inspect_products',
      description: 'Inspect one to eight fictional products by canonical item ID.',
      inputSchema: inspectSchema,
      annotations: readOnlyAnnotations,
      execute: (args) => {
        const inspected = control.inspectProducts(
          getProductIds(args, 'item_ids', { required: true, maxItems: 8 }),
        )
        return structuredResult(
          `${inspected.length} fictional products inspected successfully.`,
          inspected,
        )
      },
    },
    {
      name: 'read_fitting_room',
      description:
        'Read the current shared fitting-room revision once. On success, use the returned summary and do not call this tool again in the same turn.',
      inputSchema: emptySchema,
      annotations: readOnlyAnnotations,
      execute: () => {
        const current = control.getSnapshot()
        return structuredResult(fittingRoomSummary(current), current)
      },
    },
    {
      name: 'update_fitting_room',
      description:
        'Reversibly add or remove fictional products from the visible fitting room. Human-pinned items cannot be removed.',
      inputSchema: updateSchema,
      annotations: writeAnnotations,
      execute: async (args, context) => {
        await waitForAbortableCommit(context?.signal)
        const next = control.updateFittingRoom(
          getExpectedRevision(args),
          getProductIds(args, 'add_item_ids', { required: true, maxItems: 8 }),
          getProductIds(args, 'remove_item_ids', { required: true, maxItems: 8 }),
        )
        return structuredResult(
          `Fitting room updated to revision ${next.revision}. ${next.boardItemIds.length} retailer items; subtotal $${(next.subtotalCents / 100).toFixed(2)}. No reservation was created.`,
          next,
        )
      },
    },
    {
      name: 'validate_fitting_room',
      description:
        'Validate the current fitting-room revision against the person-confirmed budget, pickup, comfort and movement constraints.',
      inputSchema: revisionSchema,
      annotations: readOnlyAnnotations,
      execute: (args) => {
        const validation = control.validateFittingRoom(getExpectedRevision(args))
        return structuredResult(
          validation.valid
            ? `Validation passed at revision ${validation.revision}. Subtotal $${(validation.subtotalCents / 100).toFixed(2)} and every hard rule passes.`
            : `Validation failed at revision ${validation.revision}. ${validation.issues.map((issue) => issue.message).join(' ')}`,
          validation,
        )
      },
    },
    {
      name: 'request_reservation_review',
      description:
        'Create a human review for the exact valid look. This creates no hold and charges nothing.',
      inputSchema: reviewSchema,
      annotations: writeAnnotations,
      execute: async (args, context) => {
        if (args.hold_minutes !== 15 || args.pickup_slot !== 'friday-16:00') {
          throw new TypeError('The documented demo hold requires 15 minutes and friday-16:00.')
        }
        await waitForAbortableCommit(context?.signal)
        const next = control.requestReservationReview(
          getExpectedRevision(args),
          15,
          'friday-16:00',
        )
        return structuredResult(
          `Review ${next.review?.id} created for the exact look. No hold exists, $0 is charged, and human approval is required.`,
          next.review,
        )
      },
    },
  ]
}

function defaultDocumentScope(): WebMcpDocumentScope | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as WebMcpDocumentScope
}

export async function registerFittingRoomTools(
  control: FittingRoomControl,
  documentScope: WebMcpDocumentScope | undefined = defaultDocumentScope(),
): Promise<FittingRoomToolsRegistration> {
  const modelContext = documentScope?.modelContext
  const supported = Boolean(
    modelContext &&
      typeof modelContext.registerTool === 'function' &&
      typeof modelContext.getTools === 'function',
  )
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
    registeredToolNames = new Set(
      tools
        .map((tool) => tool.name)
        .filter((name) => allFittingRoomToolNames.has(name)),
    )
  }

  const scheduleInventoryRefresh = () => {
    inventoryWork = inventoryWork.then(refreshInventory).catch(recordError)
  }
  const toolChangeListener: EventListener = () => scheduleInventoryRefresh()
  const enqueue = (task: () => Promise<void>) => {
    work = work.then(task).catch(recordError)
  }

  const createGrantTool = (
    grant: ReservationGrant,
    registrationController: AbortController,
  ): WebMcpTool => {
    let authorizationConsumed = false

    return {
      name: RESERVE_APPROVED_LOOK_TOOL_NAME,
      description:
        'Use the person-approved one-use capability to create the exact browser-local simulated hold. No product arguments can be changed and no payment is taken.',
      inputSchema: emptySchema,
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
      execute: async (_args, context) => {
        if (authorizationConsumed) {
          throw new Error('The one-use simulated reservation grant is not active.')
        }
        await waitForAbortableCommit(context?.signal)
        if (authorizationConsumed) {
          throw new Error('The one-use simulated reservation grant is not active.')
        }

        const next = control.reserveApprovedLook(grant.id)
        authorizationConsumed = true
        settlingGrantController = registrationController
        enqueue(async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
          registrationController.abort()
          if (grantController === registrationController) {
            grantController = null
            registeredGrantId = null
          }
          if (settlingGrantController === registrationController) {
            settlingGrantController = null
          }
          await refreshInventory()
        })

        return structuredResult(
          `Simulated hold ${next.reservation?.id} created for the exact approved look. It expires at ${next.reservation?.expiresAt}; $0 charged; authority consumed.`,
          next.reservation,
        )
      },
    }
  }

  const reconcileGrant = async (grant: ReservationGrant | null) => {
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
        await modelContext.registerTool(createGrantTool(grant, controller), {
          signal: controller.signal,
        })
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
      const currentInventoryWork = inventoryWork
      await Promise.all([currentWork, currentInventoryWork])
      if (currentWork === work && currentInventoryWork === inventoryWork) return
    }
  }

  const registration: FittingRoomToolsRegistration = {
    supported,
    permanentToolNames: permanentFittingRoomToolNames,
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
    createPermanentTools(control).map((tool) =>
      modelContext.registerTool(tool, { signal: permanentController.signal }),
    ),
  )
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') recordError(outcome.reason)
  }
  await refreshInventory().catch(recordError)

  unsubscribe = control.subscribe((nextSnapshot: FittingRoomSnapshot) => {
    enqueue(() => reconcileGrant(nextSnapshot.activeGrant))
  })
  enqueue(() => reconcileGrant(control.getSnapshot().activeGrant))
  await whenIdle()

  return registration
}
