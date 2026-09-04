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
    hypothesis: 'An early, powerful burn may let the probe escape.', expected_outcome: 'probe_return', test_role: 'extreme',
  })
  await model.tools.get('simulate_worldline')!.execute({
    expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
    hypothesis: 'A later burn may keep the antenna pointed at Earth long enough to send both files.', expected_outcome: 'science_transmission', test_role: 'extreme',
  })
  await model.tools.get('present_learning_checkpoint')!.execute({ expected_revision: 2 })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /review test 1/i }))
  await user.click(await screen.findByRole('button', { name: /show next test/i }))
  await user.click(await screen.findByRole('button', { name: /continue to my calculation/i }))
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
    recommendation_rationale: 'Earth has no copy of the gravity map or light spectrum.',
    prediction_assessment: 'correct',
    teaching_explanation: 'You were right that the constraints combine: escape needs an earlier, larger speed change, while sending needs a later, smaller one that keeps the antenna on Earth.',
  })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /review test 3/i }))
  await user.click(await screen.findByRole('button', { name: /show next test/i }))
  await user.click(await screen.findByRole('button', { name: /continue to the results/i }))
}

describe('WORLDLINE experience', () => {
  it('opens with a clear dilemma and blocks unsupported browsers', async () => {
    render(<WorldlineApp />)
    expect(screen.getByRole('heading', { name: /can one engine burn save the probe and send both files/i })).toBeVisible()
    expect(screen.getByText(/one engine burn, a short firing that changes its speed/i)).toBeVisible()
    expect(screen.getByText(/processed and compressed the raw measurements into two files ready to send/i)).toBeVisible()
    expect(screen.getByText(/work with your browser agent to find out whether that burn can both let the probe escape and send the files/i)).toBeVisible()
    expect(screen.getByText(/if it cannot, you decide what to save/i)).toBeVisible()
    expect(screen.getByText(/compressed files ready to send/i)).toBeVisible()
    expect(screen.getByLabelText('Mission clocks')).toHaveTextContent('MISSION TIMET+00:00:00RADIO LINK LEFT00:01:11')
    expect(screen.getByRole('button', { name: 'A WebMCP browser agent is required' })).toBeDisabled()
    expect(await screen.findByText('WebMCP required')).toBeVisible()
    expect(screen.getByText('An interactive science lesson')).toBeVisible()
    expect(screen.getByText(/a signal from 23 light-years away takes 23 years/i)).toBeVisible()
    expect(screen.getByText(/a made-up mission built to teach the ideas/i)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open for Agents' })).toHaveAttribute('href', 'https://www.openforagents.com/')
  })

  it('reports six tools and starts with one short natural instruction', async () => {
    installModelContext()
    render(<WorldlineApp />)
    expect(await screen.findByText('WebMCP ready · 6 tools')).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Instruction for your browser agent')).toHaveTextContent('Begin WORLDLINE.')
    expect(screen.getByLabelText('Instruction for your browser agent')).toHaveTextContent(/recommend an outcome only after the tests/i)
    expect(screen.queryByText(/test exactly two extreme futures/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy mission/i })).not.toBeInTheDocument()
  })

  it('gives the agent an evidence-based mission objective without asking for a premature preference', async () => {
    const model = installModelContext()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    const mission = await model.tools.get('read_mission_state')!.execute({})

    expect(mission.structuredContent).toMatchObject({
      missionObjective: expect.stringMatching(/recommend sending the two files because Earth has no copies/i),
    })
    expect(screen.queryByText(/set the agent.s recommendation/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /can one engine burn save the probe and send both files/i })).toBeVisible()
  })

  it('makes the learner calculate and predict before the agent can test the middle', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    expect(await screen.findByRole('heading', { name: /how long do both files take to send/i })).toBeVisible()
    expect(screen.getByText('Waiting for your calculation')).toBeVisible()
    expect(screen.getByText('18 MB + 12 MB')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    expect(screen.getByText(/correct\. sending both files takes 25 seconds/i)).toBeVisible()
    expect(screen.getByText('Waiting for your prediction')).toBeVisible()
    expect(screen.getByRole('heading', { name: /what might stop one burn from doing both/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /the requirements may conflict/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /the requirements may conflict/i }))
    expect(screen.getByRole('heading', { name: 'Now ask the agent to test your prediction.' })).toBeVisible()
    expect(screen.getByLabelText('Next instruction for your browser agent')).toHaveTextContent('Test my prediction.')
    expect(screen.queryByRole('button', { name: /copy follow-up/i })).not.toBeInTheDocument()
  })

  it('holds every investigation result until the person chooses to continue', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')

    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
      hypothesis: 'An early, powerful burn may let the probe escape.', expected_outcome: 'probe_return', test_role: 'extreme',
    })
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'A later burn may send both files.', expected_outcome: 'science_transmission', test_role: 'extreme',
    })
    await model.tools.get('present_learning_checkpoint')!.execute({ expected_revision: 2 })

    expect(await screen.findByText('2 tests ready to review')).toBeVisible()
    expect(screen.getByText(/the agent has finished this round\. open test 1 when you are ready to read it/i)).toBeVisible()
    expect(screen.getByText(/the page advances only when you choose/i)).toBeVisible()
    expect(screen.queryByText('Test 1')).not.toBeInTheDocument()
    expect(screen.queryByText('TESTED BURN')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /review test 1/i }))
    expect(await screen.findByText('Test 1')).toBeVisible()
    expect(screen.getByText(/the page will wait until you are ready for the next one/i)).toBeVisible()
    expect(screen.getByText(/this result stays on screen until you choose to continue/i)).toBeVisible()
    expect(screen.getByText('TESTED BURN')).toBeVisible()
    expect(screen.getByText('T+00:00:40')).toBeVisible()
    expect(screen.getByText('RADIO LINK LEFT')).toBeVisible()
    expect(screen.getByText('00:00:31')).toBeVisible()
    expect(screen.getByText('Gold curve: tested escape path')).toBeVisible()
    expect(screen.getByTestId('worldline-path-escape')).toHaveClass('is-active')
    expect(screen.queryByText('Test 2')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show next test/i }))
    expect(await screen.findByText('Test 2')).toBeVisible()
    expect(screen.getByText('T+00:00:46')).toBeVisible()
    expect(screen.getByText('00:00:25')).toBeVisible()
    expect(screen.getByText('Purple line: files sent toward Earth')).toBeVisible()
    expect(screen.getByTestId('worldline-path-signal')).toHaveClass('is-active')
    expect(screen.getByTestId('worldline-path-escape')).not.toHaveClass('is-active')
    expect(screen.getByRole('button', { name: /continue to my calculation/i })).toBeVisible()
  })

  it('does not reveal the sending-time answer before the person calculates it', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await model.tools.get('inspect_science_packets')!.execute({})
    await model.tools.get('inspect_maneuver_window')!.execute({})
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
      hypothesis: 'An early burn may let the probe escape.', expected_outcome: 'probe_return', test_role: 'extreme',
    })
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'A later burn may send both files.', expected_outcome: 'science_transmission', test_role: 'extreme',
    })
    await model.tools.get('present_learning_checkpoint')!.execute({ expected_revision: 2 })
    await user.click(await screen.findByRole('button', { name: /review test 1/i }))

    expect(await screen.findByText('You will calculate the sending time')).toBeVisible()
    expect(screen.getByText(/without revealing the answer/i)).toBeVisible()
    expect(screen.queryByText('25 seconds to send both files')).not.toBeInTheDocument()
    expect(screen.queryByText(/30 MB ÷ 1.2 MB\/s = 25 seconds/i)).not.toBeInTheDocument()
  })

  it('shows the second investigation act and teaches before asking for a value decision', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /how long do both files take to send/i })
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    await user.click(screen.getByRole('button', { name: /the requirements may conflict/i }))
    await completeSecondAct(model)
    expect(await screen.findByRole('heading', { name: 'What do you save?' })).toBeVisible()
    expect(screen.getByText(/your prediction · correct/i)).toBeVisible()
    expect(screen.getByText(/escape needs an earlier, larger speed change/i)).toBeVisible()
    expect(screen.getByText(/across two rounds of investigation and 4 burn tests/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /required times and speed changes do not overlap/i })).toBeVisible()
    expect(screen.getByText('Burn by second 42')).toBeVisible()
    expect(screen.getByText('Burn from second 44 to 50')).toBeVisible()
    expect(screen.getByText(/30 MB ÷ 1.2 MB\/s = 25 seconds/i)).toBeVisible()
    expect(screen.getByText(/earth has no copy of either file/i)).toBeVisible()
    expect(screen.getByText(/you still decide which loss to accept/i)).toBeVisible()
  })

  it('returns execution to the agent and exposes the 6 to 7 to 2 lifecycle', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /how long do both files take to send/i })
    await user.click(screen.getByRole('button', { name: '25 seconds' }))
    await user.click(screen.getByRole('button', { name: /the requirements may conflict/i }))
    await completeSecondAct(model)
    await screen.findByRole('heading', { name: 'What do you save?' })
    await user.click(screen.getByRole('button', { name: /send both files, lose the probe/i }))
    await waitFor(() => expect(model.tools).toHaveLength(7))
    expect(screen.getByLabelText('Final instruction for your browser agent')).toHaveTextContent('Carry out my choice.')
    expect(screen.queryByRole('button', { name: /execute burn/i })).not.toBeInTheDocument()
    expect(screen.getByText(/only the browser agent can use the one-time burn/i)).toBeVisible()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    })
    vi.useFakeTimers()
    await act(async () => { await model.tools.get('execute_authorized_burn')!.execute({}) })
    expect(screen.getByLabelText('Mission clocks')).toHaveTextContent('PROBE TIMET+00:00:46EARTH SIGNAL+00 YEARS')
    await act(async () => { vi.advanceTimersByTime(4_500) })
    expect(screen.getByLabelText('Mission clocks')).toHaveTextContent('PROBE TIMET+00:01:11EARTH SIGNAL+00 YEARS')
    expect(screen.getByText(/finishes sending as the radio link closes/i)).toBeVisible()
    await act(async () => { vi.advanceTimersByTime(7_500) })
    vi.useRealTimers()
    await waitFor(() => expect(model.tools).toHaveLength(2))
    expect(screen.getByText('WebMCP ready · 2 tools')).toBeVisible()
    expect(screen.getByLabelText('Mission clocks')).toHaveTextContent('PROBE TIMET+00:01:11EARTH SIGNAL+23 YEARS')
    expect(model.tools.has('verify_transmission_receipt')).toBe(true)
    expect(screen.getByRole('heading', { name: /three facts explain the result/i })).toBeVisible()
    expect(screen.getByText(/a light-year measures distance/i)).toBeVisible()
  }, 10_000)

  it('corrects a wrong estimate before asking for the causal prediction', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await completeFirstAct(model)
    await screen.findByRole('heading', { name: /how long do both files take to send/i })
    await user.click(screen.getByRole('button', { name: '12 seconds' }))
    expect(screen.getByText(/not quite\. sending both files takes 25 seconds/i)).toBeVisible()
    expect(screen.getByText(/30 MB ÷ 1.2 MB\/s = 25 seconds/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /what might stop one burn from doing both/i })).toBeVisible()
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
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 6 tools')
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0, burn_at_probe_second: 40, delta_v_mps: 3500, packet_ids: [],
      hypothesis: 'An early burn may save the probe.', expected_outcome: 'probe_return', test_role: 'extreme',
    })
    expect(screen.getByTestId('worldline-path-escape')).not.toHaveClass('is-tested')
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 1, burn_at_probe_second: 46, delta_v_mps: 2200, packet_ids: ['gravity-map', 'horizon-spectrum'],
      hypothesis: 'A later burn may send both files.', expected_outcome: 'science_transmission', test_role: 'extreme',
    })
    await model.tools.get('present_learning_checkpoint')!.execute({ expected_revision: 2 })
    await user.click(await screen.findByRole('button', { name: /review test 1/i }))
    expect(screen.getByTestId('worldline-path-escape')).toHaveClass('is-active')
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
