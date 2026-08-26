import { useEffect, useId, useRef } from 'react'
import type { LaunchState } from './types'

export interface LaunchControlProps {
  state: LaunchState
  onLaunch?: () => void
  busy?: boolean
  title?: string
  description?: string
  buttonLabel?: string
  className?: string
}

const launchCopy: Record<
  LaunchState,
  { title: string; description: string; button: string }
> = {
  locked: {
    title: 'Launch is locked',
    description: 'Finish all three repairs first.',
    button: 'Awaiting approval',
  },
  ready: {
    title: 'Your turn to launch',
    description: 'The agent is done. You choose when to launch.',
    button: 'Launch now',
  },
  launching: {
    title: 'Launch command sent',
    description: 'The rocket is leaving the pad.',
    button: 'Launching…',
  },
  launched: {
    title: 'Launch complete',
    description: 'The rocket has cleared the tower.',
    button: 'Rocket away',
  },
}

export function LaunchControl({
  state,
  onLaunch,
  busy = false,
  title,
  description,
  buttonLabel,
  className = '',
}: LaunchControlProps) {
  const descriptionId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousStateRef = useRef(state)
  const copy = launchCopy[state]
  const isReady = state === 'ready'

  useEffect(() => {
    const previousState = previousStateRef.current
    previousStateRef.current = state
    if (
      state === 'ready' &&
      previousState !== 'ready' &&
      document.activeElement === document.body
    ) {
      buttonRef.current?.focus()
    }
  }, [state])

  return (
    <section
      className={`mc-launch mc-launch--${state} ${className}`.trim()}
    >
      <div className="mc-launch__status">
        <span className="mc-launch__lock" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 10V8a5 5 0 0 1 10 0v2M5 10h14v11H5Z" />
            <path d="M12 14v3" />
          </svg>
        </span>
        <span>
          <span className="mc-kicker">Final command</span>
          <strong>{title ?? copy.title}</strong>
          <small id={descriptionId}>{description ?? copy.description}</small>
        </span>
      </div>

      <div className="mc-launch__button-wrap">
        <span className="mc-launch__guard" aria-hidden="true" />
        <button
          className="mc-launch__button"
          type="button"
          ref={buttonRef}
          onClick={onLaunch}
          disabled={!isReady || busy || !onLaunch}
          aria-describedby={descriptionId}
        >
          <span className="mc-launch__button-light" aria-hidden="true" />
          <span>{busy ? 'Sending command…' : buttonLabel ?? copy.button}</span>
        </button>
      </div>
    </section>
  )
}
