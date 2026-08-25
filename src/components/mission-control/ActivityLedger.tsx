import { useId } from 'react'
import type { LedgerEntry } from './types'

export interface ActivityLedgerProps {
  entries: readonly LedgerEntry[]
  title?: string
  emptyMessage?: string
  className?: string
}

export function ActivityLedger({
  entries,
  title = 'Mission activity',
  emptyMessage = 'Activity will appear here.',
  className = '',
}: ActivityLedgerProps) {
  const titleId = useId()

  return (
    <section
      className={`mc-panel mc-ledger ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="mc-panel__heading">
        <div>
          <span className="mc-kicker">What has happened</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <span className="mc-ledger__pulse" aria-hidden="true" />
      </div>

      {entries.length > 0 ? (
        <ol className="mc-ledger__list">
          {entries.map((entry) => (
            <li
              className={`mc-ledger__entry mc-ledger__entry--${entry.tone ?? 'neutral'}${entry.current ? ' mc-ledger__entry--current' : ''}`}
              key={entry.id}
            >
              <time>{entry.time}</time>
              <span className="mc-ledger__rail" aria-hidden="true">
                <span />
              </span>
              <span className="mc-ledger__copy">
                <strong>{entry.title}</strong>
                {entry.detail ? <span>{entry.detail}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mc-ledger__empty">{emptyMessage}</p>
      )}
    </section>
  )
}
