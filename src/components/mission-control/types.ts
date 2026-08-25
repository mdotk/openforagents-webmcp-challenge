export type MissionPhase =
  | 'standby'
  | 'checks'
  | 'awaiting-approval'
  | 'approved'
  | 'launching'
  | 'launched'
  | 'paused'

export type AtmosphereCondition = 'clear' | 'watch' | 'storm'

export type SystemStatus =
  | 'waiting'
  | 'checking'
  | 'ready'
  | 'attention'
  | 'offline'

export type CircuitNodeState =
  | 'locked'
  | 'available'
  | 'active'
  | 'complete'

export type ApprovalState =
  | 'waiting'
  | 'required'
  | 'approved'
  | 'declined'
  | 'revoked'
  | 'expired'

export type LedgerTone = 'neutral' | 'positive' | 'attention' | 'danger'

export type LaunchState = 'locked' | 'ready' | 'launching' | 'launched'

export interface SystemReading {
  label: string
  value: string
}

export interface MissionSystem {
  id: string
  label: string
  detail: string
  status: SystemStatus
  reading?: SystemReading
}

export interface CircuitNode {
  id: string
  label: string
  detail?: string
  state: CircuitNodeState
}

export interface ApprovalField {
  label: string
  value: string
  emphasis?: boolean
}

export interface ApprovalRequest {
  title: string
  description: string
  fields: readonly ApprovalField[]
  confirmation: string
}

export interface LedgerEntry {
  id: string
  time: string
  title: string
  detail?: string
  tone?: LedgerTone
  current?: boolean
}
