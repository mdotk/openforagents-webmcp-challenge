import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { MissionControl as MissionControlView } from './components/mission-control/MissionControl'
import type {
  CapabilityGroup,
  TemporaryCapabilityState,
} from './components/mission-control/CapabilityCircuit'
import type {
  ApprovalState,
  AtmosphereCondition,
  LedgerEntry,
  LaunchState,
  MissionPhase as ViewMissionPhase,
} from './components/mission-control/types'
import { createMissionControl } from './domain'
import type {
  MissionSnapshot,
  MissionToolsRegistration,
} from './types'
import { permanentMissionToolNames, registerMissionTools } from './webmcp'
import './App.css'

const approvalRequest = {
  title: 'Reroute power to guidance',
  description:
    'Guidance needs one exact 15 kW transfer from the reserve bus. Approval creates a temporary repair tool; it does not launch the vehicle.',
  fields: [
    { label: 'Scope', value: 'Guidance power only' },
    { label: 'Amount', value: '15 kW', emphasis: true },
    { label: 'Authority', value: 'One use' },
    { label: 'Final command', value: 'Visible page control' },
  ],
  confirmation:
    'The tool disappears after use or revocation. Launch is not exposed through WebMCP.',
} as const

const capabilityGroups: readonly CapabilityGroup[] = [
  {
    id: 'read',
    label: 'Read tools',
    detail: 'Inspect state without changing it.',
    tone: 'read',
    toolNames: permanentMissionToolNames.slice(0, 4),
  },
  {
    id: 'repair',
    label: 'Bounded repairs',
    detail: 'Restart the relay or recalibrate navigation.',
    tone: 'repair',
    toolNames: permanentMissionToolNames.slice(4, 6),
  },
  {
    id: 'request',
    label: 'Approval request',
    detail: 'Ask for the 15 kW decision; do not apply it.',
    tone: 'request',
    toolNames: permanentMissionToolNames.slice(6),
  },
]

const phaseLabels: Record<MissionSnapshot['phase'], string> = {
  checks: 'Systems need attention',
  'awaiting-approval': 'Approval required',
  approved: 'Repair path authorized',
  launched: 'Launch complete',
}

function finalActivity(snapshot: MissionSnapshot) {
  return snapshot.activity.at(-1)?.message ?? 'Mission state is ready.'
}

function heroTitle(snapshot: MissionSnapshot) {
  if (snapshot.phase === 'launched') {
    return 'Launch complete. The systems were repaired. You approved. You launched.'
  }
  if (snapshot.launchReady) {
    return 'The repairs are complete. Launch stays in your hands.'
  }
  if (snapshot.activeGrant) {
    return 'Approved: one exact repair is available now.'
  }
  if (snapshot.pendingAuthority) {
    return 'The routine repairs are done. Power is your decision.'
  }
  return 'Repair a rocket with an agent. Approve one consequential step. Launch it yourself.'
}

function heroDescription(snapshot: MissionSnapshot) {
  if (snapshot.phase === 'launched') {
    return 'The one-use repair tool is gone. Seven WebMCP tools remain, and launch was completed only through the visible page control.'
  }
  if (snapshot.launchReady) {
    return 'The approved repair ran once and disappeared. Seven WebMCP tools remain. Launch Aster is available only from this page.'
  }
  if (snapshot.activeGrant) {
    return 'Your approval created one temporary tool for this exact 15 kW repair. Use it or revoke it before continuing.'
  }
  if (snapshot.pendingAuthority) {
    return 'The agent can ask for the 15 kW decision, but it cannot reroute the power until you approve it.'
  }
  return 'Seven WebMCP tools let an agent inspect the mission, make two routine repairs and ask for the 15 kW power decision. Your approval creates one temporary repair tool. Launch stays on this page.'
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
    return 'The exact one-use repair is approved. Use it or revoke it before continuing.'
  }
  if (snapshot.launchReady || snapshot.phase === 'launched') {
    return 'The repair consumed the approval. Launch is available through the visible page control, not WebMCP.'
  }
  return undefined
}

function temporaryCapabilityState(
  snapshot: MissionSnapshot,
): TemporaryCapabilityState {
  if (snapshot.activeGrant) return 'available'
  if (snapshot.pendingAuthority) return 'awaiting-approval'
  if (snapshot.proposal?.status === 'revoked') return 'revoked'
  if (snapshot.proposal?.status === 'denied') return 'declined'
  if (snapshot.launchReady || snapshot.phase === 'launched') return 'consumed'
  return 'unavailable'
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

  const routineRepairsComplete =
    communications?.status === 'ready' && navigation?.status === 'ready'
  const powerRepairComplete = guidance?.status === 'ready'

  const journeySteps = [
    {
      number: '01',
      actor: 'Agent',
      title: 'Inspect and repair',
      detail: 'Restore communications and navigation.',
      state: routineRepairsComplete ? 'complete' : 'active',
    },
    {
      number: '02',
      actor: snapshot.activeGrant ? 'Agent' : 'You',
      title: snapshot.activeGrant ? 'Use approved repair' : 'Approve power',
      detail: snapshot.activeGrant
        ? 'Apply the exact, one-use power reroute.'
        : 'Create one exact, one-use repair.',
      state: powerRepairComplete
        ? 'complete'
        : routineRepairsComplete
          ? 'active'
          : 'waiting',
    },
    {
      number: '03',
      actor: 'You',
      title: 'Launch Aster',
      detail: 'Use the page control—not an agent tool.',
      state:
        snapshot.phase === 'launched'
          ? 'complete'
          : snapshot.launchReady
            ? 'active'
            : 'waiting',
    },
  ] as const

  const operatorControls = (
    <section className="operator-console" aria-labelledby="operator-title">
      <div className="operator-console__copy">
        <span className="experience__eyebrow">Manual fallback</span>
        <strong id="operator-title">
          No agent connected? Use the visible controls.
        </strong>
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
        <div className="experience__briefing-copy">
          <span className="experience__eyebrow">Open for Agents experiment</span>
          <h1>{heroTitle(snapshot)}</h1>
          <p>{heroDescription(snapshot)}</p>
        </div>
        <div className="experience__agent-state" aria-live="polite">
          <span
            className={registration?.supported ? 'is-connected' : ''}
            aria-hidden="true"
          />
          <div>
            <small>WebMCP surface</small>
            <strong>{agentStatus}</strong>
          </div>
        </div>

        <ol className="experience__journey" aria-label="Mission sequence">
          {journeySteps.map((step) => (
            <li
              className={`experience__journey-step experience__journey-step--${step.state}`}
              key={step.number}
              aria-current={step.state === 'active' ? 'step' : undefined}
            >
              <span className="experience__journey-number" aria-hidden="true">
                {step.number}
              </span>
              <span className="experience__journey-copy">
                <small>{step.actor}</small>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </span>
              <span className="experience__journey-state">
                {step.state === 'complete'
                  ? 'Done'
                  : step.state === 'active'
                    ? 'Current'
                    : 'Next'}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <main>
        <MissionControlView
          title="Launch Window A-01"
          description="Three flight systems stand between the vehicle and launch."
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
          circuit={{
            groups: capabilityGroups,
            registeredToolNames,
            temporaryToolName: 'apply_power_reroute',
            temporaryState: temporaryCapabilityState(snapshot),
            nativeSupported: registration?.supported === true,
            registrationPending,
            registrationError: Boolean(registrationError),
            launchLabel: 'Launch Aster',
          }}
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
