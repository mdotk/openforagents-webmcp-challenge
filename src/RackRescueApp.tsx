import {
  ArrowCounterClockwise,
  CheckCircle,
  ForkKnife,
  LockKey,
  MagicWand,
  Plus,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { createRackRescueControl } from './domain'
import type {
  RackDish,
  RackDishId,
  RackMoveInput,
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
  const agentPlacedDishCount = snapshot.placements.filter(
    (placement) => placement.dishId !== 'RR-RED-MUG',
  ).length
  const canApply = Boolean(snapshot.preview?.valid)
  const journeyStep = !mugLocked
    ? 1
    : agentPlacedDishCount === 0
      ? 2
      : !snapshot.roastingTrayRevealed
        ? 3
        : snapshot.placements.some((placement) => placement.dishId === 'RR-ROASTING-TRAY')
          ? 4
          : 3
  const nativeStatus = registrationPending
    ? 'Checking this browser…'
    : registration?.getLastError()
      ? 'Native registration needs attention'
      : registration?.supported
        ? `${toolNames.length} native tools live`
        : `${permanentRackRescueToolNames.length} modeled tools · native unavailable`

  const showBlocked = () =>
    act(() => control.previewLoadPlan(snapshot.revision, blockedFirstPlan))
  const previewGood = () =>
    act(() =>
      control.previewLoadPlan(
        snapshot.revision,
        snapshot.roastingTrayRevealed ? planAfterTray : planBeforeTray,
      ),
    )
  const applyCurrent = () => {
    if (!snapshot.preview) return
    act(() => control.applyLoadPlan(snapshot.revision, snapshot.preview!.id))
  }

  return (
    <div className="rack-rescue">
      <header className="rack-rescue__header">
        <a className="rack-rescue__brand" href="/">Open for Agents experiment</a>
        <div className="rack-rescue__badges" aria-live="polite">
          <span><ForkKnife weight="bold" /> {visibleDishes.length} dishes</span>
          <span className={snapshot.conflictCount ? 'has-conflicts' : ''}>
            {snapshot.conflictCount ? <WarningCircle weight="fill" /> : <CheckCircle weight="fill" />}
            {snapshot.conflictCount} conflicts
          </span>
        </div>
      </header>

      <main>
        <section className="rack-rescue__intro">
          <div>
            <span className="rack-rescue__eyebrow">Rack Rescue · WebMCP prototype</span>
            <h1>Can it all fit?</h1>
            <p>
              Pin the one thing the agent must not move. Then watch it reason
              through space, safety and the dish you forgot.
            </p>
          </div>
          <aside>
            <small>Browser agent</small>
            <strong>{nativeStatus}</strong>
            <span>Revision {snapshot.revision}</span>
          </aside>
        </section>

        <ol className="rack-rescue__steps" aria-label="Rack Rescue journey">
          <li className={journeyStep === 1 ? 'is-current' : journeyStep > 1 ? 'is-done' : ''}>
            <span>1</span><div><strong>Pin one thing</strong><small>You set the boundary.</small></div>
          </li>
          <li className={journeyStep === 2 ? 'is-current' : journeyStep > 2 ? 'is-done' : ''}>
            <span>2</span><div><strong>Agent fits the load</strong><small>It previews before moving.</small></div>
          </li>
          <li className={journeyStep === 3 ? 'is-current' : journeyStep > 3 ? 'is-done' : ''}>
            <span>3</span><div><strong>Add the forgotten tray</strong><small>The plan must adapt.</small></div>
          </li>
        </ol>

        <section className="rack-rescue__stage" aria-label="Shared dishwasher rack">
          <img
            className="rack-rescue__stage-background"
            src="/rack-rescue/rack-background.webp"
            alt="A marble counter beside an empty open dishwasher rack, viewed from above."
          />
          <div className="rack-rescue__counter-label">Waiting on the counter</div>
          <div className="rack-rescue__rack-label">Shared rack</div>
          {!snapshot.roastingTrayRevealed ? (
            <div className="rack-rescue__reserved-zone" aria-hidden="true">
              <span>Keep room for a pan</span>
            </div>
          ) : null}
          <div className="rack-rescue__spray-zone" aria-hidden="true"><span>Spray arm</span></div>

          {visibleDishes.map((dish) => {
            const placement = placementMap.get(dish.id)
            const [left, top, rotation] = counterPositions[dish.id]
            const style = placement
              ? {
                  left: `${51.8 + placement.column * 5.45}%`,
                  top: `${12.5 + placement.row * 12.3}%`,
                  transform: `translate(-50%, -50%) rotate(${placement.orientation === 'east' ? 90 : 0}deg)`,
                }
              : {
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }
            return (
              <div
                className={`${dishClass(dish)}${placement ? ' is-in-rack' : ''}${snapshot.preview ? ' is-preview' : ''}`}
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

          <div className={`rack-rescue__story-card ${snapshot.conflictCount ? 'is-blocked' : ''}`} aria-live="polite">
            {snapshot.preview ? (
              snapshot.preview.valid ? (
                <><CheckCircle weight="fill" /><div><strong>Plan fits</strong><span>Preview only. Nothing moved yet.</span></div></>
              ) : (
                <><WarningCircle weight="fill" /><div><strong>Blocked plan</strong><span>{snapshot.preview.conflicts[0]?.message}</span></div></>
              )
            ) : snapshot.roastingTrayRevealed && snapshot.placements.some((placement) => placement.dishId === 'RR-ROASTING-TRAY') ? (
              <><CheckCircle weight="fill" /><div><strong>Everything fits</strong><span>The mug stayed pinned. Zero conflicts.</span></div></>
            ) : snapshot.placements.length ? (
              <><CheckCircle weight="fill" /><div><strong>First load fitted</strong><span>Now add the forgotten tray.</span></div></>
            ) : (
              <><MagicWand weight="fill" /><div><strong>Ready for the agent</strong><span>Pin your mug, then ask it to fit the load.</span></div></>
            )}
          </div>
        </section>

        <section className="rack-rescue__controls" aria-label="Human and prototype controls">
          <div>
            <span className="rack-rescue__eyebrow">Your controls</span>
            <div className="rack-rescue__button-row">
              <button disabled={Boolean(mugLocked)} onClick={() => act(() => control.pinRedMug(snapshot.revision))}>
                <LockKey weight="bold" /> {mugLocked ? 'Red mug pinned' : 'Pin my red mug'}
              </button>
              <button
                disabled={agentPlacedDishCount === 0 || snapshot.roastingTrayRevealed}
                onClick={() => act(() => control.revealRoastingTray(snapshot.revision))}
              >
                <Plus weight="bold" /> {snapshot.roastingTrayRevealed ? 'Tray added' : 'Add forgotten tray'}
              </button>
              {snapshot.undo ? (
                <button onClick={() => act(() => control.undoLoadPlan(snapshot.revision, snapshot.undo!.token))}>
                  <ArrowCounterClockwise weight="bold" /> Undo plan
                </button>
              ) : null}
            </div>
          </div>

          <details>
            <summary>No compatible agent? Run the same visible prototype journey</summary>
            <div className="rack-rescue__button-row">
              {!snapshot.roastingTrayRevealed ? (
                <button disabled={!mugLocked || agentPlacedDishCount > 0} onClick={showBlocked}>
                  Show blocked first plan
                </button>
              ) : null}
              <button disabled={!mugLocked || canApply} onClick={previewGood}>
                {snapshot.roastingTrayRevealed ? 'Preview adapted plan' : 'Correct the plan'}
              </button>
              <button disabled={!canApply} onClick={applyCurrent}>Apply valid preview</button>
              <button
                onClick={() => {
                  setControl(createRackRescueControl())
                  setError(null)
                  setRegistrationPending(true)
                  setRegistration(null)
                  setToolNames([])
                }}
              >
                Restart
              </button>
            </div>
          </details>
          {error ? <p className="rack-rescue__error" role="alert">{error}</p> : null}
        </section>

        <details className="rack-rescue__webmcp-details">
          <summary>View the five WebMCP tools and safety boundary</summary>
          <div>
            <p>
              The browser agent can read the rack, inspect dishes, preview a
              complete plan, apply a conflict-free preview and Undo its last
              plan. It cannot override your mug lock, hide conflicts, start a
              dishwasher cycle, order products or call a hidden solver.
            </p>
            <ul>{permanentRackRescueToolNames.map((name) => <li key={name}><code>{name}</code></li>)}</ul>
          </div>
        </details>
      </main>
    </div>
  )
}

export default RackRescueApp
