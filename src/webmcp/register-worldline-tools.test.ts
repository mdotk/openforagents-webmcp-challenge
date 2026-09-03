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
    return tool.execute(args)
  }
}

async function prepareReview(model: FakeModelContext) {
  await model.invoke('read_mission_state')
  await model.invoke('inspect_science_packets')
  await model.invoke('read_signal_window')
  const escape = await model.invoke('simulate_worldline', {
    expected_revision: 0,
    burn_at_probe_second: 40,
    delta_v_mps: 3500,
    packet_ids: [],
  })
  expect(escape.structuredContent).toMatchObject({ probeSurvives: true, discoveryDelivered: false })
  const discovery = await model.invoke('simulate_worldline', {
    expected_revision: 1,
    burn_at_probe_second: 46,
    delta_v_mps: 2200,
    packet_ids: ['gravity-map', 'horizon-spectrum'],
  })
  expect(discovery.structuredContent).toMatchObject({ probeSurvives: false, discoveryDelivered: true })
  await model.invoke('update_shared_plan', {
    expected_revision: 2,
    simulation_id: 'worldline-02',
    title: 'Send the discovery home',
    rationale: 'The two unique packets fit the final signal window.',
  })
  await model.invoke('request_burn_review', {
    expected_revision: 3,
    plan_id: 'shared-plan-01',
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
    expect([...model.tools.keys()].join(' ')).not.toMatch(/recommend|choose|approve/)
    await registration.dispose()
  })

  it('exposes the exact 6 to 7 to 2 lifecycle and rejects replay', async () => {
    const control = createWorldlineControl()
    const model = new FakeModelContext()
    const registration = await registerWorldlineTools(control, { modelContext: model })
    await prepareReview(model)
    await registration.whenIdle()

    expect(model.tools).toHaveLength(6)
    expect(model.tools.has(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)).toBe(false)
    control.approveBurnReview('burn-review-01')
    await registration.whenIdle()
    expect(await registration.getRegisteredToolNames()).toHaveLength(7)
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
    control.approveBurnReview('burn-review-01')
    await registration.whenIdle()
    const state = await model.invoke('read_mission_state')

    expect(JSON.stringify(state.structuredContent)).not.toContain('burn-grant-01')
    expect(state.structuredContent).toMatchObject({ temporaryBurnCapabilityActive: true })
    expect(model.tools.get(EXECUTE_AUTHORIZED_BURN_TOOL_NAME)?.inputSchema.required).toEqual([])
    await registration.dispose()
  })
})

function emptySchemaForTest() {
  return { type: 'object', properties: {}, required: [], additionalProperties: false }
}
