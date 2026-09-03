import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WebMcpTool } from './types'
import WorldlineApp from './WorldlineApp'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Reflect.deleteProperty(window, 'matchMedia')
  delete (document as Document & { modelContext?: unknown }).modelContext
})

function installModelContext() {
  const tools = new Map<string, WebMcpTool>()
  const modelContext = {
    async registerTool(tool: WebMcpTool, options: { readonly signal: AbortSignal }) {
      tools.set(tool.name, tool)
      options.signal.addEventListener('abort', () => tools.delete(tool.name), { once: true })
    },
    async getTools() { return [...tools.keys()].map((name) => ({ name })) },
    tools,
  }
  Object.defineProperty(document, 'modelContext', { configurable: true, value: modelContext })
  return modelContext
}

async function completeFirstAct(model: ReturnType<typeof installModelContext>) {
  await model.tools.get('simulate_worldline')!.execute({
    expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
    hypothesis: 'An early high-energy burn may return the probe.', expected_outcome: 'probe_return', test_role: 'extreme',
  })
  await model.tools.get('simulate_worldline')!.execute({
    expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'A later Earth-lock burn may send both discoveries.', expected_outcome: 'science_transmission', test_role: 'extreme',
  })
  await model.tools.get('present_learning_checkpoint')!.execute({ expected_revision: 2 })
}

async function completeSecondAct(model: ReturnType<typeof installModelContext>) {
  await model.tools.get('read_mission_state')!.execute({})
  await model.tools.get('simulate_worldline')!.execute({
    expected_revision: 5, burn_at_probe_second: 43, delta_v_mps: 2800, packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'A middle burn may save both.', expected_outcome: 'probe_return', test_role: 'compromise',
  })
  await model.tools.get('simulate_worldline')!.execute({
    expected_revision: 6, burn_at_probe_second: 44, delta_v_mps: 3400, packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'Moving the escape burn into the antenna window may save both.', expected_outcome: 'probe_return', test_role: 'counterexample',
  })
  await model.tools.get('present_worldline_choices')!.execute({
    expected_revision: 7,
    option_a_simulation_id: 'worldline-01', option_b_simulation_id: 'worldline-02', recommended_simulation_id: 'worldline-02',
    recommendation_rationale: 'The unique observations cannot be recreated.',
    prediction_assessment: 'correct',
    teaching_explanation: 'You were right that the constraints combine: escape needs an early hard burn, while transmission needs a later gentle burn that keeps the antenna on Earth.',
  })
}

