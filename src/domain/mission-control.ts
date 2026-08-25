import type {
  MissionActivityEntry,
  MissionActivityKind,
  MissionControl,
  MissionPhase,
  MissionSnapshot,
  MissionSubscriber,
  MissionSystem,
  PendingAuthority,
  PowerRerouteGrant,
  PowerRerouteProposal,
  RepairPlanStep,
} from '../types'

interface MissionState {
  revision: number
  communicationsReady: boolean
  navigationReady: boolean
  guidancePowerKilowatts: 70 | 85
  proposal: PowerRerouteProposal | null
  pendingAuthority: PendingAuthority | null
  activeGrant: PowerRerouteGrant | null
  activity: MissionActivityEntry[]
  launched: boolean
  nextProposalNumber: number
}

interface MissionRuntime {
  state: MissionState
  currentSnapshot: MissionSnapshot
  readonly subscribers: Set<MissionSubscriber>
}

export class RevisionConflictError extends Error {
  readonly expectedRevision: number
  readonly actualRevision: number

  constructor(expectedRevision: number, actualRevision: number) {
    super(
      `Mission revision ${expectedRevision} is stale; current revision is ${actualRevision}.`,
    )
    this.name = 'RevisionConflictError'
    this.expectedRevision = expectedRevision
    this.actualRevision = actualRevision
  }
}

export class MissionStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissionStateError'
  }
}

function activity(
  entries: readonly MissionActivityEntry[],
  kind: MissionActivityKind,
  message: string,
): MissionActivityEntry[] {
  const sequence = entries.length + 1
  return [
    ...entries,
    {
      id: `activity-${String(sequence).padStart(3, '0')}`,
      sequence,
      kind,
      message,
    },
  ]
}

function createSystems(state: MissionState): readonly MissionSystem[] {
  return [
    {
      id: 'communications-relay',
      label: 'Communications relay',
      status: state.communicationsReady ? 'ready' : 'attention',
      detail: state.communicationsReady
        ? 'Relay restarted and responding.'
        : 'Relay is offline and needs a controlled restart.',
      reading: {
        label: 'Signal',
        value: state.communicationsReady ? 'Nominal' : 'Offline',
      },
    },
    {
      id: 'navigation-array',
      label: 'Navigation array',
      status: state.navigationReady ? 'ready' : 'attention',
      detail: state.navigationReady
        ? 'Array recalibrated against the local reference.'
        : 'Array alignment is outside the launch tolerance.',
      reading: {
        label: 'Alignment',
        value: state.navigationReady ? '0.00°' : '+2.40°',
      },
    },
    {
      id: 'guidance-power',
      label: 'Guidance power',
      status: state.guidancePowerKilowatts === 85 ? 'ready' : 'attention',
      detail:
        state.guidancePowerKilowatts === 85
          ? 'Guidance has the power required for launch.'
          : 'Guidance needs an authorized 15 kW power reroute.',
      reading: {
        label: 'Available',
        value: `${state.guidancePowerKilowatts} kW`,
      },
    },
  ]
}

function createRepairPlan(state: MissionState): readonly RepairPlanStep[] {
  let powerStatus: RepairPlanStep['status'] = 'blocked'
  if (state.guidancePowerKilowatts === 85) {
    powerStatus = 'complete'
  } else if (state.activeGrant) {
    powerStatus = 'authorized'
  } else if (state.pendingAuthority) {
    powerStatus = 'awaiting-approval'
  } else if (state.communicationsReady && state.navigationReady) {
    powerStatus = 'available'
  }

  return [
    {
      id: 'restart-communications-relay',
      subsystemId: 'communications-relay',
      label: 'Restart the communications relay',
      procedure: 'Restart the local relay and confirm a nominal signal.',
      status: state.communicationsReady ? 'complete' : 'available',
    },
    {
      id: 'recalibrate-navigation-array',
      subsystemId: 'navigation-array',
      label: 'Recalibrate the navigation array',
      procedure: 'Align the array against the stored local reference.',
      status: state.navigationReady ? 'complete' : 'available',
    },
    {
      id: 'reroute-guidance-power',
      subsystemId: 'guidance-power',
      label: 'Reroute 15 kW to guidance',
      procedure:
        'Request human approval, then use the resulting one-use authorization.',
      status: powerStatus,
    },
  ]
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value)) {
      deepFreeze(nested)
    }
  }
  return value
}

