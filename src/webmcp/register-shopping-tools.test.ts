import { describe, expect, it } from 'vitest'
import { createShoppingControl } from '../domain'
import type {
  ShoppingControl,
  WebMcpDocumentScope,
  WebMcpModelContext,
  WebMcpTool,
} from '../types'
import {
  APPLY_APPROVED_CART_TOOL_NAME,
  permanentShoppingToolNames,
  registerShoppingTools,
} from './register-shopping-tools'

class FakeModelContext implements WebMcpModelContext {
  readonly tools = new Map<string, WebMcpTool>()
  readonly listeners = new Set<EventListenerOrEventListenerObject>()
  readonly registrationSignals = new Map<string, AbortSignal>()
  private readonly abortInFlightOnUnregister: boolean
  private readonly rejectedRegistrationName: string | null

  constructor(abortInFlightOnUnregister = false, rejectedRegistrationName: string | null = null) {
    this.abortInFlightOnUnregister = abortInFlightOnUnregister
    this.rejectedRegistrationName = rejectedRegistrationName
  }

  async registerTool(tool: WebMcpTool, options: { readonly signal: AbortSignal }) {
    await Promise.resolve()
    if (options.signal.aborted) throw new DOMException('Registration was cancelled.', 'AbortError')
    if (tool.name === this.rejectedRegistrationName) throw new Error(`Registration rejected for ${tool.name}.`)
    if (this.tools.has(tool.name)) throw new Error(`Tool ${tool.name} is already registered.`)
    this.tools.set(tool.name, tool)
    this.registrationSignals.set(tool.name, options.signal)
    options.signal.addEventListener('abort', () => {
      this.registrationSignals.delete(tool.name)
      if (this.tools.delete(tool.name)) this.emitToolChange()
    }, { once: true })
    this.emitToolChange()
  }

  async getTools() {
    await Promise.resolve()
    return [...this.tools.values()].map(({ name }) => ({ name }))
  }

  addEventListener(type: 'toolchange', listener: EventListenerOrEventListenerObject) {
    if (type === 'toolchange') this.listeners.add(listener)
  }

  removeEventListener(type: 'toolchange', listener: EventListenerOrEventListenerObject) {
    if (type === 'toolchange') this.listeners.delete(listener)
  }

