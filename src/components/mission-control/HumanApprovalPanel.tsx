import { useEffect, useId, useRef } from 'react'
import type { ApprovalRequest, ApprovalState } from './types'

export interface HumanApprovalPanelProps {
  request: ApprovalRequest
  state: ApprovalState
  onApprove?: () => void
  onDecline?: () => void
  onUseAuthority?: () => void
  onRevokeAuthority?: () => void
  onRequestAgain?: () => void
  busy?: boolean
  approveLabel?: string
  declineLabel?: string
  useAuthorityLabel?: string
  revokeAuthorityLabel?: string
  requestAgainLabel?: string
  stateMessage?: string
  className?: string
}

const stateCopy: Record<
  ApprovalState,
  { label: string; message: string; mark: string }
> = {
  waiting: {
    label: 'Not requested',
    message: 'Complete the reversible checks first.',
    mark: '·',
  },
  required: {
    label: 'Your approval is needed',
    message: 'Nothing will continue until you choose.',
    mark: '!',
  },
  approved: {
    label: 'Approved by you',
    message: 'The approved next step is now available.',
    mark: '✓',
  },
  declined: {
    label: 'Not approved',
    message: 'The launch remains paused.',
    mark: '×',
  },
  revoked: {
    label: 'Approval revoked',
    message: 'Request a new approval before continuing.',
    mark: '×',
  },
  expired: {
    label: 'Approval expired',
    message: 'Review a new request before continuing.',
    mark: '!',
  },
}

export function HumanApprovalPanel({
  request,
  state,
  onApprove,
  onDecline,
  onUseAuthority,
  onRevokeAuthority,
  onRequestAgain,
  busy = false,
  approveLabel = 'Approve this action',
  declineLabel = 'Keep launch paused',
  useAuthorityLabel = 'Use approved action',
  revokeAuthorityLabel = 'Revoke authority',
  requestAgainLabel = 'Request a new approval',
  stateMessage,
  className = '',
}: HumanApprovalPanelProps) {
  const titleId = useId()
  const confirmationId = useId()
  const primaryActionRef = useRef<HTMLButtonElement>(null)
  const previousStateRef = useRef(state)
  const currentState = stateCopy[state]

  useEffect(() => {
    const previousState = previousStateRef.current
    previousStateRef.current = state
    if (
      (state === 'required' ||
        (previousState !== state &&
          (state === 'approved' ||
            state === 'declined' ||
            state === 'revoked'))) &&
      document.activeElement === document.body
    ) {
      primaryActionRef.current?.focus()
    }
  }, [state])

  return (
    <section
      className={`mc-panel mc-approval mc-approval--${state} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-busy={busy}
    >
      <div className="mc-approval__beam" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="mc-panel__heading">
        <div>
          <span className="mc-kicker">Human decision</span>
          <h2 id={titleId}>{request.title}</h2>
        </div>
        <span className="mc-approval__badge">{currentState.label}</span>
      </div>

      <p className="mc-approval__description">{request.description}</p>

      <dl className="mc-approval__fields">
        {request.fields.map((field, index) => (
          <div
            className={field.emphasis ? 'mc-approval__field--emphasis' : ''}
            key={`${field.label}-${index}`}
          >
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mc-approval__confirmation" id={confirmationId}>
        <span className="mc-approval__check" aria-hidden="true">
          {currentState.mark}
        </span>
        <span>
          <strong>{request.confirmation}</strong>
          <small>{stateMessage ?? currentState.message}</small>
        </span>
      </p>

      {state === 'required' ? (
        <div className="mc-approval__actions">
          <button
            className="mc-button mc-button--primary"
            type="button"
            ref={primaryActionRef}
            onClick={onApprove}
            disabled={busy || !onApprove}
            aria-describedby={confirmationId}
          >
            <span aria-hidden="true">→</span>
            {busy ? 'Recording your choice…' : approveLabel}
          </button>
          <button
            className="mc-button mc-button--quiet"
            type="button"
            onClick={onDecline}
            disabled={busy || !onDecline}
          >
            {declineLabel}
          </button>
        </div>
      ) : null}

      {state === 'approved' && onUseAuthority ? (
        <div className="mc-approval__actions">
          <button
            className="mc-button mc-button--primary"
            type="button"
            ref={primaryActionRef}
            onClick={onUseAuthority}
            disabled={busy}
            aria-describedby={confirmationId}
          >
            <span aria-hidden="true">→</span>
            {useAuthorityLabel}
          </button>
          <button
            className="mc-button mc-button--quiet"
            type="button"
            onClick={onRevokeAuthority}
            disabled={busy || !onRevokeAuthority}
          >
            {revokeAuthorityLabel}
          </button>
        </div>
      ) : null}

      {(state === 'declined' || state === 'revoked') && onRequestAgain ? (
        <div className="mc-approval__actions">
          <button
            className="mc-button mc-button--primary"
            type="button"
            ref={primaryActionRef}
            onClick={onRequestAgain}
            disabled={busy}
            aria-describedby={confirmationId}
          >
            <span aria-hidden="true">↻</span>
            {requestAgainLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
