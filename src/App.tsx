import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { MissionControl as MissionControlView } from './components/mission-control/MissionControl'
import type {
  ApprovalState,
  AtmosphereCondition,
  CircuitNode,
  LedgerEntry,
  LaunchState,
  MissionPhase as ViewMissionPhase,
} from './components/mission-control/types'
import { createMissionControl } from './domain'
import type {
  MissionSnapshot,
  MissionToolsRegistration,
} from './types'
import { registerMissionTools } from './webmcp'
import './App.css'

const approvalRequest = {
  title: 'Reroute power to guidance',
  description:
    'Guidance needs one exact 15 kW transfer from the reserve bus. Approval creates a temporary repair tool; it does not launch the vehicle.',
  fields: [
    { label: 'Scope', value: 'Guidance power only' },
    { label: 'Amount', value: '15 kW', emphasis: true },
    { label: 'Authority', value: 'One use' },
    { label: 'Final command', value: 'Human only' },
  ],
  confirmation:
    'The authority disappears after use or revocation. Launch remains yours.',
} as const

const phaseLabels: Record<MissionSnapshot['phase'], string> = {
  checks: 'Systems need attention',
  'awaiting-approval': 'Approval required',
  approved: 'Repair path authorized',
  launched: 'Launch complete',
}

const repairStateToCircuit: Record<
  MissionSnapshot['repairPlan'][number]['status'],
  CircuitNode['state']
> = {
  blocked: 'locked',
  available: 'available',
  'awaiting-approval': 'active',
  authorized: 'active',
  complete: 'complete',
}

function finalActivity(snapshot: MissionSnapshot) {
  return snapshot.activity.at(-1)?.message ?? 'Mission state is ready.'
}

function approvalState(snapshot: MissionSnapshot): ApprovalState {
  if (snapshot.pendingAuthority) return 'required'
  if (snapshot.proposal?.status === 'denied') return 'declined'
  if (snapshot.proposal?.status === 'revoked') return 'revoked'
  if (snapshot.proposal?.status === 'approved') return 'approved'
  return 'waiting'
}

function approvalMessage(snapshot: MissionSnapshot) {
  if (snapshot.activeGrant) {
    return 'The exact one-use repair is available to the agent or the manual controls.'
  }
  if (snapshot.launchReady || snapshot.phase === 'launched') {
    return 'The approval was consumed by the repair. The final command is still yours.'
  }
  return undefined
}

function atmosphereCondition(snapshot: MissionSnapshot): AtmosphereCondition {
  if (snapshot.phase === 'launched' || snapshot.launchReady) return 'clear'
  if (snapshot.pendingAuthority || snapshot.activeGrant) return 'watch'
  return 'storm'
}

function activityTone(
  kind: MissionSnapshot['activity'][number]['kind'],
): LedgerEntry['tone'] {
  if (kind === 'power-reroute-requested') return 'attention'
  if (kind === 'power-reroute-denied' || kind === 'power-reroute-revoked') {
    return 'danger'
  }
  if (kind === 'mission-started') return 'neutral'
  return 'positive'
}

