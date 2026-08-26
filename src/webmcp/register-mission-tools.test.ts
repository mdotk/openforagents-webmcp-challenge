import { describe, expect, it } from 'vitest'
import { createMissionControl } from '../domain'
import type {
  WebMcpDocumentScope,
  WebMcpModelContext,
  WebMcpTool,
} from '../types'
import {
  permanentMissionToolNames,
  registerMissionTools,
} from './register-mission-tools'

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
    if (!this.abortInFlightOnUnregister) {
      return tool.execute(args, { signal })
    }

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

function repairAndRequest(control: ReturnType<typeof createMissionControl>) {
  control.restartCommunicationsRelay(0)
  control.recalibrateNavigationArray(1)
  return control.requestPowerReroute(2)
}

describe('registerMissionTools', () => {
  it('awaits all permanent registrations and exposes closed schemas', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })

    expect(registration.supported).toBe(true)
    expect(registration.permanentToolNames).toEqual(permanentMissionToolNames)
    expect(await registration.getRegisteredToolNames()).toEqual(
      [...permanentMissionToolNames].sort(),
    )
    expect(
      [...modelContext.tools.values()].every(
        (tool) => tool.inputSchema.additionalProperties === false,
      ),
    ).toBe(true)
    expect(modelContext.tools.has('launch')).toBe(false)

    await registration.dispose()
  })

  it('returns a terminal mission summary plus the complete structured state', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })

    const status = await modelContext.invoke('mission_status')

    expect(status.content).toEqual([
      {
        type: 'text',
        text: 'Mission status read successfully. Revision 0. Phase: checks. Launch ready: no. Communications relay: attention; Signal: Offline. Navigation array: attention; Alignment: +2.40°. Guidance power: attention; Available: 70 kW.',
      },
    ])
    expect(status.content[0]?.text).not.toMatch(/^\s*\{/)
    expect(status.structuredContent).toEqual(control.getSnapshot())

    await registration.dispose()
  })

  it('settles the one-use result before legacy unregister cancellation, then removes the tool', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext(true)
    const registration = await registerMissionTools(control, { modelContext })
    const requested = repairAndRequest(control)
    const approved = control.approvePowerReroute(requested.proposal?.id ?? '')
    await registration.whenIdle()

    expect(modelContext.tools.has('apply_power_reroute')).toBe(true)
    expect(await registration.getRegisteredToolNames()).toHaveLength(8)
    const applyTool = modelContext.tools.get('apply_power_reroute')
    expect(applyTool?.inputSchema).toEqual({
      type: 'object',
      properties: {
        grant_id: { type: 'string', const: approved.activeGrant?.id },
      },
      required: ['grant_id'],
      additionalProperties: false,
    })

    const applied = await modelContext.invoke('apply_power_reroute', {
      grant_id: approved.activeGrant?.id,
    })

    expect(JSON.parse(applied.content[0]?.text ?? '')).toMatchObject({
      applied: true,
      authorizationConsumed: true,
    })
    expect(control.getSnapshot().activeGrant).toBeNull()
    expect(control.getSnapshot().launchReady).toBe(true)
    expect(modelContext.tools.has('apply_power_reroute')).toBe(true)
    await expect(
      modelContext.invoke('apply_power_reroute', {
        grant_id: approved.activeGrant?.id,
      }),
    ).rejects.toThrow('not active')

    await registration.whenIdle()

    expect(modelContext.tools.has('apply_power_reroute')).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual(
      [...permanentMissionToolNames].sort(),
    )

    await registration.dispose()
  })

  it('does not consume the grant when invocation is aborted', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })
    const requested = repairAndRequest(control)
    const approved = control.approvePowerReroute(requested.proposal?.id ?? '')
    await registration.whenIdle()
    const invocation = new AbortController()

    const execution = modelContext.invoke(
      'apply_power_reroute',
      { grant_id: approved.activeGrant?.id },
      invocation.signal,
    )
    invocation.abort()

    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(control.getSnapshot().activeGrant?.id).toBe(approved.activeGrant?.id)
    expect(modelContext.tools.has('apply_power_reroute')).toBe(true)

    await registration.dispose()
  })

  it('does not run a permanent repair when invocation is aborted', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })
    const invocation = new AbortController()

    const execution = modelContext.invoke(
      'restart_comms_relay',
      { expected_revision: 0 },
      invocation.signal,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    invocation.abort()

    await expect(execution).rejects.toMatchObject({ name: 'AbortError' })
    expect(control.getSnapshot().revision).toBe(0)
    expect(control.getSnapshot().systems[0]?.status).toBe('attention')

    await registration.dispose()
  })

  it('removes the one-use tool when the human revokes the grant', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })
    const requested = repairAndRequest(control)
    const approved = control.approvePowerReroute(requested.proposal?.id ?? '')
    await registration.whenIdle()

    control.revokePowerReroute(approved.activeGrant?.id ?? '')
    await registration.whenIdle()

    expect(modelContext.tools.has('apply_power_reroute')).toBe(false)
    expect(control.getSnapshot().activeGrant).toBeNull()

    await registration.dispose()
  })

  it('removes every owned tool and listener on disposal', async () => {
    const control = createMissionControl()
    const modelContext = new FakeModelContext()
    const registration = await registerMissionTools(control, { modelContext })
    const requested = repairAndRequest(control)
    control.approvePowerReroute(requested.proposal?.id ?? '')
    await registration.whenIdle()

    await registration.dispose()

    expect(modelContext.tools.size).toBe(0)
    expect(modelContext.listeners.size).toBe(0)
    expect(await registration.getRegisteredToolNames()).toEqual([])
  })

  it('returns a safe unsupported registration without a model context', async () => {
    const control = createMissionControl()
    const documentScope: WebMcpDocumentScope = {}

    const registration = await registerMissionTools(control, documentScope)

    expect(registration.supported).toBe(false)
    expect(await registration.getRegisteredToolNames()).toEqual([])
    expect(registration.getLastError()).toBeNull()
    await registration.dispose()
  })
})
