import { act as testAct, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import ShoppingApp from './ShoppingApp'
import type { WebMcpTool } from './types'

afterEach(() => {
  cleanup()
  delete (document as Document & { modelContext?: unknown }).modelContext
  window.history.replaceState({}, '', '/')
})

function installModelContext() {
  const tools = new Map<string, WebMcpTool>()
  const listeners = new Set<EventListenerOrEventListenerObject>()
  const emit = () => {
    const event = new Event('toolchange')
    for (const listener of listeners) {
      if (typeof listener === 'function') listener(event)
      else listener.handleEvent(event)
    }
  }
  const modelContext = {
    async registerTool(tool: WebMcpTool, options: { readonly signal: AbortSignal }) {
      tools.set(tool.name, tool)
      options.signal.addEventListener('abort', () => {
        if (tools.delete(tool.name)) emit()
      }, { once: true })
      emit()
    },
    async getTools() {
      return [...tools.values()].map(({ name }) => ({ name }))
    },
    addEventListener(_type: 'toolchange', listener: EventListenerOrEventListenerObject) {
      listeners.add(listener)
    },
    removeEventListener(_type: 'toolchange', listener: EventListenerOrEventListenerObject) {
      listeners.delete(listener)
    },
    async invoke(name: string, args: Record<string, unknown> = {}) {
      const tool = tools.get(name)
      if (!tool) throw new Error(`Tool ${name} is not registered.`)
      return tool.execute(args)
    },
    tools,
  }
  Object.defineProperty(document, 'modelContext', { configurable: true, value: modelContext })
  return modelContext
}

async function completeGuidedJourney(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Start the demo' }))
  await user.click(screen.getByRole('button', { name: 'Change delivery to the hotel' }))
  await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
  await user.click(screen.getByRole('button', { name: 'Review the exact cart' }))
}

describe('Adaptive Shopping Canvas', () => {
  it('opens with one human problem and an immediately runnable guided journey', async () => {
    render(<ShoppingApp />)

    expect(document.title).toBe('Morrow — Adaptive Shopping Canvas')
    expect(screen.getByRole('heading', { name: /the outfit works.*then delivery changes/i })).toBeVisible()
    expect(screen.getByText('Fictional retailer demo')).toBeVisible()
    expect(screen.getByText(/wedding saturday\. size m\. under \$350/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'See it work—or delegate it.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start the demo' })).toBeEnabled()
    expect(screen.getByText('The guided demo works now')).toBeVisible()

    expect(await screen.findByText('Guided demo ready')).toBeVisible()
    expect(screen.getByText('This browser does not expose WebMCP')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your boots are the starting point' })).toBeVisible()
    expect(screen.getByText('The complete guided demo is ready.')).toBeVisible()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('reports WebMCP readiness without pretending an agent is connected', async () => {
    installModelContext()
    render(<ShoppingApp />)

    expect(await screen.findByText('WebMCP ready')).toBeVisible()
    expect(screen.getByText('7 tools available to browser agents')).toBeVisible()
    expect(screen.getByText('WebMCP is ready')).toBeVisible()
    expect(screen.getByText('Waiting for your browser agent.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start the demo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Copy agent request' })).toBeVisible()
    expect(screen.getAllByText(/shop this wedding brief/i)).toHaveLength(1)
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('shows actual browser-agent tool execution as a factual live activity trail', async () => {
    const modelContext = installModelContext()
    render(<ShoppingApp />)
    await screen.findByText('WebMCP ready')

    await testAct(async () => {
      await modelContext.invoke('read_shopper_context')
      await modelContext.invoke('search_products', {
        categories: ['base', 'layer', 'bag', 'accent'],
        sizes: ['M', 'ONE'],
        limit: 12,
      })
    })

    expect(screen.getByRole('heading', { name: 'Browser agent activity' })).toBeVisible()
    expect(screen.getByText('Live calls')).toBeVisible()
    expect(screen.getByText('Confirmed the brief and the constraints that must not change.')).toBeVisible()
    expect(screen.getByText('Found the strongest candidates from retailer-owned product facts.')).toBeVisible()
    expect(screen.getByText('read_shopper_context')).toBeVisible()
    expect(screen.getByText('search_products')).toBeVisible()
  })

  it('runs the visible search, delivery failure, repair and one-action demo cart journey', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo ready')

    await user.click(screen.getByRole('button', { name: 'Start the demo' }))
    expect(screen.getByRole('heading', { name: 'Guided demo activity' })).toBeVisible()
    expect(screen.getByText('Searched 30 exact variants across 12 products.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'First look found' })).toBeVisible()
    expect(screen.getByAltText('Silver Cropped Blazer')).toBeVisible()
    expect(screen.getByText('$343')).toBeVisible()
    expect(screen.getByText('Empty')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Change delivery to the hotel' }))
    expect(screen.getByRole('heading', { name: 'The destination changed' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Silver blazer arrives Monday.' })).toBeVisible()
    expect(screen.getByText('Rechecked four promises and found one late item.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    expect(screen.getByRole('heading', { name: 'Replanned for the hotel' })).toBeVisible()
    expect(screen.getByAltText('Ink Sculpted Jacket')).toBeVisible()
    expect(screen.getByAltText('Ink Slim Clutch')).toBeVisible()
    expect(screen.getByText('Replaced only the two problem pieces.')).toBeVisible()
    expect(screen.getByText('$345')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Review the exact cart' }))
    const dialog = screen.getByRole('dialog', { name: 'Add these exact four items?' })
    expect(dialog).toBeVisible()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Add these exact four items?' })).toHaveFocus())
    expect(within(dialog).getByText(/nothing is in the cart. nothing has been charged/i)).toBeVisible()
    expect(within(dialog).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)

    await user.click(within(dialog).getByRole('button', { name: 'Add these 4 items to the demo cart' }))
    const cart = screen.getByRole('heading', { name: 'Your exact cart is ready.' }).closest('section')
    expect(cart).not.toBeNull()
    expect(within(cart!).getByText(/4 items · \$345 · arrives friday · \$0 charged/i)).toBeVisible()
    expect(within(cart!).getByText('Searched, checked and repaired the look')).toBeVisible()
    expect(within(cart!).getByText('No checkout, payment or order')).toBeVisible()
    expect(within(cart!).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)
    expect(within(cart!).getByText('No order has been placed. Checkout stays with you.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled()
    expect(screen.queryByText(/waiting for your browser agent/i)).not.toBeInTheDocument()
  })

  it('lets the person decline the visible exact decision without changing the cart', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo ready')
    await completeGuidedJourney(user)

    const dialog = screen.getByRole('dialog', { name: 'Add these exact four items?' })
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }))

    expect(screen.queryByRole('heading', { name: 'Your exact cart is ready.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Still empty')).toBeVisible()
  })

  it('runs the unfilmed tighter-budget variation to a different valid result', async () => {
    window.history.replaceState({}, '', '/?experience=shopping&scenario=tighter-budget')
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo ready')

    expect(screen.getByText('Under $325')).toBeVisible()
    expect(screen.getByText(/stay under \$325/i)).toBeVisible()
    expect(screen.queryByText(/stay under \$350/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start the demo' }))
    expect(screen.getByAltText('Ink Satin Jumpsuit')).toBeVisible()
    expect(screen.getByText('$313')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Change delivery to the hotel' }))
    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    expect(screen.getByAltText('Oxblood Silk Scarf')).toBeVisible()
    expect(screen.getByText('$325')).toBeVisible()
  })
})
