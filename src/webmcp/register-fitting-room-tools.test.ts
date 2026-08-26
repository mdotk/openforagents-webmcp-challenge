import { describe, expect, it } from 'vitest'
import { createFittingRoomControl } from '../domain'
import type {
  WebMcpDocumentScope,
  WebMcpModelContext,
  WebMcpTool,
} from '../types'
import {
  permanentFittingRoomToolNames,
  registerFittingRoomTools,
  RESERVE_APPROVED_LOOK_TOOL_NAME,
} from './register-fitting-room-tools'

class FakeModelContext implements WebMcpModelContext {
  readonly tools = new Map<string, WebMcpTool>()
  readonly listeners = new Set<EventListenerOrEventListenerObject>()
  readonly registrationSignals = new Map<string, AbortSignal>()
  private readonly abortInFlightOnUnregister: boolean

  constructor(abortInFlightOnUnregister = false) {
    this.abortInFlightOnUnregister = abortInFlightOnUnregister
  }

  async registerTool(
    tool: WebMcpTool,
    options: { readonly signal: AbortSignal },
  ): Promise<void> {
    await Promise.resolve()
    if (options.signal.aborted) {
      throw new DOMException('Registration was cancelled.', 'AbortError')
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered.`)
    }
    this.tools.set(tool.name, tool)
    this.registrationSignals.set(tool.name, options.signal)
    options.signal.addEventListener(
      'abort',
      () => {
        this.registrationSignals.delete(tool.name)
        if (this.tools.delete(tool.name)) this.emitToolChange()
      },
      { once: true },
    )
    this.emitToolChange()
  }

  async getTools() {
    await Promise.resolve()
    return [...this.tools.values()].map(({ name }) => ({ name }))
  }

  addEventListener(
    type: 'toolchange',
    listener: EventListenerOrEventListenerObject,
  ) {
    if (type === 'toolchange') this.listeners.add(listener)
  }

  removeEventListener(
    type: 'toolchange',
    listener: EventListenerOrEventListenerObject,
  ) {
    if (type === 'toolchange') this.listeners.delete(listener)
  }

  async invoke(
    name: string,
    args: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Tool ${name} is not registered.`)
    if (!this.abortInFlightOnUnregister) return tool.execute(args, { signal })

    const registrationSignal = this.registrationSignals.get(name)
    return new Promise<Awaited<ReturnType<WebMcpTool['execute']>>>((resolve, reject) => {
      const cleanup = () => registrationSignal?.removeEventListener('abort', onAbort)
      const onAbort = () => {
        cleanup()
        reject(
          new DOMException(
            'In-flight execution was cancelled when the tool was unregistered.',
            'AbortError',
          ),
        )
      }
      registrationSignal?.addEventListener('abort', onAbort, { once: true })
      Promise.resolve()
        .then(() => tool.execute(args, { signal }))
        .then(
          (value) => {
            cleanup()
            resolve(value)
          },
          (error: unknown) => {
            cleanup()
            reject(error)
          },
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

function approveFinalLook(control: ReturnType<typeof createFittingRoomControl>) {
  control.updateFittingRoom(0, ['FV-101', 'FV-206', 'FV-304'], [])
  control.setHumanLock(1, 'FV-101', true)
  control.updateFittingRoom(2, ['FV-207', 'FV-408'], ['FV-206'])
  control.applyDemoInventoryUpdate(3)
  control.updateFittingRoom(4, ['FV-409'], ['FV-408'])
  control.requestReservationReview(5, 15, 'friday-16:00')
  return control.approveReservationReview('review-001')
}

describe('registerFittingRoomTools', () => {
  it('registers exactly seven permanent closed-schema tools and no checkout tool', async () => {
    const control = createFittingRoomControl()
    const modelContext = new FakeModelContext()
    const registration = await registerFittingRoomTools(control, { modelContext })

    expect(registration.supported).toBe(true)
    expect(await registration.getRegisteredToolNames()).toEqual(
      [...permanentFittingRoomToolNames].sort(),
    )
    expect(modelContext.tools).toHaveLength(7)
    expect(
      [...modelContext.tools.values()].every(
        (tool) => tool.inputSchema.additionalProperties === false,
      ),
    ).toBe(true)
    expect([...modelContext.tools.keys()].join(' ')).not.toMatch(
      /checkout|payment|order/,
    )

    await registration.dispose()
  })

  it('returns useful terminal summaries and structured retailer facts', async () => {
    const control = createFittingRoomControl()
    const modelContext = new FakeModelContext()
    const registration = await registerFittingRoomTools(control, { modelContext })

    const context = await modelContext.invoke('read_shopper_context')
    expect(context.content[0]?.text).toContain('black boots already owned')
    expect(context.structuredContent).toEqual(control.getSnapshot().shopper)

    const search = await modelContext.invoke('search_products', {
      categories: ['layer'],
      colors: ['black'],
      style_tags: ['dramatic'],
      size: 'M',
      pickup_on: '2026-10-30',
      excluded_contact_zones: ['neck'],
      minimum_movement: 'high',
      limit: 12,
    })
    expect(search.content[0]?.text).toContain('2 matching fictional products')
    expect(search.structuredContent).toMatchObject({
      availabilityRevision: 1,
      matches: [{ id: 'FV-408' }, { id: 'FV-409' }],
    })

    const room = await modelContext.invoke('read_fitting_room')
    expect(room.content[0]?.text).toContain('do not repeat the read')
    expect(room.structuredContent).toEqual(control.getSnapshot())

    await registration.dispose()
  })

  it('discovers the exact temporary tool, settles one hold, then returns to seven', async () => {
    const control = createFittingRoomControl()
    const modelContext = new FakeModelContext(true)
    const registration = await registerFittingRoomTools(control, { modelContext })

    const approved = approveFinalLook(control)
    await registration.whenIdle()

    expect(approved.activeGrant?.id).toBe('reservation-grant-001')
    expect(await registration.getRegisteredToolNames()).toHaveLength(8)
    expect(modelContext.tools.get(RESERVE_APPROVED_LOOK_TOOL_NAME)?.inputSchema).toEqual({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    })

    const result = await modelContext.invoke(RESERVE_APPROVED_LOOK_TOOL_NAME)
    expect(result.content[0]?.text).toContain('FF-DEMO-001')
    expect(result.content[0]?.text).toContain('$0 charged')
    expect(result.structuredContent).toMatchObject({
      id: 'FF-DEMO-001',
      authorityConsumed: true,
    })
    expect(modelContext.tools.has(RESERVE_APPROVED_LOOK_TOOL_NAME)).toBe(true)
    await expect(
      modelContext.invoke(RESERVE_APPROVED_LOOK_TOOL_NAME),
    ).rejects.toThrow('not active')

    await registration.whenIdle()
    expect(modelContext.tools.has(RESERVE_APPROVED_LOOK_TOOL_NAME)).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual(
      [...permanentFittingRoomToolNames].sort(),
    )

    await registration.dispose()
  })

  it('does not create a hold when temporary execution is cancelled before commit', async () => {
    const control = createFittingRoomControl()
    const modelContext = new FakeModelContext()
    const registration = await registerFittingRoomTools(control, { modelContext })
    approveFinalLook(control)
    await registration.whenIdle()
    const invocation = new AbortController()

    const execution = modelContext.invoke(
      RESERVE_APPROVED_LOOK_TOOL_NAME,
      {},
      invocation.signal,
    )
    invocation.abort()

    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(control.getSnapshot().reservation).toBeNull()
    expect(control.getSnapshot().activeGrant).not.toBeNull()
    expect(modelContext.tools.has(RESERVE_APPROVED_LOOK_TOOL_NAME)).toBe(true)

    await registration.dispose()
  })

  it('removes the temporary tool on human revocation and every tool on disposal', async () => {
    const control = createFittingRoomControl()
    const modelContext = new FakeModelContext()
    const registration = await registerFittingRoomTools(control, { modelContext })
    const approved = approveFinalLook(control)
    await registration.whenIdle()

    control.revokeReservationGrant(approved.activeGrant?.id ?? '')
    await registration.whenIdle()
    expect(modelContext.tools.has(RESERVE_APPROVED_LOOK_TOOL_NAME)).toBe(false)
    expect(modelContext.tools.size).toBe(7)

    await registration.dispose()
    expect(modelContext.tools.size).toBe(0)
    expect(modelContext.listeners.size).toBe(0)
  })

  it('returns a safe unsupported registration without a model context', async () => {
    const control = createFittingRoomControl()
    const documentScope: WebMcpDocumentScope = {}
    const registration = await registerFittingRoomTools(control, documentScope)

    expect(registration.supported).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual([])
    await registration.dispose()
  })
})