function App() {
  const [control, setControl] = useState(createMissionControl)
  const subscribe = useCallback(
    (onStoreChange: () => void) => control.subscribe(() => onStoreChange()),
    [control],
  )
  const getSnapshot = useCallback(() => control.getSnapshot(), [control])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [registration, setRegistration] =
    useState<MissionToolsRegistration | null>(null)
  const [registeredToolNames, setRegisteredToolNames] = useState<
    readonly string[]
  >([])
  const [registrationPending, setRegistrationPending] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let activeRegistration: MissionToolsRegistration | null = null

    void registerMissionTools(control)
      .then(async (nextRegistration) => {
        activeRegistration = nextRegistration
        if (cancelled) {
          await nextRegistration.dispose()
          return
        }
        setRegistration(nextRegistration)
        setRegisteredToolNames(await nextRegistration.getRegisteredToolNames())
        setRegistrationPending(false)
      })
      .catch(() => {
        if (cancelled) return
        setRegistrationPending(false)
        setActionError(
          'Browser tool setup did not finish. The manual controls remain available.',
        )
      })

    return () => {
      cancelled = true
      if (activeRegistration) void activeRegistration.dispose()
    }
  }, [control])

  useEffect(() => {
    if (!registration) return
    let cancelled = false
    void registration.whenIdle().then(async () => {
      const names = await registration.getRegisteredToolNames()
      if (!cancelled) setRegisteredToolNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [registration, snapshot.revision])

  const act = useCallback((action: () => MissionSnapshot) => {
    try {
      action()
      setActionError(null)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'That action could not run.',
      )
    }
  }, [])

  const communications = snapshot.systems.find(
    (system) => system.id === 'communications-relay',
  )
  const navigation = snapshot.systems.find(
    (system) => system.id === 'navigation-array',
  )
  const guidance = snapshot.systems.find(
    (system) => system.id === 'guidance-power',
  )

  const circuitNodes: CircuitNode[] = [
    ...snapshot.repairPlan.map((step) => ({
      id: step.id,
      label: step.label,
      detail: step.procedure,
      state: repairStateToCircuit[step.status],
    })),
    {
      id: 'human-launch',
      label: 'Human launch command',
      detail: 'Never exposed as an agent tool.',
      state:
        snapshot.phase === 'launched'
          ? 'complete'
          : snapshot.launchReady
            ? 'available'
            : 'locked',
    },
  ]

  const ledgerEntries: LedgerEntry[] = snapshot.activity.map((entry, index) => ({
    id: entry.id,
    time: `T+${String(entry.sequence - 1).padStart(2, '0')}`,
    title: entry.message,
    tone: activityTone(entry.kind),
    current: index === snapshot.activity.length - 1,
  }))

  const viewPhase: ViewMissionPhase = snapshot.phase
  const launchState: LaunchState =
    snapshot.phase === 'launched'
      ? 'launched'
      : snapshot.launchReady
        ? 'ready'
        : 'locked'

  const registrationError = registration?.getLastError()
  const agentStatus = registrationPending
    ? 'Checking this browser…'
    : registrationError
      ? 'Native tool registration needs attention'
      : registration?.supported
        ? `${registeredToolNames.length} agent tools live`
        : 'Manual demo mode'

  const canRequestPower =
    communications?.status === 'ready' &&
    navigation?.status === 'ready' &&
    guidance?.status !== 'ready' &&
    !snapshot.pendingAuthority &&
    !snapshot.activeGrant

  const operatorControls = (
    <section className="operator-console" aria-labelledby="operator-title">
      <div className="operator-console__copy">
        <span className="experience__eyebrow">Guided fallback</span>
        <h2 id="operator-title">No agent connected? Run the same controls here.</h2>
        <p aria-live="polite">
          {actionError ? `Action stopped: ${actionError}` : finalActivity(snapshot)}
        </p>
      </div>
      <div className="operator-console__actions">
        <button
          type="button"
          onClick={() =>
            act(() => control.restartCommunicationsRelay(snapshot.revision))
          }
          disabled={communications?.status === 'ready' || snapshot.phase === 'launched'}
        >
          Restart relay
        </button>
        <button
          type="button"
          onClick={() =>
            act(() => control.recalibrateNavigationArray(snapshot.revision))
          }
          disabled={navigation?.status === 'ready' || snapshot.phase === 'launched'}
        >
          Recalibrate navigation
        </button>
        <button
          type="button"
          onClick={() => act(() => control.requestPowerReroute(snapshot.revision))}
          disabled={!canRequestPower || snapshot.phase === 'launched'}
        >
          Request power approval
        </button>
        <button
          className="operator-console__action--quiet"
          type="button"
          disabled={registrationPending}
          onClick={() => {
            setActionError(null)
            setRegistration(null)
            setRegisteredToolNames([])
            setRegistrationPending(true)
            setControl(createMissionControl())
          }}
        >
          {registrationPending ? 'Preparing demo…' : 'Restart demo'}
        </button>
      </div>
    </section>
  )

  return (
    <div className="experience">
      <header className="experience__briefing">
        <div>
          <span className="experience__eyebrow">Open for Agents experiment</span>
          <h1>One mission. Eight tools. One decision only you can make.</h1>
          <p>
            Ask a browser agent to diagnose the launch. It can make the safe
            repairs, but the final power reroute appears only after your exact
            approval—and launch never becomes an agent tool.
          </p>
        </div>
        <div className="experience__agent-state" aria-live="polite">
          <span
            className={registration?.supported ? 'is-connected' : ''}
            aria-hidden="true"
          />
          <div>
            <small>Agent link</small>
            <strong>{agentStatus}</strong>
          </div>
        </div>
      </header>

      <main>
        <MissionControlView
          title="Launch Window A-01"
          description="A live simulation of bounded agent authority and human control."
          phase={viewPhase}
          phaseLabel={phaseLabels[snapshot.phase]}
          atmosphere={{
            condition: atmosphereCondition(snapshot),
            label:
              snapshot.phase === 'launched'
                ? 'Vehicle away'
                : snapshot.launchReady
                  ? 'Flight corridor clear'
                  : 'Launch corridor on hold',
            detail:
              snapshot.phase === 'launched'
                ? 'The vehicle has cleared the tower.'
                : 'Conditions respond to the current repair state.',
          }}
          rocket={{ rocketName: 'Aster / 01' }}
          systems={{ systems: snapshot.systems }}
          circuit={{ nodes: circuitNodes }}
          controls={operatorControls}
          approval={{
            request: approvalRequest,
            state: approvalState(snapshot),
            stateMessage: approvalMessage(snapshot),
            onApprove: snapshot.pendingAuthority
              ? () =>
                  act(() =>
                    control.approvePowerReroute(
                      snapshot.pendingAuthority?.proposalId ?? '',
                    ),
                  )
              : undefined,
            onDecline: snapshot.pendingAuthority
              ? () =>
                  act(() =>
                    control.denyPowerReroute(
                      snapshot.pendingAuthority?.proposalId ?? '',
                    ),
                  )
              : undefined,
            onUseAuthority: snapshot.activeGrant
              ? () =>
                  act(() =>
                    control.applyPowerReroute(
                      snapshot.activeGrant?.id ?? '',
                      snapshot.revision,
                    ),
                  )
              : undefined,
            onRevokeAuthority: snapshot.activeGrant
              ? () =>
                  act(() =>
                    control.revokePowerReroute(snapshot.activeGrant?.id ?? ''),
                  )
              : undefined,
            onRequestAgain:
              canRequestPower &&
              (snapshot.proposal?.status === 'denied' ||
                snapshot.proposal?.status === 'revoked')
                ? () => act(() => control.requestPowerReroute(snapshot.revision))
                : undefined,
            approveLabel: 'Authorize one repair',
            declineLabel: 'Keep power unchanged',
            useAuthorityLabel: 'Use one-use reroute',
            revokeAuthorityLabel: 'Revoke authority',
            requestAgainLabel: 'Request a new approval',
          }}
          ledger={{ entries: ledgerEntries }}
          launch={{
            state: launchState,
            onLaunch: snapshot.launchReady
              ? () => act(() => control.launch())
              : undefined,
            buttonLabel: 'Launch Aster',
          }}
        />
      </main>

      <footer className="experience__footer">
        <p>
          This is a local simulation. No model, account, spacecraft or external
          service is connected.
        </p>
        <p>
          Native WebMCP:{' '}
          {registrationPending
            ? 'checking'
            : registration?.supported
              ? 'available'
              : 'not available'}
          {' · '}Revision {snapshot.revision}
          {' · '}Launch is not registered as a tool
        </p>
      </footer>
    </div>
  )
}

export default App
