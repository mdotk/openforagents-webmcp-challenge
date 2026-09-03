import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { createFittingRoomControl } from './domain'
import type {
  FittingRoomSnapshot,
  FittingRoomToolsRegistration,
} from './types'
import {
  permanentFittingRoomToolNames,
  registerFittingRoomTools,
  RESERVE_APPROVED_LOOK_TOOL_NAME,
} from './webmcp'
import './FittingRoomApp.css'

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function lookVisual(snapshot: FittingRoomSnapshot) {
  if (snapshot.boardItemIds.includes('FV-409')) {
    return {
      src: '/fitting-room/look-final.webp',
      alt: 'An all-black outfit on a dress form with a tailored vest, satin skirt, bell-sleeve shrug, crystal cuff and black boots.',
      label: 'Final revised look',
    }
  }
  if (snapshot.boardItemIds.includes('FV-408')) {
    return {
      src: '/fitting-room/look-all-black.webp',
      alt: 'An all-black outfit on a dress form with a tailored vest, satin skirt, sheer organza sleeves, crystal cuff and black boots.',
      label: 'All-black revision',
    }
  }
  if (snapshot.boardItemIds.includes('FV-206')) {
    return {
      src: '/fitting-room/look-first.webp',
      alt: 'A first-look outfit on a dress form with a black tailored vest, burgundy skirt and black boots.',
      label: 'First look',
    }
  }
  return null
}

