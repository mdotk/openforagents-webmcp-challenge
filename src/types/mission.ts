export type MissionPhase =
  | 'checks'
  | 'awaiting-approval'
  | 'approved'
  | 'launched'

export type MissionSubsystemId =
  | 'communications-relay'
  | 'navigation-array'
  | 'guidance-power'

export type MissionSystemStatus = 'attention' | 'ready'

export interface MissionSystem {
  readonly id: MissionSubsystemId
  readonly label: string
  readonly status: MissionSystemStatus
  readonly detail: string
  readonly reading: {
    readonly label: string
    readonly value: string
  }
}

export type RepairStepId =
  | 'restart-communications-relay'
  | 'recalibrate-navigation-array'
  | 'reroute-guidance-power'

export type RepairStepStatus =
  | 'available'
  | 'blocked'
  | 'awaiting-approval'
  | 'authorized'
  | 'complete'

export interface RepairPlanStep {
  readonly id: RepairStepId
  readonly subsystemId: MissionSubsystemId
  readonly label: string
  readonly procedure: string
  readonly status: RepairStepStatus
}

export type PowerRerouteProposalStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'revoked'

export interface PowerRerouteProposal {
  readonly id: string
  readonly status: PowerRerouteProposalStatus
  readonly powerKilowatts: 15
}

export interface PendingAuthority {
  readonly proposalId: string
  readonly action: 'reroute-guidance-power'
  readonly consequence: string
}

export interface PowerRerouteGrant {
  readonly id: string
  readonly proposalId: string
  readonly action: 'reroute-guidance-power'
  readonly usesRemaining: 1
}

export type MissionActivityKind =
  | 'mission-started'
  | 'communications-restored'
  | 'navigation-recalibrated'
  | 'power-reroute-requested'
  | 'power-reroute-approved'
  | 'power-reroute-denied'
  | 'power-reroute-revoked'
  | 'power-reroute-applied'
  | 'launched'

export interface MissionActivityEntry {
  readonly id: string
  readonly sequence: number
  readonly kind: MissionActivityKind
  readonly message: string
}

export interface MissionSnapshot {
  readonly revision: number
  readonly phase: MissionPhase
  readonly systems: readonly MissionSystem[]
  readonly repairPlan: readonly RepairPlanStep[]
  readonly proposal: PowerRerouteProposal | null
  readonly pendingAuthority: PendingAuthority | null
  readonly activeGrant: PowerRerouteGrant | null
  readonly activity: readonly MissionActivityEntry[]
  readonly launchReady: boolean
}

export type MissionSubscriber = (snapshot: MissionSnapshot) => void

export interface MissionControl {
  getSnapshot(): MissionSnapshot
  subscribe(subscriber: MissionSubscriber): () => void
  restartCommunicationsRelay(expectedRevision: number): MissionSnapshot
  recalibrateNavigationArray(expectedRevision: number): MissionSnapshot
  requestPowerReroute(expectedRevision: number): MissionSnapshot
  approvePowerReroute(proposalId: string): MissionSnapshot
  denyPowerReroute(proposalId: string): MissionSnapshot
  revokePowerReroute(grantId: string): MissionSnapshot
  applyPowerReroute(
    grantId: string,
    expectedRevision: number,
  ): MissionSnapshot
  launch(): MissionSnapshot
}
