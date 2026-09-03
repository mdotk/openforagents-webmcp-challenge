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

async function prepareReview(model: FakeModelContext, control: ReturnType<typeof createWorldlineControl>) {
  await model.invoke('read_mission_state')
  await model.invoke('inspect_science_packets')
  await model.invoke('inspect_maneuver_window')
  const escape = await model.invoke('simulate_worldline', {
    expected_revision: 0,
    burn_at_probe_second: 40,
    delta_v_mps: 3500,
    packet_ids: [],
    hypothesis: 'An early, powerful burn may let the probe escape.',
    expected_outcome: 'probe_return',
    test_role: 'extreme',
  })
  expect(escape.structuredContent).toMatchObject({ probeSurvives: true, discoveryDelivered: false })
  const discovery = await model.invoke('simulate_worldline', {
    expected_revision: 1,
    burn_at_probe_second: 46,
    delta_v_mps: 2200,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'An Earth-lock burn may deliver both unique packets.',
    expected_outcome: 'science_transmission',
    test_role: 'extreme',
  })
  expect(discovery.structuredContent).toMatchObject({ probeSurvives: false, discoveryDelivered: true })
  await model.invoke('present_learning_checkpoint', { expected_revision: 2 })
  control.selectLearnerTransmissionEstimate(25, 3)
  control.selectLearnerPrediction('combination', 4)
  await model.invoke('simulate_worldline', {
    expected_revision: 5,
    burn_at_probe_second: 43,
    delta_v_mps: 2800,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'A middle burn may save both.',
    expected_outcome: 'probe_return',
    test_role: 'compromise',
  })
  await model.invoke('simulate_worldline', {
    expected_revision: 6,
    burn_at_probe_second: 44,
    delta_v_mps: 3400,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'Moving the escape burn into the signal window may preserve both.',
    expected_outcome: 'probe_return',
    test_role: 'counterexample',
  })
  await model.invoke('present_worldline_choices', {
    expected_revision: 7,
    option_a_simulation_id: 'worldline-01',
    option_b_simulation_id: 'worldline-02',
    recommended_simulation_id: 'worldline-02',
    recommendation_rationale: 'Both unique packets fit inside the remaining contact window.',
    prediction_assessment: 'correct',
    teaching_explanation: 'The allowed burn times, speed changes and antenna direction cannot all be satisfied by one burn.',
  })
}

