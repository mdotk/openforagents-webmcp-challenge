import { cleanup, render, screen } from '@testing-library/react'
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
        name: 'Get Aster ready for launch.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The agent repairs two systems. You approve the power reroute. You launch.',
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Native WebMCP is unavailable here. The visible controls use the same mission rules.',
      ),
    ).toBeInTheDocument()
    const currentStep = screen.getByRole('region', {
      name: 'Repair communications and navigation',
    })
    expect(currentStep).toHaveTextContent('Step 1 of 3 · Agent')
    expect(currentStep).toHaveTextContent(
      'Use the controls below to repair both systems.',
    )
    expect(screen.getByText('7 modeled capabilities')).toBeInTheDocument()

    const disclosure = screen
      .getByText('How the agent tools work')
      .closest('details')
    expect(disclosure).not.toHaveAttribute('open')

    await user.click(screen.getByText('How the agent tools work'))
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
    const approvalStep = screen.getByRole('region', {
      name: 'Decide whether to reroute power',
    })
    expect(approvalStep).toHaveTextContent('Step 2 of 3 · You')
    expect(approvalStep).toHaveTextContent('Nothing happens until you choose.')

    await user.click(
      screen.getByRole('button', { name: 'Approve one repair' }),
    )
    const approvedRepairStep = screen.getByRole('region', {
      name: 'Apply the approved power reroute',
    })
    expect(approvedRepairStep).toHaveTextContent('Step 2 of 3 · Agent')
    expect(approvedRepairStep).toHaveTextContent('This repair is available once.')
    const useAuthority = screen.getByRole('button', {
      name: 'Apply approved repair',
    })
    expect(useAuthority).toBeEnabled()
    expect(useAuthority).toHaveFocus()
    expect(launch).toBeDisabled()

    await user.click(useAuthority)
    expect(
      screen.queryByRole('button', { name: 'Apply approved repair' }),
    ).not.toBeInTheDocument()
    expect(launch).toBeEnabled()
    expect(launch).toHaveFocus()
    const launchStep = screen.getByRole('region', { name: 'Launch Aster' })
    expect(launchStep).toHaveTextContent('Step 3 of 3 · You')
    expect(launchStep).toHaveTextContent(
      'Launch is not one of the agent tools.',
    )

    await user.click(launch)
    expect(
      screen.getByRole('heading', {
        name: 'Aster has launched.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The agent repaired the systems. You approved the power reroute. You launched.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /vehicle away.*cleared the tower/i }),
    ).toBeInTheDocument()
  })

  it('moves to the approval-request step after the routine repairs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Restart relay' }))
    await user.click(
      screen.getByRole('button', { name: 'Recalibrate navigation' }),
    )

    const requestStep = screen.getByRole('region', {
      name: 'Ask for your power decision',
    })
    expect(requestStep).toHaveTextContent('Step 2 of 3 · Agent')
    expect(requestStep).toHaveTextContent(
      'You choose whether to reroute 15 kW.',
    )
    expect(
      screen.getByRole('button', { name: 'Request power approval' }),
    ).toBeEnabled()
    expect(
      screen.queryByRole('heading', {
        name: 'Approve a 15 kW power reroute?',
      }),
    ).not.toBeInTheDocument()
  })

  it('moves keyboard focus through contextual manual actions', async () => {
    const user = userEvent.setup()
    render(<App />)

    const restartRelay = screen.getByRole('button', { name: 'Restart relay' })
    restartRelay.focus()
    await user.click(restartRelay)

    const recalibrate = screen.getByRole('button', {
      name: 'Recalibrate navigation',
    })
    expect(recalibrate).toHaveFocus()
    await user.click(recalibrate)

    const requestPower = screen.getByRole('button', {
      name: 'Request power approval',
    })
    expect(requestPower).toHaveFocus()
    await user.click(requestPower)

    expect(
      screen.getByRole('button', { name: 'Approve one repair' }),
    ).toHaveFocus()
    expect(
      screen.getByRole('region', {
        name: 'Decide whether to reroute power',
      }),
    ).toHaveAttribute('aria-live', 'polite')
  })

  it('honors denial and allows a new bounded request', async () => {
    const user = userEvent.setup()
    render(<App />)

    await completeSafeRepairs(user)
    await user.click(
      screen.getByRole('button', { name: 'Do not reroute power' }),
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
      screen.getByRole('button', { name: 'Approve one repair' }),
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
