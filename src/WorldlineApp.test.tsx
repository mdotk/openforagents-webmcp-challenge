import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WebMcpTool } from './types'
import WorldlineApp from './WorldlineApp'

afterEach(() => {
  cleanup()
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

describe('WORLDLINE experience', () => {
  it('opens with one immediate dilemma and an honest guided fallback', async () => {
    render(<WorldlineApp />)

    expect(screen.getByRole('heading', { name: /one probe\. one signal\.\s*you can’t save both/i })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Run guided mission' })).toBeEnabled()
    expect(screen.getByAltText('The probe approaching the black hole')).toBeVisible()
    expect(await screen.findByText('Guided mode · 5 modeled tools')).toBeVisible()
    expect(screen.getByText('Guided version')).toBeVisible()
    expect(screen.getByText(/no compatible browser agent detected/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Copy mission for my agent' })).not.toBeInTheDocument()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('reports actual WebMCP readiness without claiming an agent is connected', async () => {
    installModelContext()
    render(<WorldlineApp />)

    expect(await screen.findByText('WebMCP ready · 5 tools')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copy mission for my agent' })).toBeVisible()
    expect(screen.getByText(/no agent is running yet/i)).toBeVisible()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('shows an explicit handoff instead of implying that the agent started', async () => {
    installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')

    await user.click(screen.getByRole('button', { name: 'Copy mission for my agent' }))

    expect(screen.getByRole('heading', { name: 'Open your browser agent.' })).toBeVisible()
    expect(screen.getByText(/paste this request and press Send/i)).toBeVisible()
    expect(screen.getByText(/agent will call tools automatically/i)).toBeVisible()
    expect(screen.getByText(agentRequestForTest())).toBeVisible()
    expect(screen.getByText('Mission copied')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copy request again' })).toBeEnabled()
  })

  it('reports a failed clipboard write and keeps the request selectable', async () => {
    installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copy mission for my agent' }))

    expect(screen.getByText('Copy did not finish')).toBeVisible()
    expect(screen.getByText(/copy failed.*copy it manually/i)).toBeVisible()
    expect(screen.getByText(agentRequestForTest())).toBeVisible()
  })

  it('runs the complete guided dilemma, approval and final receipt', async () => {
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('Guided mode · 5 modeled tools')

    await user.click(screen.getByRole('button', { name: 'Run guided mission' }))
    expect(await screen.findByRole('heading', { name: 'What comes home?' }, { timeout: 6000 })).toBeVisible()
    expect(screen.getByText('The agent found both possible futures. It cannot decide which loss you accept.')).toBeVisible()
    expect(screen.getByRole('button', { name: /choose the probe/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /choose the discovery/i })).toBeVisible()
    expect(screen.getByText('+23 years')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /choose the discovery/i }))
    expect(await screen.findByRole('heading', { name: 'Send the discovery.' })).toBeVisible()
    expect(screen.getByText('Guided mode · 6 modeled tools')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /send the discovery/i }))
    expect(await screen.findByRole('heading', { name: /23 years later,\s*earth sees what it saw/i })).toBeVisible()
    expect(screen.getByText('Guided mode · 2 modeled tools')).toBeVisible()
    expect(screen.getByText('Transmission verified')).toBeVisible()
  })

  it('keeps a visible completion action after an agent stops for the human choice', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')

    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0,
      burn_at_probe_second: 40,
      delta_v_mps: 3500,
      packet_ids: [],
    })
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 1,
      burn_at_probe_second: 55,
      delta_v_mps: 2600,
      packet_ids: [],
    })
    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 2,
      burn_at_probe_second: 46,
      delta_v_mps: 2200,
      packet_ids: ['gravity-map', 'horizon-spectrum'],
    })
    await model.tools.get('present_worldline_choices')!.execute({
      expected_revision: 3,
      probe_return_simulation_id: 'worldline-01',
      science_transmission_simulation_id: 'worldline-03',
    })

    expect(await screen.findByRole('heading', { name: 'What comes home?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /choose the probe/i }))

    expect(await screen.findByRole('heading', { name: 'Bring the probe home.' })).toBeVisible()
    expect(screen.getByText(/this is the final step/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /execute the return burn/i })).toBeEnabled()
    expect(screen.getByText(/you can finish here now/i)).toBeVisible()
  })

  it('shows the live 5 to 6 to 2 inventory when WebMCP is available', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    expect(await screen.findByText('WebMCP ready · 5 tools')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Run guided mission' }))
    await screen.findByRole('heading', { name: 'What comes home?' }, { timeout: 6000 })
    await user.click(screen.getByRole('button', { name: /choose the discovery/i }))
    await waitFor(() => expect(model.tools).toHaveLength(6))
    expect(screen.getByText('WebMCP ready · 6 tools')).toBeVisible()
    expect(screen.getByRole('button', { name: /send the discovery/i })).toBeVisible()
    expect(screen.getByText(/you can finish here now/i)).toBeVisible()

    const execute = model.tools.get('execute_authorized_burn')
    expect(execute).toBeDefined()
    await execute!.execute({})
    await waitFor(() => expect(model.tools).toHaveLength(2))
    expect(screen.getByText('WebMCP ready · 2 tools')).toBeVisible()
  }, 10_000)

  it('draws only the worldlines that the agent has actually tested', async () => {
    const model = installModelContext()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')

    await model.tools.get('simulate_worldline')!.execute({
      expected_revision: 0,
      burn_at_probe_second: 40,
      delta_v_mps: 3500,
      packet_ids: [],
    })

    await waitFor(() => expect(screen.getByTestId('worldline-path-escape')).toHaveClass('is-tested'))
    expect(screen.getByTestId('worldline-path-lost')).not.toHaveClass('is-tested')
    expect(screen.getByTestId('worldline-path-signal')).not.toHaveClass('is-tested')
    expect(screen.getAllByText(/probe saved, discovery lost/i)[0]).toBeVisible()
  })

  it('does not turn three failed attempts into a false success message', async () => {
    const model = installModelContext()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')

    for (const [index, burnAtProbeSecond] of [35, 36, 37].entries()) {
      await model.tools.get('simulate_worldline')!.execute({
        expected_revision: index,
        burn_at_probe_second: burnAtProbeSecond,
        delta_v_mps: 1800,
        packet_ids: [],
      })
    }

    expect(screen.getByRole('heading', { name: '1 of 3 outcomes found.' })).toBeVisible()
    expect(screen.getByTestId('worldline-path-signal')).not.toHaveClass('is-tested')
    expect(screen.queryByText(/final transmission window carries/i)).not.toBeInTheDocument()
  })

  it('lets the person unregister the page tools during an external agent run', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText('WebMCP ready · 5 tools')

    await model.tools.get('read_mission_state')!.execute({})
    await user.click(await screen.findByRole('button', { name: 'Stop agent tools' }))

    await waitFor(() => expect(model.tools).toHaveLength(0))
    expect(screen.getByText('WebMCP paused')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Agent tools stopped.' })).toBeVisible()
    expect(screen.getByRole('button', { name: /start over/i })).toBeVisible()
  })
})

function agentRequestForTest() {
  return 'Prepare this decision for me. Read the mission, science packets and maneuver window once. Use that evidence to test a probe-return route, one failed control and a science-transmission route. Use no more than five simulations. Present both viable futures together, then stop. Do not select a future or execute anything.'
}
