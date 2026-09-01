import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import ShoppingApp from './ShoppingApp'

afterEach(cleanup)

describe('Adaptive Shopping Canvas', () => {
  it('opens with one legible human story and an honest unsupported-browser state', async () => {
    render(<ShoppingApp />)

    expect(document.title).toBe('Morrow — Adaptive Shopping Canvas')
    expect(screen.getByRole('heading', { name: /your agent shops/i })).toBeVisible()
    expect(screen.getByText('Fictional retailer demo')).toBeVisible()
    expect(screen.getByText(/style a sharp evening look around my cobalt-blue boots/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Ready for the agent' })).toBeVisible()
    expect(screen.getByText(/one request\. thirty variants/i)).toBeVisible()
    expect(await screen.findByText('7 modeled tools · native unavailable')).toBeVisible()
    expect(screen.queryByRole('button', { name: /approve exact cart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument()
  })

  it('runs the visible first-look, delivery failure, coordinated repair and exact approval journey', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 modeled tools · native unavailable')

    await user.click(screen.getByText('No compatible agent? Run the same visible demo journey'))
    await user.click(screen.getByRole('button', { name: 'Build the first look' }))

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
    expect(screen.getByRole('heading', { name: 'Review the exact cart change' })).toBeVisible()
    expect(screen.getByText(/no item is in the cart and no payment has been taken/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Approve exact cart' }))
    expect(screen.getByText(/you approved one exact cart patch/i)).toBeVisible()
    expect(screen.getAllByText(/apply_approved_cart/).length).toBeGreaterThan(1)

    await user.click(screen.getByRole('button', { name: 'Simulate the approved one-use tool' }))
    expect(screen.getByRole('heading', { name: 'Your cart is ready.' })).toBeVisible()
    expect(screen.getByText(/4 items · \$345 · \$0 charged/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue to checkout' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Simulate the approved one-use tool' })).not.toBeInTheDocument()
  })

  it('lets the person decline an exact proposal without changing the cart', async () => {
    const user = userEvent.setup()
    render(<ShoppingApp />)
    await screen.findByText('7 modeled tools · native unavailable')
    await user.click(screen.getByText('No compatible agent? Run the same visible demo journey'))
    await user.click(screen.getByRole('button', { name: 'Build the first look' }))
    await user.click(screen.getByRole('button', { name: 'Change delivery to the event hotel' }))
    await user.click(screen.getByRole('button', { name: 'Repair delivery and budget' }))
    await user.click(screen.getByRole('button', { name: 'Prepare exact cart review' }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(screen.queryByRole('heading', { name: 'Your cart is ready.' })).not.toBeInTheDocument()
    expect(screen.queryByText(/you approved one exact cart patch/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Still empty')).toHaveLength(1)
  })
})
