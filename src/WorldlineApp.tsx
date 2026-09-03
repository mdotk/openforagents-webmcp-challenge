import {
  ArrowCounterClockwise,
  ArrowRight,
  Check,
  Copy,
  Planet,
  Sparkle,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createWorldlineControl } from './domain'
import type { WorldlineToolsRegistration } from './types'
import { registerWorldlineTools } from './webmcp'
import './WorldlineApp.css'

const agentRequest = 'Investigate this mission. Compare the science packets and possible burns, put your best plan on the shared page, and ask me for the one decision only I can make. Do not choose what matters for me.'

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function missionStage(phase: string, simulationCount: number) {
  if (phase === 'executed') return 'received'
  if (phase === 'authorized') return 'authorized'
  if (phase === 'review') return 'decision'
  if (simulationCount) return 'investigating'
  return 'waiting'
}

export default function WorldlineApp() {
  const [control, setControl] = useState(createWorldlineControl)
  const subscribe = useCallback(
    (onStoreChange: () => void) => control.subscribe(() => onStoreChange()),
    [control],
  )
  const getSnapshot = useCallback(() => control.getSnapshot(), [control])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [registration, setRegistration] = useState<WorldlineToolsRegistration | null>(null)
  const [toolNames, setToolNames] = useState<readonly string[]>([])
  const [registrationPending, setRegistrationPending] = useState(true)
  const [working, setWorking] = useState(false)
  const [guided, setGuided] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const decisionRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const previous = document.title
    document.title = 'WORLDLINE — One probe. One signal.'
    return () => { document.title = previous }
  }, [])

  useEffect(() => {
    let cancelled = false
    let active: WorldlineToolsRegistration | null = null
    void registerWorldlineTools(control)
      .then(async (next) => {
        active = next
        if (cancelled) return next.dispose()
        setRegistration(next)
        setToolNames(await next.getRegisteredToolNames())
        setRegistrationPending(false)
      })
      .catch(() => {
        if (!cancelled) {
          setRegistrationPending(false)
          setError('WebMCP tools did not load. The guided mission still works here on the page.')
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
    return () => { cancelled = true }
  }, [registration, snapshot.revision])

  useEffect(() => {
    if (snapshot.phase !== 'review') return
    const frame = requestAnimationFrame(() => decisionRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [snapshot.phase])

  const showFutures = useCallback(async () => {
    if (working || snapshot.phase !== 'investigating') return
    setWorking(true)
    setGuided(true)
    setError(null)
    try {
      control.simulate({
        burnAtProbeSecond: 40,
        deltaVMetersPerSecond: 3500,
        packetIds: [],
      }, control.getSnapshot().revision)
      await pause(420)
      control.simulate({
        burnAtProbeSecond: 55,
        deltaVMetersPerSecond: 2600,
        packetIds: ['gravity-map', 'horizon-spectrum'],
      }, control.getSnapshot().revision)
      await pause(420)
      const discovery = control.simulate({
        burnAtProbeSecond: 46,
        deltaVMetersPerSecond: 2200,
        packetIds: ['gravity-map', 'horizon-spectrum'],
      }, control.getSnapshot().revision)
      await pause(520)
      const plan = control.updatePlan(
        discovery.id,
        'Send the discovery home',
        'The two unique packets fit the final 60-second downlink. The navigation archive is already safe on Earth.',
        control.getSnapshot().revision,
      )
      await pause(520)
      control.requestBurnReview(plan.id, control.getSnapshot().revision)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setWorking(false)
    }
  }, [control, snapshot.phase, working])

  const approve = useCallback(() => {
    if (!snapshot.review) return
    try {
      control.approveBurnReview(snapshot.review.id)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control, snapshot.review])

  const executeGuided = useCallback(() => {
    if (!snapshot.activeGrant) return
    try {
      control.executeAuthorizedBurn(snapshot.activeGrant.id)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control, snapshot.activeGrant])

  const reset = useCallback(() => {
    void registration?.dispose()
    const next = createWorldlineControl()
    setControl(next)
    setRegistration(null)
    setToolNames([])
    setRegistrationPending(true)
    setWorking(false)
    setGuided(false)
    setError(null)
  }, [registration])

  const copyRequest = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(agentRequest)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed. Select the request below and copy it manually.')
    }
  }, [])

  const stage = missionStage(snapshot.phase, snapshot.simulations.length)
  const selectedSimulation = snapshot.plan
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.plan?.simulationId)
    : null
  const agentReady = registration?.supported && toolNames.length > 0
  const modeledToolCount = snapshot.phase === 'executed' ? 2 : snapshot.activeGrant ? 7 : 6
  const scienceReachedEarth = Boolean(snapshot.receipt?.packetIds.length)
  const selectedPacketSize = selectedSimulation?.packetIds.reduce(
    (total, id) => total + (snapshot.packets.find((packet) => packet.id === id)?.sizeMegabytes ?? 0),
    0,
  ) ?? 0

  return (
    <main className={`worldline worldline--${stage}${snapshot.receipt ? ` worldline--outcome-${scienceReachedEarth ? 'signal' : 'escape'}` : ''}`}>
      <section className="worldline-scene" aria-labelledby="worldline-title">
        <img className="worldline-space" src="/worldline/space-background.webp" alt="" />
        <div className="worldline-vignette" />

        <header className="worldline-header">
          <a className="worldline-mark" href="?experience=worldline" aria-label="Restart WORLDLINE">
            <Planet aria-hidden="true" />
            WORLDLINE
          </a>
          <div className="worldline-tools" aria-live="polite">
            <span className={agentReady ? 'worldline-tools__light is-live' : 'worldline-tools__light'} />
            <span>
              {registrationPending
                ? 'Loading tools'
                : agentReady
                  ? `${toolNames.length} WebMCP tools live`
                  : `${modeledToolCount} tools with a compatible agent`}
            </span>
          </div>
        </header>

        <div className="worldline-clocks" aria-label="Mission clocks">
          <div>
            <span>EARTH</span>
            <strong>{snapshot.receipt?.earthArrivalYears ? `+${snapshot.receipt.earthArrivalYears} YEARS` : '00:00:00'}</strong>
          </div>
          <div>
            <span>PROBE</span>
            <strong>{snapshot.receipt ? '00:09:17' : '00:00:00'}</strong>
          </div>
        </div>

        <svg className="worldline-paths" viewBox="0 0 1000 560" aria-hidden="true">
          <path className="worldline-path worldline-path--escape" d="M 532 300 C 500 210, 590 125, 765 150" />
          <path className="worldline-path worldline-path--lost" d="M 532 300 C 445 300, 355 320, 238 334" />
          <path className="worldline-path worldline-path--signal" d="M 532 300 C 650 250, 770 220, 925 175" />
          <circle className="worldline-signal" cx="915" cy="175" r="6" />
        </svg>

        <img className="worldline-probe" src="/worldline/probe.webp" alt="The probe approaching the black hole" />

        <section className="worldline-story" aria-live="polite">
          {stage === 'waiting' && (
            <>
              <p className="worldline-eyebrow">71 probe-seconds remain</p>
              <h1 id="worldline-title">One probe. One signal.<br />You can’t save both.</h1>
              <p className="worldline-lede">The probe has made a discovery beside a black hole. There is enough fuel to escape—or enough time to send it home.</p>
              <div className="worldline-actions">
                <button className="worldline-primary" onClick={showFutures} disabled={working}>
                  <Sparkle weight="fill" aria-hidden="true" />
                  {working ? 'Tracing the futures…' : 'Show me the futures'}
                </button>
                <button className="worldline-secondary" onClick={copyRequest}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? 'Request copied' : 'Use my browser agent'}
                </button>
              </div>
            </>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">The mission is changing</p>
              <h1 id="worldline-title">Three futures.</h1>
              <p className="worldline-lede">One saves the probe. One loses everything. One gets the discovery to Earth.</p>
            </>
          )}

          {stage === 'decision' && snapshot.plan && selectedSimulation && (
            <div className="worldline-decision">
              <p className="worldline-eyebrow">Your decision</p>
              <h1 id="worldline-title" ref={decisionRef} tabIndex={-1}>{snapshot.plan.title}?</h1>
              <p className="worldline-lede">{snapshot.plan.rationale}</p>
              <p className="worldline-consequence">{snapshot.plan.consequence}</p>
              <dl className="worldline-choice-facts">
                <div><dt>Signal</dt><dd>{selectedPacketSize ? `${selectedPacketSize} MB` : 'None'}</dd></div>
                <div><dt>Earth receives it</dt><dd>{selectedSimulation.earthArrivalYears ? `+${selectedSimulation.earthArrivalYears} years` : 'Never'}</dd></div>
                <div><dt>Probe returns</dt><dd>{selectedSimulation.probeSurvives ? 'Yes' : 'No'}</dd></div>
              </dl>
              <button className="worldline-primary" onClick={approve}>
                Approve this one burn <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}

          {stage === 'authorized' && (
            <>
              <p className="worldline-eyebrow">One exact burn is now possible</p>
              <h1 id="worldline-title">Decision made.</h1>
              <p className="worldline-lede">Approval added a temporary WebMCP tool. It can execute only this burn, once.</p>
              {guided ? (
                <button className="worldline-primary" onClick={executeGuided}>
                  Send the signal <ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <p className="worldline-agent-wait">Your browser agent can now execute the authorized burn.</p>
              )}
            </>
          )}

          {stage === 'received' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow worldline-eyebrow--received"><Check weight="bold" /> {scienceReachedEarth ? 'Signal received' : 'Probe recovered'}</p>
              <h1 id="worldline-title">
                {scienceReachedEarth ? <>23 years later,<br />Earth sees what it saw.</> : <>The probe comes home.<br />The discovery does not.</>}
              </h1>
              <p className="worldline-lede">{snapshot.receipt.summary} Planning is over. Only the final state and verified receipt remain.</p>
              <button className="worldline-secondary" onClick={reset}>
                <ArrowCounterClockwise aria-hidden="true" /> Run it again
              </button>
            </>
          )}
        </section>

        <div className="worldline-status" aria-live="polite">
          {stage === 'waiting' && 'Awaiting investigation'}
          {stage === 'investigating' && `${snapshot.simulations.length} future${snapshot.simulations.length === 1 ? '' : 's'} tested`}
          {stage === 'decision' && 'Waiting for you'}
          {stage === 'authorized' && 'One-use authority active'}
          {stage === 'received' && (scienceReachedEarth ? 'Transmission verified' : 'Recovery verified')}
        </div>
      </section>

      <section className="worldline-below">
        <div>
          <p className="worldline-below__label">What is happening?</p>
          <p>A browser agent can inspect the mission, test possible futures and explain the trade-off. You decide what matters. Approval creates one exact action, then removes it after use.</p>
        </div>
        <details>
          <summary>Mission data and exact tools</summary>
          <div className="worldline-details-grid">
            <div>
              <h2>Science waiting</h2>
              {snapshot.packets.map((packet) => (
                <p key={packet.id}><strong>{packet.name}</strong> · {packet.sizeMegabytes} MB<br /><span>{packet.observation}</span></p>
              ))}
            </div>
            <div>
              <h2>Tools visible now</h2>
              <p>{toolNames.length ? toolNames.join(' · ') : 'No compatible WebMCP surface detected. Use the guided mission above.'}</p>
            </div>
          </div>
        </details>
        {error && <p className="worldline-error" role="alert">{error}</p>}
        {!agentReady && !registrationPending && (
          <p className="worldline-fallback">No compatible browser agent detected. “Show me the futures” runs the same complete mission on this page.</p>
        )}
        <p className="worldline-note">A deterministic, scientifically informed educational simulation—not a precision model of a real black-hole mission.</p>
      </section>
    </main>
  )
}