function snapshot(state: MissionState): MissionSnapshot {
  const launchReady =
    state.communicationsReady &&
    state.navigationReady &&
    state.guidancePowerKilowatts === 85 &&
    !state.launched

  let phase: MissionPhase = 'checks'
  if (state.launched) {
    phase = 'launched'
  } else if (state.pendingAuthority) {
    phase = 'awaiting-approval'
  } else if (state.activeGrant || launchReady) {
    phase = 'approved'
  }

  return deepFreeze({
    revision: state.revision,
    phase,
    systems: createSystems(state),
    repairPlan: createRepairPlan(state),
    proposal: state.proposal ? { ...state.proposal } : null,
    pendingAuthority: state.pendingAuthority
      ? { ...state.pendingAuthority }
      : null,
    activeGrant: state.activeGrant ? { ...state.activeGrant } : null,
    activity: state.activity.map((entry) => ({ ...entry })),
    launchReady,
  })
}

function assertExpectedRevision(state: MissionState, expectedRevision: number) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== state.revision) {
    throw new RevisionConflictError(expectedRevision, state.revision)
  }
}

function assertNotLaunched(state: MissionState) {
  if (state.launched) {
    throw new MissionStateError('The mission has already launched.')
  }
}

function publish(runtime: MissionRuntime): MissionSnapshot {
  const nextSnapshot = snapshot(runtime.state)
  runtime.currentSnapshot = nextSnapshot
  for (const subscriber of runtime.subscribers) {
    subscriber(nextSnapshot)
  }
  return nextSnapshot
}

function replaceState(
  runtime: MissionRuntime,
  update: Omit<Partial<MissionState>, 'revision'>,
): MissionSnapshot {
  runtime.state = {
    ...runtime.state,
    ...update,
    revision: runtime.state.revision + 1,
  }
  return publish(runtime)
}

