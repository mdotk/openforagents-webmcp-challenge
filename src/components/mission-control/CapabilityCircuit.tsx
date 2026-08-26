import { useId } from 'react'

export type CapabilityGroupTone = 'read' | 'repair' | 'request'

export interface CapabilityGroup {
  id: string
  label: string
  detail: string
  tone: CapabilityGroupTone
  toolNames: readonly string[]
}

export type TemporaryCapabilityState =
  | 'unavailable'
  | 'awaiting-approval'
  | 'available'
  | 'consumed'
  | 'declined'
  | 'revoked'

export interface CapabilityCircuitProps {
  groups: readonly CapabilityGroup[]
  registeredToolNames: readonly string[]
  temporaryToolName: string
  temporaryState: TemporaryCapabilityState
  nativeSupported: boolean
  registrationPending?: boolean
  registrationError?: boolean
  launchLabel?: string
  title?: string
  description?: string
  className?: string
}

interface TemporaryCopy {
  status: string
  detail: string
  tone: 'quiet' | 'waiting' | 'available' | 'removed'
}

function getTemporaryCopy(
  state: TemporaryCapabilityState,
  nativeSupported: boolean,
  registrationPending: boolean,
  registered: boolean,
): TemporaryCopy {
  if (state === 'awaiting-approval') {
    return {
      status: 'Waiting for your choice',
      detail: 'The request is visible, but the repair tool does not exist yet.',
      tone: 'waiting',
    }
  }

  if (state === 'available') {
    if (registrationPending) {
      return {
        status: 'Approval recorded',
        detail: 'The one-use grant is active while browser support is checked.',
        tone: 'available',
      }
    }

    if (!nativeSupported) {
      return {
        status: 'Approved for one manual use',
        detail: 'Native WebMCP is unavailable here; the visible controls use the same grant.',
        tone: 'available',
      }
    }

    if (!registered) {
      return {
        status: 'Adding the exact tool…',
        detail: 'The approved grant is active while the browser inventory updates.',
        tone: 'available',
      }
    }

    return {
      status: 'Available now · one use',
      detail: 'Using or revoking this exact grant returns the WebMCP surface to seven tools.',
      tone: 'available',
    }
  }

  if (state === 'consumed') {
    return registered && nativeSupported
      ? {
          status: 'Removing the used tool…',
          detail: 'The one-use grant has been consumed and the browser inventory is updating.',
          tone: 'removed',
        }
      : {
          status: 'Used once, then removed',
          detail: 'The temporary authority is gone. The capability surface is back to seven.',
          tone: 'removed',
        }
  }

  if (state === 'revoked') {
    return registered && nativeSupported
      ? {
          status: 'Removing the revoked tool…',
          detail: 'The grant is revoked and the browser inventory is updating.',
          tone: 'removed',
        }
      : {
          status: 'Revoked, then removed',
          detail: 'Guidance power was not changed. The capability surface remains at seven.',
          tone: 'removed',
        }
  }

  if (state === 'declined') {
    return {
      status: 'Not created',
      detail: 'The request was declined, so the capability surface remains at seven.',
      tone: 'removed',
    }
  }

  return {
    status: 'Not available',
    detail: 'Exact approval is required before this one-use tool can appear.',
    tone: 'quiet',
  }
}

export function CapabilityCircuit({
  groups,
  registeredToolNames,
  temporaryToolName,
  temporaryState,
  nativeSupported,
  registrationPending = false,
  registrationError = false,
  launchLabel = 'Launch Aster',
  title = 'Seven tools stay available. One exact repair can appear.',
  description = 'Read tools inspect the mission. Bounded repairs restore communications and navigation. A separate tool asks for the power decision.',
  className = '',
}: CapabilityCircuitProps) {
  const titleId = useId()
  const descriptionId = useId()
  const permanentCount = groups.reduce(
    (count, group) => count + group.toolNames.length,
    0,
  )
  const hasTemporaryAuthority = temporaryState === 'available'
  const expectedCount = permanentCount + (hasTemporaryAuthority ? 1 : 0)
  const temporaryRegistered = registeredToolNames.includes(temporaryToolName)
  const temporaryCopy = getTemporaryCopy(
    temporaryState,
    nativeSupported,
    registrationPending,
    temporaryRegistered,
  )

  const inventoryDetail = registrationPending
    ? 'Checking native WebMCP support…'
    : registrationError
      ? 'Browser registration needs attention'
      : nativeSupported
        ? registeredToolNames.length === expectedCount
          ? `${registeredToolNames.length} registered in this browser`
          : `Updating browser inventory · ${registeredToolNames.length} registered`
        : 'Capability model shown · native WebMCP unavailable'

  return (
    <section
      className={`mc-panel mc-circuit ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="mc-circuit__heading">
        <div>
          <span className="mc-kicker">WebMCP authority lifecycle</span>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <div
          className="mc-circuit__inventory"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{expectedCount}</strong>
          <span>
            {hasTemporaryAuthority
              ? 'capabilities now'
              : 'permanent capabilities'}
          </span>
          <small>{inventoryDetail}</small>
        </div>
      </div>

      <div className="mc-circuit__surface">
        <section
          className="mc-circuit__permanent"
          aria-label={`${permanentCount} permanent WebMCP tools`}
        >
          <div className="mc-circuit__card-heading">
            <div>
              <span className="mc-kicker">Always available</span>
              <h3>Permanent WebMCP surface</h3>
            </div>
            <strong>{permanentCount} tools</strong>
          </div>

          <ul className="mc-circuit__groups">
            {groups.map((group) => (
              <li
                className={`mc-circuit__group mc-circuit__group--${group.tone}`}
                key={group.id}
              >
                <span className="mc-circuit__group-copy">
                  <strong>{group.label}</strong>
                  <small>{group.detail}</small>
                </span>
                <ul
                  className="mc-circuit__tools"
                  aria-label={`${group.label}: ${group.toolNames.length} ${group.toolNames.length === 1 ? 'tool' : 'tools'}`}
                >
                  {group.toolNames.map((toolName) => (
                    <li key={toolName}>
                      <code>{toolName}</code>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <div className="mc-circuit__connector" aria-hidden="true">
          <span>exact approval</span>
          <i />
        </div>

        <section
          className={`mc-circuit__temporary mc-circuit__temporary--${temporaryCopy.tone}`}
          aria-label={`Temporary capability: ${temporaryToolName}`}
        >
          <span className="mc-kicker">Temporary capability</span>
          <code>{temporaryToolName}</code>
          <strong aria-live="polite" aria-atomic="true">
            {temporaryCopy.status}
          </strong>
          <small>{temporaryCopy.detail}</small>
        </section>

        <div className="mc-circuit__connector mc-circuit__connector--final" aria-hidden="true">
          <span>separate control</span>
          <i />
        </div>

        <section
          className="mc-circuit__launch"
          aria-label={`${launchLabel}, not exposed through WebMCP`}
        >
          <span className="mc-kicker">Visible page control</span>
          <h3>{launchLabel}</h3>
          <strong>Not exposed through WebMCP</strong>
          <small>Complete the final command with the visible button on this page.</small>
        </section>
      </div>
    </section>
  )
}
