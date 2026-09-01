import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import ShoppingApp from './ShoppingApp'
import type { WebMcpTool } from './types'
import { APPLY_APPROVED_CART_TOOL_NAME } from './webmcp'

afterEach(() => {
  cleanup()
  delete (document as Document & { modelContext?: unknown }).modelContext
  window.history.replaceState({}, '', '/')
})

function installRejectingModelContext() {
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
      if (tool.name === APPLY_APPROVED_CART_TOOL_NAME) throw new Error('Temporary tool registration rejected.')
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
  }
  Object.defineProperty(document, 'modelContext', { configurable: true, value: modelContext })
}

describe('Adaptive Shopping Canvas', () => {
  it('opens with one legible human story and an honest unsupported-browser state', async () => {
    render(<ShoppingApp />)

    expect(document.title).toBe('Morrow — Adaptive Shopping Canvas')
    expect(screen.getByRole('heading', { name: /your agent shops/i })).toBeVisible()
    expect(screen.getByText('Fictional retailer demo')).toBeVisible()
    expect(screen.getByText(/wedding saturday\. make it unforgettable/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Ready for the agent' })).toBeVisible()
    expect(screen.getByText(/one request\. thirty variants/i)).toBeVisible()
    expect(await screen.findByText('7 modeled tools · native unavailable')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'No compatible WebMCP agent connected.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start guided demo' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /approve exact cart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument()
  })

  it('tells a native-WebMCP visitor exactly what to ask and offers a guided alternative', async () => {
    installRejectingModelContext()
    render(<ShoppingApp />)

    expect(await screen.findByText('7 native tools live')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'WebMCP tools are ready.' })).toBeVisible()
    expect(screen.getByText('Ask your browser agent')).toBeVisible()
    expect(screen.getAllByText(/shop this brief\. build the look here/i)).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Run guided demo instead' })).toBeVisible()
  })

  it('runs the visible first-look, delivery failure, coordinated repair and exact approval journey', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 modeled tools · native unavailable')

    await user.click(screen.getByRole('button', { name: 'Start guided demo' }))

    expect(screen.getByRole('heading', { name: 'First look found' })).toBeVisible()
    expect(screen.getByAltText('Silver Cropped Blazer')).toBeVisible()
    expect(screen.getByText('$343')).toBeVisible()
    expect(screen.getByText('Empty')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Change delivery to the event hotel' }))
    expect(screen.getByRole('heading', { name: 'The destination changed' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Silver blazer arrives Monday.' })).toBeVisible()
    expect(screen.getByText('Monday · Hotel')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    expect(screen.getByRole('heading', { name: 'Replanned for the hotel' })).toBeVisible()
    expect(screen.getByAltText('Ink Sculpted Jacket')).toBeVisible()
    expect(screen.getByAltText('Ink Slim Clutch')).toBeVisible()
    expect(screen.getByText('+$18')).toBeVisible()
    expect(screen.getByText('−$16')).toBeVisible()
    expect(screen.getByText('$345')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Prepare exact cart review' }))
    const review = screen.getByRole('heading', { name: 'Review the exact cart change' }).closest('section')
    expect(review).not.toBeNull()
    expect(screen.getByText(/no item is in the cart and no payment has been taken/i)).toBeVisible()
    expect(within(review!).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Approve exact cart' }))
    expect(screen.getByText(/you approved one exact cart patch/i)).toBeVisible()
    expect(screen.getAllByText(/apply_approved_cart/).length).toBeGreaterThan(1)

    await user.click(screen.getByRole('button', { name: 'Apply approved cart' }))
    const cart = screen.getByRole('heading', { name: 'Your cart is ready.' }).closest('section')
    expect(cart).not.toBeNull()
    expect(within(cart!).getByText(/4 items · \$345 · \$0 charged/i)).toBeVisible()
    expect(within(cart!).getAllByText(/arrives fri, sep 4/i)).toHaveLength(4)
    expect(within(cart!).getByText('Midnight Column Dress · M')).toBeVisible()
    expect(within(cart!).getByText('Ink Sculpted Jacket · M')).toBeVisible()
    expect(within(cart!).getByText('Ink Slim Clutch · ONE')).toBeVisible()
    expect(within(cart!).getByText('Silver Chain Belt · ONE')).toBeVisible()
    expect(within(cart!).queryByText(/cobalt-blue ankle boots/i)).not.toBeInTheDocument()
    expect(within(cart!).getByText('No order has been placed.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Apply approved cart' })).not.toBeInTheDocument()
  })

  it('lets the person decline an exact proposal without changing the cart', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 modeled tools · native unavailable')
    await user.click(screen.getByRole('button', { name: 'Start guided demo' }))
    await user.click(screen.getByRole('button', { name: 'Change delivery to the event hotel' }))
    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    await user.click(screen.getByRole('button', { name: 'Prepare exact cart review' }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(screen.queryByRole('heading', { name: 'Your cart is ready.' })).not.toBeInTheDocument()
    expect(screen.queryByText(/you approved one exact cart patch/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Still empty')).toHaveLength(1)
  })

  it('reports temporary-tool registration failure while keeping authority revocable and the cart empty', async () => {
    installRejectingModelContext()
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 native tools live')

    await user.click(screen.getByRole('button', { name: 'Run guided demo instead' }))
    await user.click(screen.getByRole('button', { name: 'Change delivery to the event hotel' }))
    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    await user.click(screen.getByRole('button', { name: 'Prepare exact cart review' }))
    await user.click(screen.getByRole('button', { name: 'Approve exact cart' }))

    expect(await screen.findByText('Tool registration needs attention')).toBeVisible()
    expect(screen.getByText('You approved one exact cart patch.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Your cart is ready.' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(screen.queryByText('You approved one exact cart patch.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your cart is ready.' })).not.toBeInTheDocument()
  })

  it('runs the unfilmed tighter-budget variation to a different valid result', async () => {
    window.history.replaceState({}, '', '/?experience=shopping&scenario=tighter-budget')
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 modeled tools · native unavailable')

    expect(screen.getByText('Under $325')).toBeVisible()
    expect(screen.getByText(/retailer items under \$325/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Start guided demo' }))
    expect(screen.getByAltText('Ink Satin Jumpsuit')).toBeVisible()
    expect(screen.getByText('$313')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Change delivery to the event hotel' }))
    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    expect(screen.getByAltText('Oxblood Silk Scarf')).toBeVisible()
    expect(screen.getByText('$325')).toBeVisible()
  })
})
