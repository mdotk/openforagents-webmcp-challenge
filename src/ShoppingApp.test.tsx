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
  await user.click(screen.getByRole('button', { name: 'Find me a look' }))
  await user.click(screen.getByRole('button', { name: 'Send it to the event hotel' }))
  await user.click(screen.getByRole('button', { name: 'Fix the late items' }))
  await user.click(screen.getByRole('button', { name: 'Review 4 items' }))
}

describe('Adaptive Shopping Canvas', () => {
  it('opens with one human problem and an immediately runnable guided journey', async () => {
    render(<ShoppingApp />)

    expect(document.title).toBe('Morrow: Adaptive Shopping Canvas')
    const heading = screen.getByRole('heading', { name: 'Find a wedding look around these boots.' })
    const ownedBoots = screen.getByAltText('Your owned cobalt-blue ankle boots')
    expect(heading).toBeVisible()
    expect(screen.getByText(/wedding saturday\. i’m a size m\. keep it under \$350/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Find me a look' })).toBeEnabled()
    expect(screen.getByText('The guided demo works now')).toBeVisible()
    expect(heading.closest('.shopping-canvas__note-copy')).not.toContainElement(ownedBoots)
    expect(ownedBoots.closest('.shopping-canvas__owned-item')).toBeVisible()
    expect(screen.queryByText(/then delivery changes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/step 1 of 4/i)).not.toBeInTheDocument()

    expect(await screen.findByText('Guided demo available')).toBeVisible()
    expect(screen.getByText('This browser does not expose WebMCP')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your look' })).toBeVisible()
    expect(screen.getByText('Your look will appear here.')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Selected pieces' })).not.toBeInTheDocument()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('reports WebMCP readiness without pretending an agent is connected', async () => {
    installModelContext()
    render(<ShoppingApp />)

    expect(await screen.findByText('Browser agent ready')).toBeVisible()
    expect(screen.getByText('7 tools')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Find me a look' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Use my browser agent' })).toBeVisible()
    expect(screen.queryByText(/agent connected/i)).not.toBeInTheDocument()
  })

  it('shows actual browser-agent tool execution as a factual live activity trail', async () => {
    const modelContext = installModelContext()
    render(<ShoppingApp />)
    await screen.findByText('Browser agent ready')

    await testAct(async () => {
      await modelContext.invoke('read_shopper_context')
      await modelContext.invoke('search_products', {
        categories: ['base', 'layer', 'bag', 'accent'],
        sizes: ['M', 'ONE'],
        limit: 12,
      })
    })

    expect(screen.getAllByText('Found the strongest candidates from retailer-owned product facts.').length).toBeGreaterThan(0)
    const activitySummary = screen.getByText('See activity (2)')
    const activityDetails = activitySummary.closest('details')
    expect(activityDetails).not.toHaveAttribute('open')
    await userEvent.setup().click(activitySummary)
    expect(activityDetails).toHaveAttribute('open')
    expect(screen.getByText('Confirmed the brief and the constraints that must not change.')).toBeVisible()
    expect(screen.getAllByText('Found the strongest candidates from retailer-owned product facts.').length).toBeGreaterThan(0)
    expect(screen.getByText('read_shopper_context')).toBeVisible()
    expect(screen.getAllByText('search_products').length).toBeGreaterThan(0)
  })

  it('runs the visible search, delivery failure, repair and one-action demo cart journey', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo available')

    await user.click(screen.getByRole('button', { name: 'Find me a look' }))
    expect(screen.getByText('Four pieces found')).toBeVisible()
    expect(screen.getByAltText('Silver Cropped Blazer')).toBeVisible()
    expect(screen.getByText(/4 pieces · \$343/)).toBeVisible()
    expect(screen.getByText('See activity (3)')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Send it to the event hotel' }))
    expect(screen.getByText('One item misses Friday')).toBeVisible()
    expect(screen.getByText('Too late')).toBeVisible()
    expect(screen.getByText(/arrives mon, sep 7/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Fix the late items' }))
    expect(screen.getByText('Updated for the hotel')).toBeVisible()
    expect(screen.getByAltText('Ink Sculpted Jacket')).toBeVisible()
    expect(screen.getByAltText('Ink Slim Clutch')).toBeVisible()
    expect(screen.getAllByText('Replacement')).toHaveLength(2)
    expect(screen.getAllByText('Kept')).toHaveLength(2)
    expect(screen.getByText(/kept two pieces, changed two · arrives friday · \$345/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Review 4 items' }))
    const dialog = screen.getByRole('dialog', { name: 'Add these exact four items?' })
    expect(dialog).toBeVisible()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Add these exact four items?' })).toHaveFocus())
    expect(within(dialog).getByText(/nothing is in the cart. nothing has been charged/i)).toBeVisible()
    expect(within(dialog).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)

    await user.click(within(dialog).getByRole('button', { name: 'Add these 4 items to the demo cart' }))
    const cart = screen.getByRole('heading', { name: 'Added to your demo cart.' }).closest('section')
    expect(cart).not.toBeNull()
    expect(within(cart!).getByText('Everything arrives at the event hotel by Friday.')).toBeVisible()
    expect(within(cart!).getByText('$345')).toBeVisible()
    expect(within(cart!).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)
    expect(within(cart!).getByText('Checkout is not part of this demo. Nothing has been charged.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled()
    expect(screen.queryByText('Store work')).not.toBeInTheDocument()
    expect(screen.getByLabelText('4 items in the demo cart')).toBeVisible()
  })

  it('lets the person decline the visible exact decision without changing the cart', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo available')
    await completeGuidedJourney(user)

    const dialog = screen.getByRole('dialog', { name: 'Add these exact four items?' })
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }))

    expect(screen.queryByRole('heading', { name: 'Added to your demo cart.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('0 items in the demo cart')).toBeVisible()
  })

  it('runs the unfilmed tighter-budget variation to a different valid result', async () => {
    window.history.replaceState({}, '', '/?experience=shopping&scenario=tighter-budget')
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('Guided demo available')

    expect(screen.getByText(/keep it under \$325/i)).toBeVisible()
    expect(screen.queryByText(/keep it under \$350/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Find me a look' }))
    expect(screen.getByAltText('Ink Satin Jumpsuit')).toBeVisible()
    expect(screen.getByText(/4 pieces · \$313/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Send it to the event hotel' }))
    await user.click(screen.getByRole('button', { name: 'Fix the late items' }))
    expect(screen.getByAltText('Oxblood Silk Scarf')).toBeVisible()
    expect(screen.getByText(/kept two pieces, changed two · arrives friday · \$325/i)).toBeVisible()
  })
})
