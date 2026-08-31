import {
  ArrowCounterClockwise,
  CheckCircle,
  CopySimple,
  LockKey,
  Plus,
} from '@phosphor-icons/react'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createRackRescueControl, rackRescueMugTargets } from './domain'
import type {
  RackDish,
  RackDishId,
  RackMoveInput,
  RackPlacement,
  RackRescueToolsRegistration,
  RackSnapshot,
} from './types'
import {
  permanentRackRescueToolNames,
  registerRackRescueTools,
} from './webmcp'
import './RackRescueApp.css'

const planBeforeTray: readonly RackMoveInput[] = Object.freeze([
  { dishId: 'RR-RED-MUG', column: 5, row: 3, orientation: 'north' },
  { dishId: 'RR-CHILD-CUP', column: 6, row: 0, orientation: 'north' },
  { dishId: 'RR-CUTLERY', column: 7, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-1', column: 0, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-2', column: 1, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-3', column: 2, row: 2, orientation: 'north' },
  { dishId: 'RR-IVORY-PLATE-4', column: 0, row: 4, orientation: 'east' },
  { dishId: 'RR-BLUE-PLATE-1', column: 2, row: 4, orientation: 'east' },
  { dishId: 'RR-BLUE-PLATE-2', column: 4, row: 4, orientation: 'east' },
  { dishId: 'RR-IVORY-BOWL-1', column: 3, row: 0, orientation: 'north' },
  { dishId: 'RR-IVORY-BOWL-2', column: 4, row: 0, orientation: 'north' },
  { dishId: 'RR-BLUE-BOWL-1', column: 4, row: 1, orientation: 'north' },
  { dishId: 'RR-BLUE-BOWL-2', column: 5, row: 1, orientation: 'north' },
])

const blockedFirstPlan: readonly RackMoveInput[] = Object.freeze(
  planBeforeTray.map((move) =>
    move.dishId === 'RR-IVORY-PLATE-3'
      ? { ...move, column: 3, row: 2 }
      : move,
  ),
)

const planAfterTray: readonly RackMoveInput[] = Object.freeze([
  ...planBeforeTray
    .filter((move) => move.dishId !== 'RR-IVORY-BOWL-1')
    .map((move) => ({ ...move })),
  { dishId: 'RR-IVORY-BOWL-1', column: 6, row: 1, orientation: 'north' },
  { dishId: 'RR-ROASTING-TRAY', column: 0, row: 0, orientation: 'north' },
])

const mugTargetLabels = ['Upper rack', 'Middle rack', 'Lower rack'] as const
const rackColumnLeft = (column: number) => 51.8 + column * 5.45
const rackRowTop = (row: number) => 12.5 + row * 12.3

function planForPinnedMug(
  plan: readonly RackMoveInput[],
  mug: RackPlacement | undefined,
): readonly RackMoveInput[] {
  if (!mug) return plan
  return plan.map((move) =>
    move.dishId === 'RR-RED-MUG'
      ? { ...move, column: mug.column, row: mug.row }
      : move,
  )
}

const firstAgentRequest =
  'Fit every visible dish into the rack. Keep my red mug exactly where it is, keep the spray arm clear, and leave room for a roasting tray. Preview a safe plan before moving anything.'

const trayAgentRequest =
  'Fit the roasting tray too. Keep my red mug exactly where I put it and keep the spray arm clear. Preview the new plan before moving anything.'

const counterPositions: Record<RackDishId, [number, number, number]> = {
  'RR-RED-MUG': [8, 17, -8],
  'RR-CHILD-CUP': [36, 13, 7],
  'RR-IVORY-PLATE-1': [8, 40, -7],
  'RR-IVORY-PLATE-2': [19, 38, 8],
  'RR-IVORY-PLATE-3': [31, 42, -4],
  'RR-IVORY-PLATE-4': [12, 67, 5],
  'RR-BLUE-PLATE-1': [25, 62, -9],
  'RR-BLUE-PLATE-2': [38, 68, 7],
  'RR-IVORY-BOWL-1': [6, 78, -4],
  'RR-IVORY-BOWL-2': [20, 77, 8],
  'RR-BLUE-BOWL-1': [32, 81, -8],
  'RR-BLUE-BOWL-2': [42, 78, 5],
  'RR-CUTLERY': [42, 45, -5],
  'RR-ROASTING-TRAY': [12, 48, -8],
}

function dishClass(dish: RackDish) {
  return `rack-rescue__dish rack-rescue__dish--${dish.kind}`
}

function RackRescueApp() {
  const [control, setControl] = useState(createRackRescueControl)
  const subscribe = useCallback(
    (notify: () => void) => control.subscribe(() => notify()),
    [control],
  )
  const getSnapshot = useCallback(() => control.getSnapshot(), [control])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [registration, setRegistration] =
    useState<RackRescueToolsRegistration | null>(null)
  const [toolNames, setToolNames] = useState<readonly string[]>([])
  const [registrationPending, setRegistrationPending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedRequest, setCopiedRequest] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<{ left: number; top: number } | null>(null)
  const [activeMugTarget, setActiveMugTarget] = useState<number | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const firstMugTargetRef = useRef<HTMLButtonElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragMovedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let active: RackRescueToolsRegistration | null = null
    void registerRackRescueTools(control)
      .then(async (next) => {
        active = next
        if (cancelled) {
          await next.dispose()
          return
        }
        setRegistration(next)
        setToolNames(await next.getRegisteredToolNames())
        setRegistrationPending(false)
      })
      .catch(() => {
        if (!cancelled) {
          setRegistrationPending(false)
          setError('Browser tool setup did not finish. The visible prototype controls still work.')
        }
      })
    return () => {
      cancelled = true
      if (active) void active.dispose()
    }
  }, [control])

  useEffect(() => {
    if (!registration) return
    let cancelled = false
    void registration.whenIdle().then(async () => {
      const names = await registration.getRegisteredToolNames()
      if (!cancelled) setToolNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [registration, snapshot.revision])

  const act = useCallback((action: () => RackSnapshot) => {
    try {
      action()
      setError(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'That action could not run.')
    }
  }, [])

  const displayedPlacements = snapshot.preview?.placements ?? snapshot.placements
  const placementMap = useMemo(
    () => new Map(displayedPlacements.map((placement) => [placement.dishId, placement])),
    [displayedPlacements],
  )
  const visibleDishes = snapshot.dishes.filter((dish) => dish.visible)
  const mugLocked = snapshot.dishes.find((dish) => dish.id === 'RR-RED-MUG')?.lockedByHuman
  const pinnedMug = snapshot.placements.find(
    (placement) => placement.dishId === 'RR-RED-MUG',
  )
  const agentPlacedDishCount = snapshot.placements.filter(
    (placement) => placement.dishId !== 'RR-RED-MUG',
  ).length
  const finalFit = snapshot.placements.some(
    (placement) => placement.dishId === 'RR-ROASTING-TRAY',
  )
  const nativeStatus = registrationPending
    ? 'Checking this browser…'
    : registration?.getLastError()
      ? 'Native registration needs attention'
      : registration?.supported
        ? `${toolNames.length} native tools live`
        : `${permanentRackRescueToolNames.length} modeled tools · native unavailable`

  const showBlocked = () =>
    act(() =>
      control.previewLoadPlan(
        snapshot.revision,
        planForPinnedMug(blockedFirstPlan, pinnedMug),
      ),
    )
  const previewGood = () =>
    act(() =>
      control.previewLoadPlan(
        snapshot.revision,
        planForPinnedMug(
          snapshot.roastingTrayRevealed ? planAfterTray : planBeforeTray,
          pinnedMug,
        ),
      ),
    )
  const applyCurrent = () => {
    if (!snapshot.preview) return
    act(() => control.applyLoadPlan(snapshot.revision, snapshot.preview!.id))
  }
  const restart = () => {
    setControl(createRackRescueControl())
    setError(null)
    setCopiedRequest(null)
    setRegistrationPending(true)
    setRegistration(null)
    setToolNames([])
    setDragPosition(null)
    setActiveMugTarget(null)
    dragStartRef.current = null
    dragMovedRef.current = false
  }

  const nearestMugTarget = useCallback((clientX: number, clientY: number) => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null
    const left = ((clientX - bounds.left) / bounds.width) * 100
    const top = ((clientY - bounds.top) / bounds.height) * 100
    if (left < 47 || left > 101 || top < -1 || top > 101) return null
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY
    rackRescueMugTargets.forEach((target, index) => {
      const xDistance = (left - rackColumnLeft(target.column)) * bounds.width / 100
      const yDistance = (top - rackRowTop(target.row)) * bounds.height / 100
      const distance = Math.hypot(xDistance, yDistance)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    return closestIndex
  }, [])

  const placeMug = useCallback((targetIndex: number) => {
    const target = rackRescueMugTargets[targetIndex]
    if (!target) return
    act(() => control.pinRedMug(snapshot.revision, target.column, target.row))
    setDragPosition(null)
    setActiveMugTarget(null)
  }, [act, control, snapshot.revision])

  const updateMugDrag = useCallback((clientX: number, clientY: number) => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return
    setDragPosition({
      left: Math.max(2, Math.min(98, ((clientX - bounds.left) / bounds.width) * 100)),
      top: Math.max(3, Math.min(97, ((clientY - bounds.top) / bounds.height) * 100)),
    })
    setActiveMugTarget(nearestMugTarget(clientX, clientY))
  }, [nearestMugTarget])

  const handleMugPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mugLocked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    dragMovedRef.current = false
    setError(null)
    updateMugDrag(event.clientX, event.clientY)
  }

  const handleMugPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
      dragMovedRef.current = true
    }
    updateMugDrag(event.clientX, event.clientY)
  }

  const finishMugDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (!dragStartRef.current) return
    const moved = dragMovedRef.current
    const targetIndex = cancelled ? null : nearestMugTarget(event.clientX, event.clientY)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStartRef.current = null
    setDragPosition(null)
    setActiveMugTarget(null)
    if (cancelled) {
      dragMovedRef.current = false
      return
    }
    if (!moved) return
    if (targetIndex === null) {
      setError('Drop the red mug on one of the three marked rack spots.')
      return
    }
    placeMug(targetIndex)
  }

  const handleMugClick = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    firstMugTargetRef.current?.focus()
  }
  const copyRequest = (request: string) => {
    if (!navigator.clipboard?.writeText) {
      setError('Copy is unavailable in this browser. Select the request and copy it instead.')
      return
    }
    void navigator.clipboard.writeText(request).then(
      () => {
        setCopiedRequest(request)
        setError(null)
      },
      () => setError('Copy did not work in this browser. Select the request and copy it instead.'),
    )
  }

  return (
    <div className="rack-rescue">
      <header className="rack-rescue__header">
        <a className="rack-rescue__brand" href="/">Open for Agents</a>
        <span className="rack-rescue__name">Rack Rescue</span>
      </header>

      <main>
        <section className="rack-rescue__intro">
          <h1>Keep my mug here. Fit everything else.</h1>
          <p>
            You choose what must stay. Your browser agent works out how to load
            every other dish, keep the spray arm clear and adapt when one more
            tray appears.
          </p>
        </section>

        <section className="rack-rescue__workspace">
          <section className="rack-rescue__action" aria-live="polite">
            {!mugLocked ? (
              <>
                <span className="rack-rescue__step">Your choice</span>
                <h2>Put your mug in the rack.</h2>
                <p>
                  Drag the red mug onto a marked spot—or choose a spot
                  directly. The agent must fit everything else around it.
                </p>
                <button
                  className="rack-rescue__primary-action"
                  onClick={() => firstMugTargetRef.current?.focus()}
                >
                  Choose a marked spot
                </button>
              </>
            ) : finalFit ? (
              <>
                <span className="rack-rescue__step is-complete">Done</span>
                <h2>Everything fits.</h2>
                <p>14 dishes loaded. Your mug never moved. The spray arm is clear.</p>
                <div className="rack-rescue__result-list" aria-label="Final checks">
                  <span><CheckCircle weight="fill" /> Mug stayed put</span>
                  <span><CheckCircle weight="fill" /> Spray arm clear</span>
                  <span><CheckCircle weight="fill" /> Roasting tray loaded</span>
                </div>
                <div className="rack-rescue__secondary-actions">
                  {snapshot.undo ? (
                    <button onClick={() => act(() => control.undoLoadPlan(snapshot.revision, snapshot.undo!.token))}>
                      <ArrowCounterClockwise weight="bold" /> Undo last load
                    </button>
                  ) : null}
                  <button onClick={restart}>Start again</button>
                </div>
              </>
            ) : agentPlacedDishCount > 0 && !snapshot.roastingTrayRevealed ? (
              <>
                <span className="rack-rescue__step">Your turn</span>
                <h2>Wait—one more thing.</h2>
                <p>
                  A roasting tray was left on the bench. Can the agent make
                  room without moving your mug?
                </p>
                <button
                  className="rack-rescue__primary-action"
                  onClick={() => act(() => control.revealRoastingTray(snapshot.revision))}
                >
                  <Plus weight="bold" /> Add the roasting tray
                </button>
              </>
            ) : snapshot.preview ? (
              snapshot.preview.valid ? (
                <>
                  <span className="rack-rescue__step is-complete">Safe to load</span>
                  <h2>This plan fits.</h2>
                  <p>Every rule passed. Nothing moved until the plan was checked.</p>
                  <div className="rack-rescue__result-list">
                    <span><CheckCircle weight="fill" /> Mug stays put</span>
                    <span><CheckCircle weight="fill" /> Spray arm clear</span>
                    <span><CheckCircle weight="fill" /> Every dish has a place</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="rack-rescue__step is-blocked">Needs another try</span>
                  <h2>That layout blocks the wash.</h2>
                  <p>{snapshot.preview.conflicts[0]?.message}</p>
                  <p className="rack-rescue__reassurance">Nothing moved. The agent can revise the plan safely.</p>
                </>
              )
            ) : (
              <>
                <span className="rack-rescue__step">Ask your agent</span>
                <h2>{snapshot.roastingTrayRevealed ? 'Make room for the tray.' : 'Your mug is safe.'}</h2>
                <p>
                  {snapshot.roastingTrayRevealed
                    ? 'Send this request to your browser agent:'
                    : 'Now send this request to your browser agent:'}
                </p>
                <blockquote>
                  {snapshot.roastingTrayRevealed ? trayAgentRequest : firstAgentRequest}
                </blockquote>
                <button
                  className="rack-rescue__primary-action"
                  onClick={() => copyRequest(snapshot.roastingTrayRevealed ? trayAgentRequest : firstAgentRequest)}
                >
                  <CopySimple weight="bold" />{
                    copiedRequest === (snapshot.roastingTrayRevealed ? trayAgentRequest : firstAgentRequest)
                      ? 'Request copied'
                      : 'Copy request'
                  }
                </button>
              </>
            )}

            <div className={`rack-rescue__connection${registration?.supported ? ' is-ready' : ''}`}>
              <span aria-hidden="true" />
              {registrationPending
                ? 'Checking agent tools…'
                : registration?.supported
                  ? 'Agent tools are ready'
                  : 'Agent tools are unavailable — try the guided demo below'}
            </div>
          </section>

          <section
            className="rack-rescue__stage"
            aria-label="Dishwasher rack and dishes"
            ref={stageRef}
          >
            <img
              className="rack-rescue__stage-background"
              src="/rack-rescue/rack-background.webp"
              alt="A marble counter beside an empty open dishwasher rack, viewed from above."
            />
            {!snapshot.roastingTrayRevealed ? (
              <div className="rack-rescue__reserved-zone" aria-hidden="true" />
            ) : null}
            <div className="rack-rescue__spray-zone" aria-hidden="true" />

            {!mugLocked ? (
              <div className="rack-rescue__mug-targets" role="group" aria-label="Choose where the red mug stays">
                {rackRescueMugTargets.map((target, index) => (
                  <button
                    aria-label={`Put the red mug in the ${mugTargetLabels[index].toLowerCase()} spot`}
                    className={`rack-rescue__mug-target${activeMugTarget === index ? ' is-active' : ''}`}
                    key={`${target.column}:${target.row}`}
                    onClick={() => placeMug(index)}
                    ref={index === 0 ? firstMugTargetRef : undefined}
                    style={{
                      left: `${rackColumnLeft(target.column)}%`,
                      top: `${rackRowTop(target.row)}%`,
                    }}
                    type="button"
                  >
                    <span>Drop here</span>
                  </button>
                ))}
              </div>
            ) : null}

          {visibleDishes.map((dish) => {
            const placement = placementMap.get(dish.id)
            const [left, top, rotation] = counterPositions[dish.id]
            const isMovableMug = dish.id === 'RR-RED-MUG' && !mugLocked
            const style = isMovableMug && dragPosition
              ? {
                  left: `${dragPosition.left}%`,
                  top: `${dragPosition.top}%`,
                  transform: 'translate(-50%, -50%) rotate(-4deg)',
                }
              : placement
              ? {
                  left: `${rackColumnLeft(placement.column)}%`,
                  top: `${rackRowTop(placement.row)}%`,
                  transform: `translate(-50%, -50%) rotate(${placement.orientation === 'east' ? 90 : 0}deg)`,
                }
              : {
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }
            const className = `${dishClass(dish)}${placement ? ' is-in-rack' : ''}${snapshot.preview ? ' is-preview' : ''}${isMovableMug ? ' is-movable' : ''}${dragPosition && isMovableMug ? ' is-dragging' : ''}`
            if (isMovableMug) {
              return (
                <button
                  aria-label="Move your red mug"
                  className={className}
                  data-dish-id={dish.id}
                  key={dish.id}
                  onClick={handleMugClick}
                  onPointerCancel={(event) => finishMugDrag(event, true)}
                  onPointerDown={handleMugPointerDown}
                  onPointerMove={handleMugPointerMove}
                  onPointerUp={finishMugDrag}
                  style={style}
                  type="button"
                >
                  <img src={dish.asset} alt="" draggable="false" />
                </button>
              )
            }
            return (
              <div
                className={className}
                key={dish.id}
                style={style}
                data-dish-id={dish.id}
              >
                <img src={dish.asset} alt={dish.label} />
                {dish.lockedByHuman ? (
                  <span className="rack-rescue__lock" aria-label="Pinned by you"><LockKey weight="fill" /></span>
                ) : null}
              </div>
            )
          })}

            <div className={`rack-rescue__mug-tag${mugLocked ? ' is-locked' : ''}`}>
              {mugLocked ? <LockKey weight="fill" /> : null}
              {mugLocked ? 'Stays here' : 'Drag this mug →'}
            </div>
          </section>
        </section>

        {error ? <p className="rack-rescue__error" role="alert">{error}</p> : null}

        <details className="rack-rescue__guided-demo">
          <summary>No browser agent? Try the guided demo</summary>
          <div className="rack-rescue__guided-actions">
            {!mugLocked ? (
              <p>Drag the red mug into the rack, or choose one of the marked spots.</p>
            ) : finalFit ? (
              <button onClick={restart}>Start again</button>
            ) : agentPlacedDishCount > 0 && !snapshot.roastingTrayRevealed ? (
              <p>Add the roasting tray using the main button above.</p>
            ) : !snapshot.preview ? (
              !snapshot.roastingTrayRevealed ? (
                <button onClick={showBlocked}>Try a layout that blocks the spray arm</button>
              ) : (
                <button onClick={previewGood}>Find room for the roasting tray</button>
              )
            ) : snapshot.preview.valid ? (
              <button onClick={applyCurrent}>Load this safe layout</button>
            ) : (
              <button onClick={previewGood}>Try a safer layout</button>
            )}
            {snapshot.undo && !finalFit ? (
              <button onClick={() => act(() => control.undoLoadPlan(snapshot.revision, snapshot.undo!.token))}>
                <ArrowCounterClockwise weight="bold" /> Undo last load
              </button>
            ) : null}
          </div>
        </details>

        <details className="rack-rescue__webmcp-details">
          <summary>How Rack Rescue uses WebMCP</summary>
          <div>
            <p>
              A compatible browser agent can inspect the rack, study every
              dish, preview a complete layout, load a layout only after it
              passes the rack rules and undo its last load. It cannot move your
              locked mug, hide a failed check or start the dishwasher.
            </p>
            <aside>
              <strong>{nativeStatus}</strong>
              <span>Revision {snapshot.revision}</span>
              <ul>{permanentRackRescueToolNames.map((name) => <li key={name}><code>{name}</code></li>)}</ul>
            </aside>
          </div>
        </details>
      </main>
    </div>
  )
}

export default RackRescueApp
