import { useId, type ReactNode } from 'react'
import '../../styles/mission-control.css'
import { ActivityLedger, type ActivityLedgerProps } from './ActivityLedger'
import {
  CapabilityCircuit,
  type CapabilityCircuitProps,
} from './CapabilityCircuit'
import {
  HumanApprovalPanel,
  type HumanApprovalPanelProps,
} from './HumanApprovalPanel'
import { LaunchControl, type LaunchControlProps } from './LaunchControl'
import { RocketPad, type RocketPadProps } from './RocketPad'
import {
  StatusAtmosphere,
  type StatusAtmosphereProps,
} from './StatusAtmosphere'
import { SystemReadouts, type SystemReadoutsProps } from './SystemReadouts'
import type { MissionPhase } from './types'

export interface MissionControlProps {
  title: string
  description: string
  phase: MissionPhase
  phaseLabel: string
  missionLabel?: string
  sceneLabel?: string
  atmosphere: StatusAtmosphereProps
  rocket: Omit<RocketPadProps, 'phase'>
  systems: SystemReadoutsProps
  circuit: CapabilityCircuitProps
  controls?: ReactNode
  approval: HumanApprovalPanelProps
  ledger: ActivityLedgerProps
  launch: LaunchControlProps
  className?: string
}

export function MissionControl({
  title,
  description,
  phase,
  phaseLabel,
  missionLabel = 'Mission control',
  sceneLabel = 'Live view of the launch pad',
  atmosphere,
  rocket,
  systems,
  circuit,
  controls,
  approval,
  ledger,
  launch,
  className = '',
}: MissionControlProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <section
      className={`mc-shell mc-shell--${phase} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <header className="mc-header">
        <div className="mc-header__identity">
          <span className="mc-header__insignia" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" />
              <path d="m20 8 4 9 9 3-9 3-4 9-4-9-9-3 9-3Z" />
              <circle cx="20" cy="20" r="3" />
            </svg>
          </span>
          <span>
            <span className="mc-kicker">{missionLabel}</span>
            <strong>OFA / 01</strong>
          </span>
        </div>

        <div className="mc-header__title">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>

        <div className="mc-header__phase" aria-label={`Current status: ${phaseLabel}`}>
          <span aria-hidden="true" />
          <small>Current status</small>
          <strong>{phaseLabel}</strong>
        </div>
      </header>

      <CapabilityCircuit {...circuit} />

      <div className="mc-primary-grid">
        <section className="mc-flight-window" aria-label={sceneLabel}>
          <StatusAtmosphere {...atmosphere} />
          <div className="mc-flight-window__frame" aria-hidden="true">
            <span className="mc-flight-window__corner mc-flight-window__corner--tl" />
            <span className="mc-flight-window__corner mc-flight-window__corner--tr" />
            <span className="mc-flight-window__corner mc-flight-window__corner--bl" />
            <span className="mc-flight-window__corner mc-flight-window__corner--br" />
            <span className="mc-flight-window__axis mc-flight-window__axis--x" />
            <span className="mc-flight-window__axis mc-flight-window__axis--y" />
          </div>
          <RocketPad {...rocket} phase={phase} />
          <div className="mc-flight-window__labels" aria-hidden="true">
            <span>PAD / A</span>
            <span>CAM / 01</span>
          </div>
        </section>

        <aside className="mc-telemetry" aria-label="Mission readiness">
          <SystemReadouts {...systems} />
        </aside>
      </div>

      {controls}

      <div className="mc-decision-grid">
        <HumanApprovalPanel {...approval} />
        <ActivityLedger {...ledger} />
      </div>

      <LaunchControl {...launch} />
    </section>
  )
}