describe('registerWorldlineTools', () => {
  it('registers six closed-schema tools without an execution shortcut', async () => {
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(createWorldlineControl(), { modelContext: model })

    expect(await registration.getRegisteredToolNames()).toEqual([...initialWorldlineToolNames].sort())
    expect(model.tools).toHaveLength(6)
    expect([...model.tools.values()].every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)
    expect(model.tools.has(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).toBe(false)
    expect([...model.tools.keys()].join(' ')).not.toMatch(/recommend|approve|execute/)
    await registration.dispose()
  })

  it('carries the three short handoffs in phase-aware tool results', async () => {
    const control = createWorldlineControl()
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(control, { modelContext: model })

    const opening = await model.invoke('read_mission_state')
    expect(opening.structuredContent).toMatchObject({
      phase: 'investigating_extremes',
      guidance: {
        command: 'Begin WORLDLINE.',
        permittedNextActions: expect.arrayContaining([
          expect.stringMatching(/inspect the three files/i),
          expect.stringMatching(/present_learning_checkpoint/i),
        ]),
      },
    })

    await model.invoke('simulate_worldline', {
      expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
      hypothesis: 'An early, powerful burn may let the probe escape.', expected_outcome: 'probe_return', test_role: 'extreme',
    })
    await model.invoke('simulate_worldline', {
      expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'A later Earth-lock burn may send both discoveries.', expected_outcome: 'science_transmission', test_role: 'extreme',
    })
    const checkpoint = await model.invoke('present_learning_checkpoint', { expected_revision: 2 })
    expect(checkpoint.structuredContent).toMatchObject({ resumeInstruction: 'Test my prediction.' })

    const waiting = await model.invoke('read_mission_state')
    expect(waiting.structuredContent).toMatchObject({
      phase: 'prediction',
      learnerCalculation: null,
      guidance: { objective: expect.stringMatching(/first calculate the sending time/i) },
    })
    control.selectLearnerTransmissionEstimate(25, 3)
    control.selectLearnerPrediction('combination', 4)
    const prediction = await model.invoke('read_mission_state')
    expect(prediction.structuredContent).toMatchObject({
      phase: 'investigating_prediction',
      learnerPrediction: { id: 'combination' },
      guidance: {
        command: 'Test my prediction.',
        recommendationRule: expect.stringMatching(/recommend sending the gravity map and light spectrum/i),
        permittedNextActions: expect.arrayContaining([
          expect.stringMatching(/test_role compromise/i),
          expect.stringMatching(/test_role counterexample/i),
        ]),
      },
    })
    await registration.dispose()
  })

  it('exposes the exact 6 to 7 to 2 lifecycle and rejects replay', async () => {
    const control = createWorldlineControl()
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(control, { modelContext: model })
    await prepareReview(model, control)
    await registration.whenIdle()

    expect(model.tools).toHaveLength(6)
    expect(model.tools.has(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).toBe(false)
    control.approveBurnReview('burn-review-01', 'worldline-02')
    await registration.whenIdle()
    expect(await registration.getRegisteredToolNames()).toHaveLength(7)
    expect(model.tools.get(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)?.inputSchema).toEqual(emptySchemaForTest())
    expect(model.tools.get(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)?.description).toContain('Carry out my choice')

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
    await prepareReview(model, control)
    control.approveBurnReview('burn-review-01', 'worldline-02')
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
      hypothesis: 'An early, powerful burn may let the probe escape.',
      expected_outcome: 'probe_return',
      test_role: 'extreme',
    })

    expect(activity).toEqual([
      'Agent checked the three files',
      'Test complete · the probe can escape, but Earth receives no files',
    ])
    await registration.dispose()
  })

  it('gives the agent the maneuver evidence and a bounded stopping signal', async () => {
    const model = new FakeModelContext()
    const control = createWorldlineControl()
    const registration = await registerWorldlineTools(control, { modelContext: model })
    const window = await model.invoke('inspect_maneuver_window')
    expect(window.structuredContent).toMatchObject({
      contactEndsAtProbeSecond: 71,
      distanceFromEarthLightYears: 23,
      signalTravelYears: 23,
      propulsionTelemetry: {
        escapeBurnEffectiveThroughProbeSecond: 42,
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
      hypothesis: 'An early, powerful burn may let the probe escape.',
      expected_outcome: 'probe_return',
      test_role: 'extreme',
    })
    await model.invoke('simulate_worldline', {
      expected_revision: 1,
      burn_at_probe_second: 46,
      delta_v_mps: 2200,
      packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'An Earth-lock burn may deliver both unique packets.',
      expected_outcome: 'science_transmission',
      test_role: 'extreme',
    })
    await model.invoke('present_learning_checkpoint', { expected_revision: 2 })
    control.selectLearnerTransmissionEstimate(25, 3)
    control.selectLearnerPrediction('combination', 4)
    await model.invoke('simulate_worldline', {
      expected_revision: 5,
      burn_at_probe_second: 43,
      delta_v_mps: 2800,
      packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'A middle burn may save both.',
      expected_outcome: 'probe_return',
      test_role: 'compromise',
    })
    const final = await model.invoke('simulate_worldline', {
      expected_revision: 6,
      burn_at_probe_second: 44,
      delta_v_mps: 3400,
      packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'Moving the escape burn into the signal window may preserve both.',
      expected_outcome: 'probe_return',
      test_role: 'counterexample',
    })
    expect(final.content[0]?.text).toContain('The middle option and the different test that challenged the person’s prediction are complete.')
    expect(final.structuredContent).toMatchObject({ investigationComplete: true, remainingAttempts: 1 })
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
      'test_role',
    ])
    expect(model.tools.get('present_worldline_choices')?.inputSchema.required).toEqual([
      'expected_revision',
      'option_a_simulation_id',
      'option_b_simulation_id',
      'recommended_simulation_id',
      'recommendation_rationale',
      'prediction_assessment',
      'teaching_explanation',
    ])
    await registration.dispose()
  })
})

function emptySchemaForTest() {
  return { type: 'object', properties: {}, required: [], additionalProperties: false }
}
