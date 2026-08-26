import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

async function completeSafeRepairs(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Restart relay' }))
  await user.click(
    screen.getByRole('button', { name: 'Recalibrate navigation' }),
  )
  await user.click(
    screen.getByRole('button', { name: 'Request power approval' }),
  )
}

describe('Mission Control experience', () => {
  it('leads with the human and agent sequence while keeping exact tools secondary', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Repair a rocket with an agent. Approve one consequential step. Launch it yourself.',
      }),
    ).toBeInTheDocument()
    const sequence = screen.getByRole('list', { name: 'Mission sequence' })
    expect(sequence).toHaveTextContent('Agent')
    expect(sequence).toHaveTextContent('Inspect and repair')
    expect(sequence).toHaveTextContent('Approve power')
    expect(sequence).toHaveTextContent('Launch Aster')
    expect(sequence).toHaveTextContent('Current')
    expect(screen.getByText('7 modeled capabilities')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Native WebMCP is unavailable here. The visible controls use the same mission rules.',
      ),
    ).toBeInTheDocument()

    const disclosure = screen
      .getByText('View exact tools and lifecycle')
      .closest('details')
    expect(disclosure).not.toHaveAttribute('open')

    await user.click(screen.getByText('View exact tools and lifecycle'))
    expect(disclosure).toHaveAttribute('open')
    expect(screen.getByText('Permanent WebMCP surface')).toBeVisible()
  })

  it('keeps the final launch human-only through the complete manual fallback', async () => {
    const user = userEvent.setup()
    render(<App />)

    const launch = screen.getByRole('button', { name: 'Launch Aster' })
    expect(launch).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Preparing demo…' }),
    ).toBeDisabled()
    expect(await screen.findByText('Manual demo mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart demo' })).toBeEnabled()

    await completeSafeRepairs(user)
    expect(screen.getByText('Your approval is needed')).toBeInTheDocument()
    expect(launch).toBeDisabled()
    const sequence = screen.getByRole('list', { name: 'Mission sequence' })
    const approvalStep = within(sequence).getByText('Approve power').closest('li')
    expect(approvalStep).toHaveAttribute('aria-current', 'step')
    expect(approvalStep).toHaveTextContent('You')
    expect(approvalStep).toHaveTextContent('Current')

    await user.click(
      screen.getByRole('button', { name: 'Authorize one repair' }),
    )
    const approvedRepairStep = screen.getByText('Use approved repair').closest('li')
    expect(approvedRepairStep).toHaveAttribute('aria-current', 'step')
    expect(approvedRepairStep).toHaveTextContent('Agent')
    expect(approvedRepairStep).toHaveTextContent('Current')
    const useAuthority = screen.getByRole('button', {
      name: 'Use one-use reroute',
    })
    expect(useAuthority).toBeEnabled()
    expect(useAuthority).toHaveFocus()
    expect(launch).toBeDisabled()

    await user.click(useAuthority)
    expect(
      screen.queryByRole('button', { name: 'Use one-use reroute' }),
    ).not.toBeInTheDocument()
    expect(launch).toBeEnabled()
    expect(launch).toHaveFocus()
    const launchStep = within(sequence).getByText('Launch Aster').closest('li')
    expect(launchStep).toHaveAttribute('aria-current', 'step')
    expect(launchStep).toHaveTextContent('You')
    expect(launchStep).toHaveTextContent('Current')

    await user.click(launch)
    expect(
      screen.getByRole('heading', {
        name: 'Launch complete. The systems were repaired. You approved. You launched.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The one-use repair tool is gone. Seven WebMCP tools remain, and launch was completed only through the visible page control.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /vehicle away.*cleared the tower/i }),
    ).toBeInTheDocument()
  })

  it('honors denial and allows a new bounded request', async () => {
    const user = userEvent.setup()
    render(<App />)

    await completeSafeRepairs(user)
    await user.click(
      screen.getByRole('button', { name: 'Keep power unchanged' }),
    )

    expect(screen.getByText('Not approved')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request power approval' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Request a new approval' }),
    ).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Launch Aster' })).toBeDisabled()
  })

  it('shows revoked authority accurately and allows a fresh request', async () => {
    const user = userEvent.setup()
    render(<App />)

    await completeSafeRepairs(user)
    await user.click(
      screen.getByRole('button', { name: 'Authorize one repair' }),
    )
    await user.click(screen.getByRole('button', { name: 'Revoke authority' }))

    expect(screen.getByText('Approval revoked')).toBeInTheDocument()
    expect(
      screen.getByText('Request a new approval before continuing.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request power approval' }),
    ).toBeEnabled()
    const requestAgain = screen.getByRole('button', {
      name: 'Request a new approval',
    })
    expect(requestAgain).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Launch Aster' })).toBeDisabled()

    await user.click(requestAgain)
    expect(screen.getByText('Your approval is needed')).toBeInTheDocument()
  })
})
