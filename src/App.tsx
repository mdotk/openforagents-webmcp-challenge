import {
  useCallback,
  useEffect,
  useRef,
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
  title: 'Approve a 15 kW power reroute?',
  description:
    'Approval gives the agent one temporary repair tool. It can use it once.',
  fields: [
    { label: 'Changes', value: 'Guidance power only' },
    { label: 'Amount', value: '15 kW', emphasis: true },
    { label: 'Expires', value: 'After one use' },
  ],
  confirmation: 'This does not launch the rocket.',
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

function routineRepairsAreComplete(snapshot: MissionSnapshot) {
  return ['communications-relay', 'navigation-array'].every(
    (id) => snapshot.systems.find((system) => system.id === id)?.status === 'ready',
  )
}

function heroTitle(snapshot: MissionSnapshot) {
  if (snapshot.phase === 'launched') {
    return 'Aster has launched.'
  }
  if (snapshot.launchReady) {
    return 'Aster is ready. You launch it.'
  }
  if (snapshot.activeGrant) {
    return 'One approved repair is ready.'
  }
  if (snapshot.pendingAuthority) {
    return 'The agent is waiting for your decision.'
  }
  if (routineRepairsAreComplete(snapshot)) {
    return 'Two systems are repaired. One decision remains.'
  }
  return 'Get Aster ready for launch.'
}

function heroDescription(snapshot: MissionSnapshot) {
  if (snapshot.phase === 'launched') {
    return 'The agent repaired the systems. You approved the power reroute. You launched.'
  }
  if (snapshot.launchReady) {
    return 'All three systems are ready. Launch is a page control, not an agent tool.'
  }
  if (snapshot.activeGrant) {
    return 'The agent can use this exact repair once. Then the tool disappears.'
  }
  if (snapshot.pendingAuthority) {
    return 'Routine repairs are complete. Approve or reject the 15 kW power reroute.'
  }
  if (routineRepairsAreComplete(snapshot)) {
    return 'The agent can now ask for permission to reroute power.'
  }
  return 'The agent repairs two systems. You approve the power reroute. You launch.'
}

function currentMissionStep(
  snapshot: MissionSnapshot,
  agentToolsAvailable: boolean,
) {
  if (snapshot.phase === 'launched') {
    return {
      number: 3,
      label: 'Complete',
      actor: 'Mission complete',
      detail: 'The one-use repair tool is gone.',
    }
  }
  if (snapshot.launchReady) {
    return {
      number: 3,
      label: 'Step 3 of 3 · You',
      actor: 'Launch Aster',
      detail: 'Launch is not one of the agent tools.',
    }
  }
  if (snapshot.activeGrant) {
    return {
      number: 2,
      label: 'Step 2 of 3 · Agent',
      actor: 'Apply the approved power reroute',
      detail: 'This repair is available once.',
    }
  }
  if (snapshot.pendingAuthority) {
    return {
      number: 2,
      label: 'Step 2 of 3 · You',
      actor: 'Decide whether to reroute power',
      detail: 'Nothing happens until you choose.',
    }
  }
  if (routineRepairsAreComplete(snapshot)) {
    return {
      number: 2,
      label: 'Step 2 of 3 · Agent',
      actor: 'Ask for your power decision',
      detail: 'You choose whether to reroute 15 kW.',
    }
  }
  return {
    number: 1,
    label: 'Step 1 of 3 · Agent',
    actor: 'Repair communications and navigation',
    detail: agentToolsAvailable
      ? 'Try asking: “Get Aster ready for launch.”'
      : 'Use the controls below to repair both systems.',
  }
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
  const relayActionRef = useRef<HTMLButtonElement>(null)
  const navigationActionRef = useRef<HTMLButtonElement>(null)
  const requestPowerActionRef = useRef<HTMLButtonElement>(null)
  const previousRevisionRef = useRef(snapshot.revision)

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

  const routineRepairsComplete = routineRepairsAreComplete(snapshot)
  const currentStep = currentMissionStep(
    snapshot,
    registration?.supported === true,
  )
  const showApproval =
    snapshot.pendingAuthority !== null ||
    snapshot.activeGrant !== null ||
    snapshot.proposal !== null

  useEffect(() => {
    const previousRevision = previousRevisionRef.current
    previousRevisionRef.current = snapshot.revision

    if (
      previousRevision === snapshot.revision ||
      showApproval ||
      snapshot.phase === 'launched' ||
      document.activeElement !== document.body
    ) {
      return
    }

    if (communications?.status !== 'ready') {
      relayActionRef.current?.focus()
      return
    }
    if (navigation?.status !== 'ready') {
      navigationActionRef.current?.focus()
      return
    }
    if (canRequestPower) requestPowerActionRef.current?.focus()
  }, [
    canRequestPower,
    communications?.status,
    navigation?.status,
    showApproval,
    snapshot.phase,
    snapshot.revision,
  ])

  const operatorPrompt = snapshot.phase === 'launched'
    ? 'Restart the demo to run the mission again.'
    : snapshot.launchReady
      ? 'All systems are ready. Launch below.'
      : snapshot.activeGrant
        ? 'Use or revoke the approved repair below.'
        : snapshot.pendingAuthority
          ? 'Make the power decision below.'
          : routineRepairsComplete
            ? 'Request the power decision.'
            : 'Repair the routine faults.'

  const operatorControls = (
    <section className="operator-console" aria-labelledby="operator-title">
      <div className="operator-console__copy">
        <span className="experience__eyebrow">Without an agent</span>
        <strong id="operator-title">{operatorPrompt}</strong>
        {actionError ? (
          <p aria-live="polite">Action stopped: {actionError}</p>
        ) : null}
      </div>
      <div className="operator-console__actions">
        {communications?.status !== 'ready' && snapshot.phase !== 'launched' ? (
          <button
            ref={relayActionRef}
            type="button"
            onClick={() =>
              act(() => control.restartCommunicationsRelay(snapshot.revision))
            }
          >
            Restart relay
          </button>
        ) : null}
        {navigation?.status !== 'ready' && snapshot.phase !== 'launched' ? (
          <button
            ref={navigationActionRef}
            type="button"
            onClick={() =>
              act(() => control.recalibrateNavigationArray(snapshot.revision))
            }
          >
            Recalibrate navigation
          </button>
        ) : null}
        {canRequestPower && snapshot.phase !== 'launched' ? (
          <button
            ref={requestPowerActionRef}
            type="button"
            onClick={() => act(() => control.requestPowerReroute(snapshot.revision))}
          >
            Request power approval
          </button>
        ) : null}
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

        <section
          className="experience__current-step"
          aria-labelledby="current-step-title"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="experience__current-step-label">
            {currentStep.label}
          </span>
          <strong id="current-step-title">{currentStep.actor}</strong>
          <span className="experience__current-step-detail">
            {currentStep.detail}
          </span>
          <span
            className="experience__current-step-progress"
            aria-label={`${currentStep.number} of 3 steps reached`}
          >
            {[1, 2, 3].map((step) => (
              <i
                className={step <= currentStep.number ? 'is-reached' : ''}
                key={step}
              />
            ))}
          </span>
        </section>
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
          approval={showApproval ? {
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
              approveLabel: 'Approve one repair',
              declineLabel: 'Do not reroute power',
              useAuthorityLabel: 'Apply approved repair',
              revokeAuthorityLabel: 'Revoke authority',
              requestAgainLabel: 'Request a new approval',
            } : undefined}
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
