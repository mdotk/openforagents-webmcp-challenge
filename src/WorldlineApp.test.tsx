import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
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
    expect(screen.getByRole('button', { name: 'Show me the futures' })).toBeEnabled()
    expect(screen.getByAltText('The probe approaching the black hole')).toBeVisible()
    expect(await screen.findByText(/6 tools with a compatible agent/i)).toBeVisible()
    expect(screen.getByText(/no compatible browser agent detected/i)).toBeVisible()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('reports actual WebMCP readiness without claiming an agent is connected', async () => {
    installModelContext()
    render(<WorldlineApp />)

    expect(await screen.findByText('6 WebMCP tools live')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Use my browser agent' })).toBeVisible()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('runs the complete guided dilemma, approval and final receipt', async () => {
    const user = userEvent.setup()
    render(<WorldlineApp />)
    await screen.findByText(/6 tools with a compatible agent/i)

    await user.click(screen.getByRole('button', { name: 'Show me the futures' }))
    expect(await screen.findByRole('heading', { name: 'Send the discovery home?' }, { timeout: 4000 })).toBeVisible()
    expect(screen.getByText('The unique observation reaches Earth, but the probe cannot return.')).toBeVisible()
    expect(screen.getByText('+23 years')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /approve this one burn/i }))
    expect(await screen.findByRole('heading', { name: 'Decision made.' })).toBeVisible()
    expect(screen.getByText(/7 tools with a compatible agent/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /send the signal/i }))
    expect(await screen.findByRole('heading', { name: /23 years later,\s*earth sees what it saw/i })).toBeVisible()
    expect(screen.getByText('2 tools with a compatible agent')).toBeVisible()
    expect(screen.getByText('Transmission verified')).toBeVisible()
  })

  it('shows the live 6 to 7 to 2 inventory when WebMCP is available', async () => {
    const model = installModelContext()
    const user = userEvent.setup()
    render(<WorldlineApp />)
    expect(await screen.findByText('6 WebMCP tools live')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Show me the futures' }))
    await screen.findByRole('heading', { name: 'Send the discovery home?' }, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /approve this one burn/i }))
    await waitFor(() => expect(model.tools).toHaveLength(7))
    expect(screen.getByText('7 WebMCP tools live')).toBeVisible()

    const execute = model.tools.get('execute_authorized_burn')
    expect(execute).toBeDefined()
    await execute!.execute({})
    await waitFor(() => expect(model.tools).toHaveLength(2))
    expect(screen.getByText('2 WebMCP tools live')).toBeVisible()
  })
})
