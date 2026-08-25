import { describe, expect, it, vi } from 'vitest'
import {
  createMissionControl,
  MissionStateError,
  RevisionConflictError,
} from './mission-control'

function repairInspectableSystems() {
  const control = createMissionControl()
  control.restartCommunicationsRelay(0)
  control.recalibrateNavigationArray(1)
  return control
}

describe('createMissionControl', () => {
  it('rejects a stale revision without changing state', () => {
    const control = createMissionControl()

    control.restartCommunicationsRelay(0)

    expect(() => control.recalibrateNavigationArray(0)).toThrow(
      RevisionConflictError,
    )
    expect(control.getSnapshot().revision).toBe(1)
    expect(
      control
        .getSnapshot()
        .systems.find((system) => system.id === 'navigation-array')?.status,
    ).toBe('attention')
  })

  it('publishes immutable snapshots to subscribers', () => {
    const control = createMissionControl()
    const subscriber = vi.fn()
    const unsubscribe = control.subscribe(subscriber)

    const next = control.restartCommunicationsRelay(0)

    expect(subscriber).toHaveBeenCalledOnce()
    expect(subscriber).toHaveBeenCalledWith(next)
    expect(Object.isFrozen(next)).toBe(true)
    expect(Object.isFrozen(next.systems)).toBe(true)

    unsubscribe()
    control.recalibrateNavigationArray(1)
    expect(subscriber).toHaveBeenCalledOnce()
  })

  it('supports denying a proposal and requesting a new one', () => {
    const control = repairInspectableSystems()
    const requested = control.requestPowerReroute(2)
    const firstProposalId = requested.proposal?.id

    expect(firstProposalId).toBe('power-reroute-proposal-001')
    expect(requested.pendingAuthority?.proposalId).toBe(firstProposalId)

    const denied = control.denyPowerReroute(firstProposalId ?? '')
    expect(denied.proposal?.status).toBe('denied')
    expect(denied.pendingAuthority).toBeNull()
    expect(denied.activeGrant).toBeNull()

    const requestedAgain = control.requestPowerReroute(denied.revision)
    expect(requestedAgain.proposal?.id).toBe('power-reroute-proposal-002')
  })

  it('creates and revokes an exact one-use grant', () => {
    const control = repairInspectableSystems()
    const requested = control.requestPowerReroute(2)
    const approved = control.approvePowerReroute(requested.proposal?.id ?? '')
    const grantId = approved.activeGrant?.id

    expect(grantId).toBe('power-reroute-grant-001')
    expect(approved.pendingAuthority).toBeNull()
    expect(approved.repairPlan.at(-1)?.status).toBe('authorized')

    const revoked = control.revokePowerReroute(grantId ?? '')
    expect(revoked.activeGrant).toBeNull()
    expect(revoked.proposal?.status).toBe('revoked')
    expect(revoked.launchReady).toBe(false)
    expect(() => control.revokePowerReroute(grantId ?? '')).toThrow(
      MissionStateError,
    )
  })

  it('consumes a grant once and leaves launch as a human-only action', () => {
    const control = repairInspectableSystems()
    const requested = control.requestPowerReroute(2)
    const approved = control.approvePowerReroute(requested.proposal?.id ?? '')
    const grantId = approved.activeGrant?.id ?? ''

    const applied = control.applyPowerReroute(grantId, approved.revision)

    expect(applied.activeGrant).toBeNull()
    expect(applied.launchReady).toBe(true)
    expect(applied.systems.at(-1)?.reading.value).toBe('85 kW')
    expect(() =>
      control.applyPowerReroute(grantId, applied.revision),
    ).toThrow(MissionStateError)

    const launched = control.launch()
    expect(launched.phase).toBe('launched')
    expect(launched.launchReady).toBe(false)
  })
})
