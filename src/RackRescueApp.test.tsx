import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import RackRescueApp from './RackRescueApp'

afterEach(cleanup)

describe('Rack Rescue experience', () => {
  it('states the human-agent problem and keeps unsupported-browser claims honest', async () => {
    render(<RackRescueApp />)

    expect(screen.getByRole('heading', { name: 'Can it all fit?' })).toBeVisible()
    expect(screen.getByText(/space, safety and the dish you forgot/i)).toBeVisible()
    expect(await screen.findByText('5 modeled tools · native unavailable')).toBeVisible()
    expect(screen.getByText('13 dishes')).toBeVisible()
    expect(screen.getByText('0 conflicts')).toBeVisible()
    expect(screen.getByText('Pin one thing')).toBeVisible()
    expect(screen.getByText('Add the forgotten tray')).toBeVisible()
  })

  it('shows a blocked plan, corrects it, reveals the tray and adapts without moving the mug', async () => {
    const user = userEvent.setup()
    render(<RackRescueApp />)
    await screen.findByText('5 modeled tools · native unavailable')

    await user.click(screen.getByRole('button', { name: 'Pin my red mug' }))
    expect(screen.getByLabelText('Pinned by you')).toBeVisible()

    await user.click(screen.getByText('No compatible agent? Run the same visible prototype journey'))
    await user.click(screen.getByRole('button', { name: 'Show blocked first plan' }))
    expect(screen.getByText('Blocked plan')).toBeVisible()
    expect(screen.getByText('1 conflicts')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Correct the plan' }))
    expect(screen.getByText('Plan fits')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Apply valid preview' }))
    expect(screen.getByText('First load fitted')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Add forgotten tray' }))
    expect(screen.getByText('14 dishes')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Preview adapted plan' }))
    await user.click(screen.getByRole('button', { name: 'Apply valid preview' }))
    expect(screen.getByText('Everything fits')).toBeVisible()
    expect(screen.getByAltText('Your red mug')).toBeVisible()
    expect(screen.getByAltText('Forgotten roasting tray')).toBeVisible()
  })
})