function FittingRoomApp() {
  const [control, setControl] = useState(createFittingRoomControl)
  const subscribe = useCallback(
    (onStoreChange: () => void) => control.subscribe(() => onStoreChange()),
    [control],
  )
  const getSnapshot = useCallback(() => control.getSnapshot(), [control])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [registration, setRegistration] =
    useState<FittingRoomToolsRegistration | null>(null)
  const [registeredToolNames, setRegisteredToolNames] = useState<
    readonly string[]
  >([])
  const [registrationPending, setRegistrationPending] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let activeRegistration: FittingRoomToolsRegistration | null = null

    void registerFittingRoomTools(control)
      .then(async (nextRegistration) => {
        activeRegistration = nextRegistration
        if (cancelled) {
          await nextRegistration.dispose()
          return
        }
        setRegistration(nextRegistration)
        setRegisteredToolNames(await nextRegistration.getRegisteredToolNames())
        setRegistrationPending(false)
      })
      .catch(() => {
        if (cancelled) return
        setRegistrationPending(false)
        setActionError(
          'Browser tool setup did not finish. The visible prototype controls remain available.',
        )
      })

    return () => {
      cancelled = true
      if (activeRegistration) void activeRegistration.dispose()
    }
  }, [control])

  useEffect(() => {
    if (!registration) return
    let cancelled = false
    void registration.whenIdle().then(async () => {
      const names = await registration.getRegisteredToolNames()
      if (!cancelled) setRegisteredToolNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [registration, snapshot.revision])

  const act = useCallback((action: () => FittingRoomSnapshot) => {
    try {
      action()
      setActionError(null)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'That action could not run.',
      )
    }
  }, [])

  const boardProducts = snapshot.boardItemIds.map((itemId) =>
    snapshot.products.find((product) => product.id === itemId),
  )
  const reviewIsPending = snapshot.review?.status === 'pending'
  const canRequestReview =
    snapshot.validation.valid &&
    !reviewIsPending &&
    !snapshot.activeGrant &&
    !snapshot.reservation
  const nativeStatus = registrationPending
    ? 'Checking this browser…'
    : registration?.getLastError()
      ? 'Native registration needs attention'
      : registration?.supported
        ? `${registeredToolNames.length} native tools live`
        : `${permanentFittingRoomToolNames.length} modeled tools · native unavailable`
  const visual = lookVisual(snapshot)
  const journeyStatus = snapshot.reservation
    ? 'Look held for pickup'
    : snapshot.activeGrant
      ? 'Approved for one exact hold'
      : reviewIsPending
        ? 'Waiting for your decision'
        : snapshot.boardItemIds.length && !snapshot.validation.valid
          ? 'Stock changed · replanning needed'
          : snapshot.boardItemIds.length
            ? 'Look ready to review'
            : 'Brief saved · fitting room empty'

  return (
    <div className="fitting-room-prototype">
      <header className="fitting-room-prototype__header">
        <div>
          <span className="fitting-room-prototype__kicker">
            Shared Fitting Room · WebMCP prototype
          </span>
          <h1>Describe the look. Let your agent do the shopping.</h1>
          <p>
            Your browser agent can search the retailer, compare the facts and
            build a complete outfit in the same fitting room you see. You keep
            control of the taste, the approval and anything that follows.
          </p>
        </div>
        <aside aria-live="polite">
          <small>WebMCP surface</small>
          <strong>{nativeStatus}</strong>
          <span>
            Revision {snapshot.revision} · board {snapshot.boardRevision} ·
            inventory {snapshot.availabilityRevision}
          </span>
        </aside>
      </header>

      <main className="fitting-room-prototype__main">
        <section className="fitting-room-prototype__brief" aria-labelledby="brief-title">
          <div>
            <span className="fitting-room-prototype__kicker">Your saved brief</span>
            <h2 id="brief-title">One request. Six things to get right.</h2>
            <blockquote>{snapshot.shopper.brief}</blockquote>
          </div>
          <ul aria-label="Confirmed shopping constraints">
            <li>Size M</li>
            <li>Friday pickup</li>
            <li>Neck clear</li>
            <li>Dance-ready</li>
            <li>Under $250</li>
            <li>Reuse black boots</li>
          </ul>
        </section>

        <section className="fitting-room-prototype__workspace">
          <figure className="fitting-room-prototype__mirror" aria-live="polite">
            {visual ? (
              <img src={visual.src} alt={visual.alt} width="960" height="1200" />
            ) : (
              <div className="fitting-room-prototype__mirror-empty">
                <span>01</span>
                <strong>Start with the brief</strong>
                <p>
                  A compatible agent can read the request, search the six
                  fictional products and assemble the first complete look.
                </p>
              </div>
            )}
            <figcaption>
              <span>{visual?.label ?? 'Shared mirror'}</span>
              <strong>{journeyStatus}</strong>
            </figcaption>
            {snapshot.demoInventoryUpdateApplied &&
            snapshot.boardItemIds.includes('FV-408') ? (
              <div className="fitting-room-prototype__stock-alert" role="status">
                The organza sleeves just sold out for Friday pickup.
              </div>
            ) : null}
          </figure>

          <aside className="fitting-room-prototype__board" aria-labelledby="board-title">
            <div className="fitting-room-prototype__section-heading">
              <div>
                <span className="fitting-room-prototype__kicker">Shared state</span>
                <h2 id="board-title">Fitting room</h2>
              </div>
              <strong>{money(snapshot.subtotalCents)}</strong>
            </div>

            {boardProducts.length ? (
              <ol>
                {boardProducts.map((product) =>
                  product ? (
                    <li key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.id} · Size {product.size}</span>
                      </div>
                      <div>
                        {snapshot.humanLockedItemIds.includes(product.id) ? (
                          <span className="fitting-room-prototype__pin">Pinned by you</span>
                        ) : null}
                        <strong>{money(product.priceCents)}</strong>
                      </div>
                    </li>
                  ) : null,
                )}
                <li className="fitting-room-prototype__owned">
                  <div>
                    <strong>Black boots</strong>
                    <span>Already owned · not purchased</span>
                  </div>
                  <strong>$0</strong>
                </li>
              </ol>
            ) : (
              <p className="fitting-room-prototype__empty">
                The fitting room is empty. Ask a compatible agent to work from
                the saved brief, or use the prototype controls below.
              </p>
            )}

            <div
              className={
                snapshot.validation.valid
                  ? 'fitting-room-prototype__validation is-valid'
                  : 'fitting-room-prototype__validation'
              }
            >
              <strong>
                {snapshot.validation.valid
                  ? 'Every hard rule passes'
                  : 'The look needs attention'}
              </strong>
              {snapshot.validation.issues.length ? (
                <ul>
                  {snapshot.validation.issues.map((issue, index) => (
                    <li key={`${issue.code}-${issue.itemId ?? issue.category ?? index}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>Friday pickup · neck clear · dance-ready · within budget</span>
              )}
            </div>

            {snapshot.review ? (
              <section className="fitting-room-prototype__review" aria-labelledby="review-title">
                <span className="fitting-room-prototype__kicker">Exact human review</span>
                <h3 id="review-title">{snapshot.review.id}</h3>
                <p>
                  {snapshot.review.lines.length} retailer items ·{' '}
                  {money(snapshot.review.subtotalCents)} · Friday 4:00 pm · 15-minute
                  demo hold
                </p>
                <strong>Status: {snapshot.review.status}</strong>
                <span>$0 charged · {snapshot.reservation ? 'hold created' : 'no hold yet'}</span>
              </section>
            ) : null}

            {snapshot.reservation ? (
              <section className="fitting-room-prototype__hold" aria-labelledby="hold-title">
                <span className="fitting-room-prototype__kicker">Simulated hold</span>
                <h3 id="hold-title">{snapshot.reservation.id}</h3>
                <p>
                  Exact approved look held until{' '}
                  {new Date(snapshot.reservation.expiresAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  })}{' '}
                  UTC. No payment was taken.
                </p>
                <button type="button" disabled>
                  Continue to human checkout (not implemented)
                </button>
              </section>
            ) : null}
          </aside>
        </section>

        <section className="fitting-room-prototype__controls" aria-labelledby="controls-title">
          <details className="fitting-room-prototype__agent-prompt">
            <summary>Prompt your browser agent</summary>
            <p>
              Use this page&apos;s tools to build the strongest complete look from
              my saved brief. Explain your choices and stop before requesting a
              hold.
            </p>
          </details>
          <div>
            <span className="fitting-room-prototype__kicker">Try the journey</span>
            <h2 id="controls-title">Shop the brief together</h2>
            <p>
              Use these visible controls to follow the same browser-local
              journey when a compatible agent is not connected.
            </p>
          </div>
          <div className="fitting-room-prototype__buttons">
            {snapshot.boardItemIds.length === 0 ? (
              <button
                type="button"
                onClick={() =>
                  act(() =>
                    control.updateFittingRoom(
                      snapshot.revision,
                      ['FV-101', 'FV-206', 'FV-304'],
                      [],
                    ),
                  )
                }
              >
                Build first look
              </button>
            ) : null}
            {snapshot.boardItemIds.includes('FV-101') &&
            !snapshot.humanLockedItemIds.includes('FV-101') &&
            !snapshot.reservation ? (
              <button
                type="button"
                onClick={() =>
                  act(() => control.setHumanLock(snapshot.revision, 'FV-101', true))
                }
              >
                Pin the vest as human
              </button>
            ) : null}
            {snapshot.boardItemIds.includes('FV-206') && !snapshot.reservation ? (
              <button
                type="button"
                onClick={() =>
                  act(() =>
                    control.updateFittingRoom(
                      snapshot.revision,
                      ['FV-207', 'FV-408'],
                      ['FV-206'],
                    ),
                  )
                }
              >
                Revise to all black
              </button>
            ) : null}
            {snapshot.boardItemIds.includes('FV-408') &&
            !snapshot.demoInventoryUpdateApplied &&
            !snapshot.reservation ? (
              <button
                type="button"
                onClick={() =>
                  act(() => control.applyDemoInventoryUpdate(snapshot.revision))
                }
              >
                Apply demo inventory update
              </button>
            ) : null}
            {snapshot.boardItemIds.includes('FV-408') &&
            snapshot.demoInventoryUpdateApplied &&
            !snapshot.reservation ? (
              <button
                type="button"
                onClick={() =>
                  act(() =>
                    control.updateFittingRoom(
                      snapshot.revision,
                      ['FV-409'],
                      ['FV-408'],
                    ),
                  )
                }
              >
                Use valid sleeve substitute
              </button>
            ) : null}
            {snapshot.boardItemIds.length > 0 && !snapshot.reservation ? (
              <button
                type="button"
                onClick={() => {
                  const validation = control.validateFittingRoom(snapshot.revision)
                  setLastCheck(
                    validation.valid
                      ? `Revision ${validation.revision} passes every hard rule.`
                      : validation.issues.map((issue) => issue.message).join(' '),
                  )
                }}
              >
                Validate exact look
              </button>
            ) : null}
            {canRequestReview ? (
              <button
                type="button"
                onClick={() =>
                  act(() =>
                    control.requestReservationReview(
                      snapshot.revision,
                      15,
                      'friday-16:00',
                    ),
                  )
                }
              >
                Request exact review
              </button>
            ) : null}
            {reviewIsPending ? (
              <>
                <button
                  className="is-primary"
                  type="button"
                  onClick={() =>
                    act(() =>
                      control.approveReservationReview(snapshot.review?.id ?? ''),
                    )
                  }
                >
                  Approve exact demo hold
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(() =>
                      control.declineReservationReview(snapshot.review?.id ?? ''),
                    )
                  }
                >
                  Decline
                </button>
              </>
            ) : null}
            {snapshot.activeGrant ? (
              <>
                <button
                  className="is-primary"
                  type="button"
                  onClick={() =>
                    act(() =>
                      control.reserveApprovedLook(snapshot.activeGrant?.id ?? ''),
                    )
                  }
                >
                  Use approved hold once
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(() =>
                      control.revokeReservationGrant(snapshot.activeGrant?.id ?? ''),
                    )
                  }
                >
                  Revoke approval
                </button>
              </>
            ) : null}
            <button
              className="is-quiet"
              type="button"
              disabled={registrationPending}
              onClick={() => {
                setActionError(null)
                setLastCheck(null)
                setRegistration(null)
                setRegisteredToolNames([])
                setRegistrationPending(true)
                setControl(createFittingRoomControl())
              }}
            >
              {registrationPending ? 'Preparing prototype…' : 'Reset prototype'}
            </button>
          </div>
          {lastCheck ? <p role="status">Validation: {lastCheck}</p> : null}
          {actionError ? <p role="alert">Action stopped: {actionError}</p> : null}
        </section>

        <section className="fitting-room-prototype__catalogue">
          <details>
            <summary>
              <span>
                <span className="fitting-room-prototype__kicker">Retailer facts</span>
                View the six fictional products
              </span>
              <span>{snapshot.products.length} products</span>
            </summary>
            <div className="fitting-room-prototype__product-grid">
              {snapshot.products.map((product) => {
                const selected = snapshot.boardItemIds.includes(product.id)
                return (
                  <article
                    className={selected ? 'is-selected' : ''}
                    key={product.id}
                  >
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <dl>
                      <div>
                        <dt>Price</dt>
                        <dd>{money(product.priceCents)}</dd>
                      </div>
                      <div>
                        <dt>Friday</dt>
                        <dd>{product.fridayQuantity} left</dd>
                      </div>
                      <div>
                        <dt>Movement</dt>
                        <dd>{product.movement}</dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </details>
        </section>

        <section className="fitting-room-prototype__technical" aria-labelledby="technical-title">
          <details>
            <summary id="technical-title">View the exact tool lifecycle</summary>
            <div>
              <p>
                Seven permanent tools stay available. Human approval adds only
                <code>{RESERVE_APPROVED_LOOK_TOOL_NAME}</code>; use, revocation,
                expiry or scope change removes it.
              </p>
              <ul>
                {permanentFittingRoomToolNames.map((name) => (
                  <li key={name}>
                    <code>{name}</code>
                  </li>
                ))}
                {snapshot.activeGrant ? (
                  <li className="is-temporary">
                    <code>{RESERVE_APPROVED_LOOK_TOOL_NAME}</code> · temporary,
                    exact and one-use
                  </li>
                ) : null}
              </ul>
            </div>
          </details>
          <div>
            <span className="fitting-room-prototype__kicker">Activity</span>
            <ol>
              {snapshot.activity.slice(-6).map((entry) => (
                <li key={entry.id}>{entry.message}</li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="fitting-room-prototype__footer">
        <p>
          All products, quantities, reviews and holds in this demonstration are
          fictional. No payment can be made.
        </p>
        <a href="?experience=shopping">Return to the Morrow shopping demo</a>
      </footer>
    </div>
  )
}

export default FittingRoomApp