describe('WORLDLINE experience', () => {
  it('opens with a clear dilemma and blocks unsupported browsers', async () => {
    render(<WorldlineApp />)
    expect(screen.getByRole('heading', { name: /save the probe—or send its discoveries home/i })).toBeVisible()
    expect(screen.getByRole('button', { name: 'WebMCP agent required' })).toBeDisabled()
    expect(await screen.findByText('WebMCP required')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open for Agents' })).toHaveAttribute('href', 'https://www.openforagents.com/')
  })

  it('reports six tools and starts with one short natural instruction', async () => {
    installModelContext()
    render(<WorldlineApp />)
    expect(await screen.findByText('WebMCP ready · 6 tools')).toBeVisible()
    expect(screen.getByRole('combobox', { name: /what should the agent protect/i })).toHaveValue('discovery')
    expect(screen.queryByRole('option', { name: 'Best evidence' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Instruction for your browser agent')).toHaveTextContent('Begin WORLDLINE.')
    expect(screen.queryByText(/test exactly two extreme futures/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy mission/i })).not.toBeInTheDocument()
  })

  it('makes the learner calculate and predict before the agent can test the middle', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    expect(await screen.findByRole('heading', { name: /can both discoveries finish transmitting/i })).toBeVisible()
    expect(screen.getByText('Waiting for your calculation')).toBeVisible()
    expect(screen.getByText('18 MB + 12 MB')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    expect(screen.getByText(/correct\. the transmission takes 25 seconds/i)).toBeVisible()
    expect(screen.getByText('Waiting for your prediction')).toBeVisible()
    expect(screen.getByRole('heading', { name: /why can’t one burn save both/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /all three conflict/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /all three conflict/i }))
    expect(screen.getByRole('heading', { name: 'Now challenge your idea.' })).toBeVisible()
    expect(screen.getByLabelText('Next instruction for your browser agent')).toHaveTextContent('Test my prediction.')
    expect(screen.queryByRole('button', { name: /copy follow-up/i })).not.toBeInTheDocument()
  })

  it('shows the second investigation act and teaches before asking for a value decision', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /can both discoveries finish transmitting/i })
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    await user.click(screen.getByRole('button', { name: /all three conflict/i }))
    await completeSecondAct(model)
    expect(await screen.findByRole('heading', { name: 'What comes home?' })).toBeVisible()
    expect(screen.getByText(/your prediction · correct/i)).toBeVisible()
    expect(screen.getByText(/escape needs an early hard burn/i)).toBeVisible()
    expect(screen.getByText(/across a three-part investigation and 4 tests/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /safe regions never overlap/i })).toBeVisible()
    expect(screen.getByText('t ≤ 42s')).toBeVisible()
    expect(screen.getByText('44s ≤ t ≤ 50s')).toBeVisible()
    expect(screen.getByText(/30 MB ÷ 1.2 MB\/s = 25 seconds/i)).toBeVisible()
  })

  it('returns execution to the agent and exposes the 6 to 7 to 2 lifecycle', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /can both discoveries finish transmitting/i })
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    await user.click(screen.getByRole('button', { name: /all three conflict/i }))
    await completeSecondAct(model)
    await screen.findByRole('heading', { name: 'What comes home?' })
    await user.click(screen.getByRole('button', { name: /send both discoveries — lose the probe/i }))
    await waitFor(() => expect(model.tools).toHaveLength(7))
    expect(screen.getByLabelText('Final instruction for your browser agent')).toHaveTextContent('Carry out my choice.')
    expect(screen.queryByRole('button', { name: /execute burn/i })).not.toBeInTheDocument()
    expect(screen.getByText(/agent—not this page—must use the one-use burn/i)).toBeVisible()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    })
    vi.useFakeTimers()
    await act(async () => { await model.tools.get('execute_authorized_burn')!.execute({}) })
    await act(async () => { vi.advanceTimersByTime(4_500) })
    expect(screen.getByText(/finishes leaving as contact ends/i)).toBeVisible()
    await act(async () => { vi.advanceTimersByTime(7_500) })
    vi.useRealTimers()
    await waitFor(() => expect(model.tools).toHaveLength(2))
    expect(screen.getByText('WebMCP ready · 2 tools')).toBeVisible()
    expect(model.tools.has('verify_transmission_receipt')).toBe(true)
    expect(screen.getByRole('heading', { name: /three ideas made this future predictable/i })).toBeVisible()
    expect(screen.getByText(/a light-year measures distance/i)).toBeVisible()
  }, 10_000)

  it('corrects a wrong estimate before asking for the causal prediction', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /can both discoveries finish transmitting/i })
    await user.click(screen.getByRole('button', { name: '12 seconds' }))
    expect(screen.getByText(/not quite\. the transmission takes 25 seconds/i)).toBeVisible()
    expect(screen.getByText(/30 MB ÷ 1.2 MB\/s = 25 seconds/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /why can’t one burn save both/i })).toBeVisible()
  })

  it('never asks the learner to copy or paste an engineered prompt', async () => {
    installModelContext()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    expect(screen.queryByText(/paste this request/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/copy mission/i)).not.toBeInTheDocument()
    expect(screen.getByText('Begin WORLDLINE.')).toBeVisible()
  })

  it('draws only worldlines the agent actually tested', async () => {
    const model = installModelContext()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
      hypothesis: 'An early burn may save the probe.', expected_outcome: 'probe_return', test_role: 'extreme',
    })
    await waitFor(() => expect(screen.getByTestId('worldline-path-escape')).toHaveClass('is-tested'))
    expect(screen.getByTestId('worldline-path-signal')).not.toHaveClass('is-tested')
  })

  it('lets the person stop all page tools', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await model.tools.get('read_mission_state')!.execute({})
    await user.click(await screen.findByRole('button', { name: 'Stop agent tools' }))
    await waitFor(() => expect(model.tools).toHaveLength(0))
    expect(screen.getByText('WebMCP paused')).toBeVisible()
  })
})
