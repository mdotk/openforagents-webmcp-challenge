import { useId } from 'react'
import type { MissionSystem, SystemStatus } from './types'

export interface SystemReadoutsProps {
  systems: readonly MissionSystem[]
  title?: string
  className?: string
}

const statusLabels: Record<SystemStatus, string> = {
  waiting: 'Waiting',
  checking: 'Checking',
  ready: 'Ready',
  attention: 'Needs attention',
  offline: 'Offline',
}

const iconPaths = [
  'M5 12h14M12 5v14M7 7l10 10M17 7 7 17',
  'M12 3c4 5 6 8 6 12a6 6 0 0 1-12 0c0-4 2-7 6-12Z',
  'M4 18a11 11 0 0 1 16 0M7 15a7 7 0 0 1 10 0M10 12a3 3 0 0 1 4 0M12 20v.01',
] as const

function SystemIcon({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={iconPaths[index % iconPaths.length]} />
    </svg>
  )
}

export function SystemReadouts({
  systems,
  title = 'Flight systems',
  className = '',
}: SystemReadoutsProps) {
  const titleId = useId()

  return (
    <section
      className={`mc-panel mc-systems ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="mc-panel__heading">
        <div>
          <span className="mc-kicker">Live checks</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <span className="mc-panel__count" aria-label={`${systems.length} systems`}>
          {String(systems.length).padStart(2, '0')}
        </span>
      </div>

      <ul className="mc-systems__list">
        {systems.map((system, index) => (
          <li
            className={`mc-system mc-system--${system.status}`}
            key={system.id}
          >
            <span className="mc-system__icon">
              <SystemIcon index={index} />
            </span>
            <span className="mc-system__copy">
              <span className="mc-system__topline">
                <strong>{system.label}</strong>
                <span className="mc-system__status">
                  <span className="mc-system__dot" aria-hidden="true" />
                  {statusLabels[system.status]}
                </span>
              </span>
              <span className="mc-visually-hidden">{system.detail}</span>
            </span>
            {system.reading ? (
              <span className="mc-system__reading">
                <span>{system.reading.label}</span>
                <strong>{system.reading.value}</strong>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
