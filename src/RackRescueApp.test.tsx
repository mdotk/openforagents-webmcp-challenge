import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import RackRescueApp from './RackRescueApp'

afterEach(cleanup)

describe('Rack Rescue experience', () => {
  it('states the human-agent problem and keeps unsupported-browser claims honest', async () => {
    render(<RackRescueApp />)

    expect(screen.getByRole('heading', { name: 'Keep my mug here. Fit everything else.' })).toBeVisible()
    expect(screen.getByText(/your browser agent works out how to load every other dish/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Keep this mug here.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep this mug here' })).toBeVisible()
    expect(await screen.findByText('Agent tools are unavailable — try the guided demo below')).toBeVisible()
    expect(screen.queryByText('Revision 0')).not.toBeVisible()
    expect(screen.queryByText('5 modeled tools · native unavailable')).not.toBeVisible()
    expect(screen.queryByText('0 conflicts')).not.toBeInTheDocument()
  })

  it('shows a blocked plan, corrects it, reveals the tray and adapts without moving the mug', async () => {
    const user = userEvent.setup()
    render(<RackRescueApp />)
    await screen.findByText('Agent tools are unavailable — try the guided demo below')

    await user.click(screen.getByRole('button', { name: 'Keep this mug here' }))
    expect(screen.getByLabelText('Pinned by you')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Your mug is safe.' })).toBeVisible()
    expect(screen.getByText(/fit every visible dish into the rack/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copy request' })).toBeVisible()

    await user.click(screen.getByText('No browser agent? Try the guided demo'))
    await user.click(screen.getByRole('button', { name: 'Try a layout that blocks the spray arm' }))
    expect(screen.getByRole('heading', { name: 'That layout blocks the wash.' })).toBeVisible()
    expect(screen.getByText('Nothing moved. The agent can revise the plan safely.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Try a safer layout' }))
    expect(screen.getByRole('heading', { name: 'This plan fits.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Load this safe layout' }))
    expect(screen.getByRole('heading', { name: 'Wait—one more thing.' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Add the roasting tray' }))
    expect(screen.getByRole('heading', { name: 'Make room for the tray.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Find room for the roasting tray' }))
    await user.click(screen.getByRole('button', { name: 'Load this safe layout' }))
    expect(screen.getByRole('heading', { name: 'Everything fits.' })).toBeVisible()
    expect(screen.getByText('14 dishes loaded. Your mug never moved. The spray arm is clear.')).toBeVisible()
    expect(screen.getByAltText('Your red mug')).toBeVisible()
    expect(screen.getByAltText('Forgotten roasting tray')).toBeVisible()
  })
})
