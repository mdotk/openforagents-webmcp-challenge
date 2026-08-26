import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import FittingRoomApp from './FittingRoomApp'

afterEach(cleanup)

describe('Shared fitting-room technical prototype', () => {
  it('shows the saved brief and keeps the unsupported-browser claim honest', async () => {
    render(<FittingRoomApp />)

    expect(
      screen.getByRole('heading', {
        name: 'Describe the look. Let your agent do the shopping.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/couture vampire look for Saturday/i)).toBeVisible()
    expect(await screen.findByText('7 modeled tools · native unavailable')).toBeVisible()
    expect(screen.getByText('Prompt your browser agent')).toBeVisible()
    expect(
      screen.getByText(/all products, quantities, reviews and holds/i),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Return to Launch Window A-01' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('completes the human correction, inventory replan and one-use hold journey', async () => {
    const user = userEvent.setup()
    render(<FittingRoomApp />)
    await screen.findByText('7 modeled tools · native unavailable')

    await user.click(screen.getByRole('button', { name: 'Build first look' }))
    expect(screen.getAllByText('Blood Moon Bias Skirt')).toHaveLength(2)
    expect(screen.getByAltText(/first-look outfit/i)).toBeVisible()
    expect(screen.getByText('Every hard rule passes')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Pin the vest as human' }))
    expect(screen.getByText('Pinned by you')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Revise to all black' }))
    expect(screen.getAllByText('Cathedral Black Satin Skirt')).toHaveLength(2)
    expect(screen.getByAltText(/sheer organza sleeves/i)).toBeVisible()
    expect(screen.getByText('$248')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Apply demo inventory update' }),
    )
    expect(
      screen.getByText('Opera Organza Sleeves is not available for Friday pickup.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Request exact review' }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Use valid sleeve substitute' }),
    )
    expect(screen.getAllByText('Wraith Bell-Sleeve Shrug')).toHaveLength(2)
    expect(screen.getByAltText(/bell-sleeve shrug/i)).toBeVisible()
    expect(screen.getByText('$242')).toBeVisible()
    expect(screen.getByText('Every hard rule passes')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Request exact review' }))
    expect(screen.getByText(/\$0 charged · no hold yet/)).toBeVisible()
    expect(screen.getByText('Status: pending')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Approve exact demo hold' }),
    )
    expect(screen.getByText('Status: approved')).toBeVisible()
    expect(screen.getAllByText(/reserve_approved_look/).length).toBeGreaterThan(1)

    await user.click(
      screen.getByRole('button', { name: 'Use approved hold once' }),
    )
    expect(screen.getByRole('heading', { name: 'FF-DEMO-001' })).toBeVisible()
    expect(screen.getByText('Status: consumed')).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'Continue to human checkout (not implemented)',
      }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Use approved hold once' }),
    ).not.toBeInTheDocument()
  })
})
