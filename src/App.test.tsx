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

    await user.click(
      screen.getByRole('button', { name: 'Authorize one repair' }),
    )
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

    await user.click(launch)
    expect(screen.getAllByText('Launch complete').length).toBeGreaterThan(0)
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
