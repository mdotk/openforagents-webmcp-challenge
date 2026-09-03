import { describe, expect, it } from 'vitest'
import { createWorldlineControl } from '../domain'
import type { WebMcpModelContext, WebMcpTool } from '../types'
import {
  EXECUTE_AUTHORIZED_BURN_TOOL_NAME,
  finalWorldlineToolNames,
  initialWorldlineToolNames,
  registerWorldlineTools,
} from './register-worldline-tools'

class FakeModelContext implements WebMcpModelContext {
  readonly tools = new Map<string, WebMcpTool>()

  async registerTool(tool: WebMcpTool, options: { readonly signal: AbortSignal }) {
    if (this.tools.has(tool.name)) throw new Error(`Tool ${tool.name} is already registered.`)
    this.tools.set(tool.name, tool)
    options.signal.addEventListener('abort', () => this.tools.delete(tool.name), { once: true })
  }

  async getTools() {
    return [...this.tools.keys()].map((name) => ({ name }))
  }

  async invoke(name: string, args: Record<string, unknown> = {}) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Tool ${name} is not registered.`)
    const response = await tool.execute(args)
    if (!this.tools.has(name)) {
      throw new Error(`Tool ${name} was unregistered before its result was delivered.`)
    }
    return response
  }
}

async function prepareReview(model: FakeModelContext) {
  await model.invoke('read_mission_state')
  await model.invoke('inspect_science_packets')
  await model.invoke('inspect_maneuver_window')
  const escape = await model.invoke('simulate_worldline', {
    expected_revision: 0,
    burn_at_probe_second: 40,
    delta_v_mps: 3500,
    packet_ids: [],
    hypothesis: 'An early high-energy burn may return the probe.',
    expected_outcome: 'probe_return',
  })
  expect(escape.structuredContent).toMatchObject({ probeSurvives: true, discoveryDelivered: false })
  await model.invoke('simulate_worldline', {
    expected_revision: 1,
    burn_at_probe_second: 55,
    delta_v_mps: 2600,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'A later compromise burn may preserve both the probe and its unique packets.',
    expected_outcome: 'probe_return',
  })
  const discovery = await model.invoke('simulate_worldline', {
    expected_revision: 2,
    burn_at_probe_second: 46,
    delta_v_mps: 2200,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'An Earth-lock burn may deliver both unique packets.',
    expected_outcome: 'science_transmission',
  })
  expect(discovery.structuredContent).toMatchObject({ probeSurvives: false, discoveryDelivered: true })
  await model.invoke('present_worldline_choices', {
    expected_revision: 3,
    option_a_simulation_id: 'worldline-01',
    option_b_simulation_id: 'worldline-03',
    recommended_simulation_id: 'worldline-03',
    recommendation_rationale: 'Both unique packets fit inside the remaining contact window.',
  })
}

describe('registerWorldlineTools', () => {
  it('registers five closed-schema tools without an execution shortcut', async () => {
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(createWorldlineControl(), { modelContext: model })

    expect(await registration.getRegisteredToolNames()).toEqual([...initialWorldlineToolNames].sort())
    expect(model.tools).toHaveLength(5)
    expect([...model.tools.values()].every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(model.tools.has(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).toBe(false)
    expect([...model.tools.keys()].join(' ')).not.toMatch(/recommend|approve|execute/)
    await registration.dispose()
  })

  it('exposes the exact 5 to 6 to 2 lifecycle and rejects replay', async () => {
    const control = createWorldlineControl()
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(control, { modelContext: model })
    await prepareReview(model)
    await registration.whenIdle()

    expect(model.tools).toHaveLength(5)
    expect(model.tools.has(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).toBe(false)
    control.approveBurnReview('burn-review-01', 'worldline-03')
    await registration.whenIdle()
    expect(await registration.getRegisteredToolNames()).toHaveLength(6)
    expect(model.tools.get(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)?.inputSchema).toEqual(emptySchemaForTest())

    const execution = await model.invoke(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)
    expect(execution.structuredContent).toMatchObject({ authorityConsumed: true, receipt: { verified: true, earthArrivalYears: 23 } })
    await registration.whenIdle()
    expect(await registration.getRegisteredToolNames()).toEqual([...finalWorldlineToolNames].sort())
    expect(model.tools).toHaveLength(2)
    await expect(model.invoke(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).rejects.toThrow('not registered')
    await registration.dispose()
  })

  it('does not expose a grant secret through mission reads', async () => {
    const control = createWorldlineControl()
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(control, { modelContext: model })
    await prepareReview(model)
    control.approveBurnReview('burn-review-01', 'worldline-03')
    await registration.whenIdle()
    const state = await model.invoke('read_mission_state')

    expect(JSON.stringify(state.structuredContent)).not.toContain('burn-grant-01')
    expect(state.structuredContent).toMatchObject({ temporaryBurnCapabilityActive: true })
    expect(model.tools.get(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)?.inputSchema.required).toEqual([])
    await registration.dispose()
  })

  it('reports factual tool activity for the shared visible scene', async () => {
    const model = new FakeModelContext()
    const activity: string[] = []
    const registration = await registerWorldlineTools(
      createWorldlineControl(),
      { modelContext: model },
      (message) => activity.push(message),
    )

    await model.invoke('inspect_science_packets')
    await model.invoke('simulate_worldline', {
      expected_revision: 0,
      burn_at_probe_second: 40,
      delta_v_mps: 3500,
      packet_ids: [],
      hypothesis: 'An early high-energy burn may return the probe.',
      expected_outcome: 'probe_return',
    })

    expect(activity).toEqual([
      'Three science packets inspected',
      'Hypothesis confirmed · probe returns',
    ])
    await registration.dispose()
  })

  it('gives the agent the maneuver evidence and a bounded stopping signal', async () => {
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(createWorldlineControl(), { modelContext: model })
    const window = await model.invoke('inspect_maneuver_window')
    expect(window.structuredContent).toMatchObject({
      contactEndsAtProbeSecond: 71,
      propulsionTelemetry: {
        escapeThrustEffectiveThroughProbeSecond: 42,
        minimumEscapeDeltaVMetersPerSecond: 3400,
      },
      antennaTelemetry: {
        stableEarthLockProbeSeconds: [44, 50],
        lockPreservingDeltaVMetersPerSecond: [2000, 2400],
      },
    })

    await model.invoke('simulate_worldline', {
      expected_revision: 0,
      burn_at_probe_second: 40,
      delta_v_mps: 3500,
      packet_ids: [],
      hypothesis: 'An early high-energy burn may return the probe.',
      expected_outcome: 'probe_return',
    })
    await model.invoke('simulate_worldline', {
      expected_revision: 1,
      burn_at_probe_second: 55,
      delta_v_mps: 2600,
      packet_ids: [],
      hypothesis: 'A late compromise may still recover the probe.',
      expected_outcome: 'probe_return',
    })
    const final = await model.invoke('simulate_worldline', {
      expected_revision: 2,
      burn_at_probe_second: 46,
      delta_v_mps: 2200,
      packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'An Earth-lock burn may deliver both unique packets.',
      expected_outcome: 'science_transmission',
    })
    expect(final.content[0]?.text).toContain('Present the alternatives with one recommendation tied to the person’s priority; do not simulate again.')
    expect(final.structuredContent).toMatchObject({ investigationComplete: true, remainingAttempts: 2 })
    await registration.dispose()
  })

  it('requires an explicit hypothesis and recommendation in the WebMCP contract', async () => {
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(createWorldlineControl(), { modelContext: model })

    expect(model.tools.get('simulate_worldline')?.inputSchema.required).toEqual([
      'expected_revision',
      'burn_at_probe_second',
      'delta_v_mps',
      'packet_ids',
      'hypothesis',
      'expected_outcome',
    ])
    expect(model.tools.get('present_worldline_choices')?.inputSchema.required).toEqual([
      'expected_revision',
      'option_a_simulation_id',
      'option_b_simulation_id',
      'recommended_simulation_id',
      'recommendation_rationale',
    ])
    await registration.dispose()
  })
})

function emptySchemaForTest() {
  return { type: 'object', properties: {}, required: [], additionalProperties: false }
}