export function createMissionControl(): MissionControl {
  const initialState: MissionState = {
    revision: 0,
    communicationsReady: false,
    navigationReady: false,
    guidancePowerKilowatts: 70,
    proposal: null,
    pendingAuthority: null,
    activeGrant: null,
    activity: [
      {
        id: 'activity-001',
        sequence: 1,
        kind: 'mission-started',
        message: 'Pre-launch checks found three systems that need attention.',
      },
    ],
    launched: false,
    nextProposalNumber: 1,
  }
  const runtime: MissionRuntime = {
    state: initialState,
    currentSnapshot: snapshot(initialState),
    subscribers: new Set(),
  }

  const control: MissionControl = {
    getSnapshot: () => runtime.currentSnapshot,

    subscribe(subscriber) {
      runtime.subscribers.add(subscriber)
      return () => runtime.subscribers.delete(subscriber)
    },

    restartCommunicationsRelay(expectedRevision) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNotLaunched(state)
      if (state.communicationsReady) {
        throw new MissionStateError('The communications relay is already ready.')
      }
      return replaceState(runtime, {
        communicationsReady: true,
        activity: activity(
          state.activity,
          'communications-restored',
          'Communications relay restarted. Signal is nominal.',
        ),
      })
    },

    recalibrateNavigationArray(expectedRevision) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNotLaunched(state)
      if (state.navigationReady) {
        throw new MissionStateError('The navigation array is already ready.')
      }
      return replaceState(runtime, {
        navigationReady: true,
        activity: activity(
          state.activity,
          'navigation-recalibrated',
          'Navigation array recalibrated to launch tolerance.',
        ),
      })
    },

    requestPowerReroute(expectedRevision) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNotLaunched(state)
      if (!state.communicationsReady || !state.navigationReady) {
        throw new MissionStateError(
          'Restore communications and navigation before requesting a power reroute.',
        )
      }
      if (state.guidancePowerKilowatts === 85) {
        throw new MissionStateError('Guidance power is already ready.')
      }
      if (state.pendingAuthority || state.activeGrant) {
        throw new MissionStateError(
          'A power reroute request or authorization is already active.',
        )
      }

      const serial = String(state.nextProposalNumber).padStart(3, '0')
      const proposalId = `power-reroute-proposal-${serial}`
      const proposal: PowerRerouteProposal = {
        id: proposalId,
        status: 'pending',
        powerKilowatts: 15,
      }
      return replaceState(runtime, {
        proposal,
        pendingAuthority: {
          proposalId,
          action: 'reroute-guidance-power',
          consequence:
            'Move 15 kW from the reserve bus to launch guidance for this mission.',
        },
        nextProposalNumber: state.nextProposalNumber + 1,
        activity: activity(
          state.activity,
          'power-reroute-requested',
          'Human approval requested for a 15 kW guidance power reroute.',
        ),
      })
    },

    approvePowerReroute(proposalId) {
      const state = runtime.state
      assertNotLaunched(state)
      if (!state.pendingAuthority || state.pendingAuthority.proposalId !== proposalId) {
        throw new MissionStateError('The power reroute proposal is not pending.')
      }
      const grantId = `power-reroute-grant-${proposalId.slice(-3)}`
      return replaceState(runtime, {
        proposal: state.proposal
          ? { ...state.proposal, status: 'approved' }
          : null,
        pendingAuthority: null,
        activeGrant: {
          id: grantId,
          proposalId,
          action: 'reroute-guidance-power',
          usesRemaining: 1,
        },
        activity: activity(
          state.activity,
          'power-reroute-approved',
          'Human approval created a one-use guidance power authorization.',
        ),
      })
    },

    denyPowerReroute(proposalId) {
      const state = runtime.state
      assertNotLaunched(state)
      if (!state.pendingAuthority || state.pendingAuthority.proposalId !== proposalId) {
        throw new MissionStateError('The power reroute proposal is not pending.')
      }
      return replaceState(runtime, {
        proposal: state.proposal ? { ...state.proposal, status: 'denied' } : null,
        pendingAuthority: null,
        activity: activity(
          state.activity,
          'power-reroute-denied',
          'Human approval was denied. Guidance power remains unchanged.',
        ),
      })
    },

    revokePowerReroute(grantId) {
      const state = runtime.state
      assertNotLaunched(state)
      if (!state.activeGrant || state.activeGrant.id !== grantId) {
        throw new MissionStateError('The one-use power reroute grant is not active.')
      }
      return replaceState(runtime, {
        proposal: state.proposal
          ? { ...state.proposal, status: 'revoked' }
          : null,
        activeGrant: null,
        activity: activity(
          state.activity,
          'power-reroute-revoked',
          'The one-use guidance power authorization was revoked.',
        ),
      })
    },

    applyPowerReroute(grantId, expectedRevision) {
      const state = runtime.state
      assertExpectedRevision(state, expectedRevision)
      assertNotLaunched(state)
      if (!state.activeGrant || state.activeGrant.id !== grantId) {
        throw new MissionStateError('The one-use power reroute grant is not active.')
      }
      return replaceState(runtime, {
        guidancePowerKilowatts: 85,
        activeGrant: null,
        activity: activity(
          state.activity,
          'power-reroute-applied',
          'The authorized 15 kW reroute was applied to guidance.',
        ),
      })
    },

    launch() {
      const state = runtime.state
      assertNotLaunched(state)
      const current = snapshot(state)
      if (!current.launchReady) {
        throw new MissionStateError('Launch is locked until every repair is complete.')
      }
      return replaceState(runtime, {
        launched: true,
        activity: activity(
          state.activity,
          'launched',
          'Human launch command accepted. The mission has launched.',
        ),
      })
    },
  }

  return Object.freeze(control)
}
