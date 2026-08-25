import { useId } from 'react'
import type { CircuitNode } from './types'

export interface CapabilityCircuitProps {
  nodes: readonly CircuitNode[]
  title?: string
  description?: string
  className?: string
}

const stateLabels = {
  locked: 'Locked',
  available: 'Available',
  active: 'In use',
  complete: 'Complete',
} as const

export function CapabilityCircuit({
  nodes,
  title = 'Capability path',
  description = 'Each step opens only when the one before it is complete.',
  className = '',
}: CapabilityCircuitProps) {
  const titleId = useId()

  return (
    <section
      className={`mc-panel mc-circuit ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="mc-panel__heading mc-panel__heading--compact">
        <div>
          <span className="mc-kicker">Permission flow</span>
          <h2 id={titleId}>{title}</h2>
        </div>
      </div>
      <p className="mc-panel__intro">{description}</p>

      <ol className="mc-circuit__path">
        {nodes.map((node, index) => (
          <li
            className={`mc-circuit__node mc-circuit__node--${node.state}`}
            key={node.id}
          >
            <span className="mc-circuit__trace" aria-hidden="true" />
            <span className="mc-circuit__port" aria-hidden="true">
              <span>{String(index + 1).padStart(2, '0')}</span>
            </span>
            <span className="mc-circuit__copy">
              <strong>{node.label}</strong>
              {node.detail ? <span>{node.detail}</span> : null}
            </span>
            <span className="mc-circuit__state">{stateLabels[node.state]}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