  async invoke(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Tool ${name} is not registered.`)
    if (!this.abortInFlightOnUnregister) return tool.execute(args, { signal })
    const registrationSignal = this.registrationSignals.get(name)
    return new Promise<Awaited<ReturnType<WebMcpTool['execute']>>>((resolve, reject) => {
      const cleanup = () => registrationSignal?.removeEventListener('abort', onAbort)
      const onAbort = () => {
        cleanup()
        reject(new DOMException('In-flight execution was cancelled when the tool was unregistered.', 'AbortError'))
      }
      registrationSignal?.addEventListener('abort', onAbort, { once: true })
      Promise.resolve().then(() => tool.execute(args, { signal })).then(
        (value) => { cleanup(); resolve(value) },
        (error: unknown) => { cleanup(); reject(error) },
      )
    })
  }

  private emitToolChange() {
    const event = new Event('toolchange')
    for (const listener of this.listeners) {
      if (typeof listener === 'function') listener(event)
      else listener.handleEvent(event)
    }
  }
}

const firstLook = [
  'variant-midnight-column-dress-m',
  'variant-silver-cropped-blazer-m',
  'variant-graphite-frame-bag-one',
  'variant-silver-chain-belt-one',
] as const

const hotelLook = [
  'variant-midnight-column-dress-m',
  'variant-ink-sculpted-jacket-m',
  'variant-ink-slim-clutch-one',
  'variant-silver-chain-belt-one',
] as const

function expectSuccess<T>(result: { ok: boolean; data?: T }): T {
  if (!result.ok || result.data === undefined) throw new Error('Expected success')
  return result.data
}

function approveHotelLook(control: ShoppingControl) {
  expectSuccess(control.updateSharedLook(0, firstLook, []))
  control.setDestination('event-hotel')
  expectSuccess(control.updateSharedLook(2, hotelLook.slice(1, 3), firstLook.slice(1, 3)))
  const snapshot = control.getSnapshot()
  const quotes = expectSuccess(control.checkFulfilment(hotelLook, 'event-hotel', '2026-09-04')).quotes
  const reviewed = expectSuccess(control.requestCartReview({
    expectedRevision: snapshot.revision,
    lookRevision: snapshot.lookRevision,
    cartRevision: snapshot.cartRevision,
    quoteIds: quotes.map((quote) => quote.quoteId),
    summary: 'Hotel-ready and under budget.',
    rationales: hotelLook.map((variantId) => ({ variantId, reason: 'Fits the confirmed brief and current delivery facts.' })),
  }))
  return control.approveCartReview(reviewed.review?.id ?? '')
}

describe('registerShoppingTools', () => {
  it('registers exactly seven permanent closed-schema tools with no approval or checkout tool', async () => {
    const control = createShoppingControl()
    const modelContext = new FakeModelContext()
    const registration = await registerShoppingTools(control, { modelContext })

    expect(registration.supported).toBe(true)
    expect(await registration.getRegisteredToolNames()).toEqual([...permanentShoppingToolNames].sort())
    expect(modelContext.tools).toHaveLength(7)
    expect([...modelContext.tools.values()].every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect([...modelContext.tools.keys()].join(' ')).not.toMatch(/approve|checkout|payment|order/)

    await registration.dispose()
  })

  it('returns bounded retailer facts, typed delivery conflict and no grant secret', async () => {
    const control = createShoppingControl()
    const modelContext = new FakeModelContext()
    const registration = await registerShoppingTools(control, { modelContext })

    const context = await modelContext.invoke('read_shopper_context')
    expect(context.content[0]?.text).toContain('owned cobalt-blue boots')
    expect(context.structuredContent).toMatchObject({ context: { budgetCents: 35000, destinationId: 'home' } })

    const search = await modelContext.invoke('search_products', {
      categories: ['layer'],
      style_tags: ['sharp'],
      sizes: ['M'],
      max_item_price_cents: 12000,
      limit: 12,
    })
    expect(search.content[0]?.text).toContain('2 of 2')
    expect(search.structuredContent).toMatchObject({ matches: [{ id: 'product-silver-cropped-blazer' }, { id: 'product-ink-sculpted-jacket' }] })

    control.setDestination('event-hotel')
    const conflict = await modelContext.invoke('check_fulfilment', {
      variant_ids: ['variant-silver-cropped-blazer-m'],
      destination_id: 'event-hotel',
      needed_by: '2026-09-04',
    })
    expect(conflict.content[0]?.text).toContain('DELIVERY_CHANGED')
    expect(conflict.structuredContent).toMatchObject({ ok: false, stateChanged: false, error: { code: 'DELIVERY_CHANGED' } })

    const shared = await modelContext.invoke('read_shared_look')
    expect(shared.content[0]?.text).toContain('do not repeat the read')
    expect(shared.structuredContent).toMatchObject({ temporaryCartCapabilityActive: false, productCount: 12, variantCount: 30 })
    expect(shared.structuredContent).not.toHaveProperty('activeGrant')

    await registration.dispose()
  })

  it('discovers the one-use cart tool after approval, settles once, then returns to seven', async () => {
    const control = createShoppingControl({ now: () => new Date(Date.now() + 60_000) })
    const modelContext = new FakeModelContext(true)
    const registration = await registerShoppingTools(control, { modelContext })
    const approved = approveHotelLook(control)
    await registration.whenIdle()

    expect(approved.activeGrant?.id).toBe('cart-grant-001')
    expect(await registration.getRegisteredToolNames()).toHaveLength(8)
    expect(modelContext.tools.get(APPLY_APPROVED_CART_TOOL_NAME)?.inputSchema).toEqual({ type: 'object', properties: {}, required: [], additionalProperties: false })

    const applied = await modelContext.invoke(APPLY_APPROVED_CART_TOOL_NAME)
    expect(applied.content[0]?.text).toContain('$345.00')
    expect(applied.content[0]?.text).toContain('authority consumed')
    expect(applied.structuredContent).toMatchObject({ ok: true, authorityConsumed: true, data: { cart: { subtotalCents: 34500 }, activeGrant: null } })
    expect(control.getSnapshot().cart.lines).toHaveLength(4)

    await registration.whenIdle()
    expect(modelContext.tools.has(APPLY_APPROVED_CART_TOOL_NAME)).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual([...permanentShoppingToolNames].sort())
    await registration.dispose()
  })

  it('leaves the cart and authority untouched when temporary execution is cancelled before commit', async () => {
    const control = createShoppingControl({ now: () => new Date(Date.now() + 60_000) })
    const modelContext = new FakeModelContext()
    const registration = await registerShoppingTools(control, { modelContext })
    approveHotelLook(control)
    await registration.whenIdle()
    const invocation = new AbortController()

    const execution = modelContext.invoke(APPLY_APPROVED_CART_TOOL_NAME, {}, invocation.signal)
    invocation.abort()
    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(control.getSnapshot().cart.lines).toEqual([])
    expect(control.getSnapshot().activeGrant).not.toBeNull()
    expect(modelContext.tools.has(APPLY_APPROVED_CART_TOOL_NAME)).toBe(true)

    await registration.dispose()
  })

  it('settles the committed cart result even if cancellation arrives after commit', async () => {
    const control = createShoppingControl({ now: () => new Date(Date.now() + 60_000) })
    const modelContext = new FakeModelContext()
    const registration = await registerShoppingTools(control, { modelContext })
    approveHotelLook(control)
    await registration.whenIdle()
    const invocation = new AbortController()

    const execution = modelContext.invoke(APPLY_APPROVED_CART_TOOL_NAME, {}, invocation.signal)
    setTimeout(() => invocation.abort(), 100)
    const result = await execution

    expect(result.structuredContent).toMatchObject({ ok: true, authorityConsumed: true })
    expect(control.getSnapshot()).toMatchObject({ cartRevision: 1, cart: { subtotalCents: 34500 }, activeGrant: null })
    await registration.whenIdle()
    expect(modelContext.tools.has(APPLY_APPROVED_CART_TOOL_NAME)).toBe(false)
    await registration.dispose()
  })

  it('retains revocable authority and an empty cart when temporary registration fails', async () => {
    const control = createShoppingControl({ now: () => new Date(Date.now() + 60_000) })
    const modelContext = new FakeModelContext(false, APPLY_APPROVED_CART_TOOL_NAME)
    const registration = await registerShoppingTools(control, { modelContext })
    const approved = approveHotelLook(control)
    await registration.whenIdle()

    expect(registration.getLastError()?.message).toContain('Registration rejected')
    expect(modelContext.tools.has(APPLY_APPROVED_CART_TOOL_NAME)).toBe(false)
    expect(control.getSnapshot()).toMatchObject({ activeGrant: { id: approved.activeGrant?.id }, cart: { lines: [] } })

    control.revokeCartGrant(approved.activeGrant?.id ?? '')
    await registration.whenIdle()
    expect(control.getSnapshot()).toMatchObject({ activeGrant: null, review: { status: 'revoked' }, cart: { lines: [] } })
    await registration.dispose()
  })

  it('removes the temporary tool on revocation and all tools on disposal', async () => {
    const control = createShoppingControl({ now: () => new Date(Date.now() + 60_000) })
    const modelContext = new FakeModelContext()
    const registration = await registerShoppingTools(control, { modelContext })
    const approved = approveHotelLook(control)
    await registration.whenIdle()

    control.revokeCartGrant(approved.activeGrant?.id ?? '')
    await registration.whenIdle()
    expect(modelContext.tools.has(APPLY_APPROVED_CART_TOOL_NAME)).toBe(false)
    expect(modelContext.tools).toHaveLength(7)

    await registration.dispose()
    expect(modelContext.tools).toHaveLength(0)
    expect(modelContext.listeners).toHaveLength(0)
  })

  it('returns a safe unsupported registration without document.modelContext', async () => {
    const control = createShoppingControl()
    const documentScope: WebMcpDocumentScope = {}
    const registration = await registerShoppingTools(control, documentScope)
    expect(registration.supported).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual([])
    await registration.dispose()
  })
})
