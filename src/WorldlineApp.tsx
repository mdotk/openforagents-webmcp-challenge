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

const agentRequest = 'Investigate this mission. Inspect the science packets and signal window, simulate at least three distinct worldlines, put one viable plan and its exact consequence on the shared page, request my review, and stop. Do not choose what matters for me.'
const yearTicks = Object.freeze(Array.from({ length: 24 }, (_, year) => year))

type ExecutionBeat = 'idle' | 'burn' | 'signal' | 'arrival' | 'complete'

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function missionStage(phase: string, simulationCount: number, executionBeat: ExecutionBeat) {
  if (phase === 'executed') return executionBeat === 'complete' ? 'received' : 'executing'
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
  const [agentPromptVisible, setAgentPromptVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activityMessage, setActivityMessage] = useState<string | null>(null)
  const [executionBeat, setExecutionBeat] = useState<ExecutionBeat>('idle')
  const [error, setError] = useState<string | null>(null)
  const decisionRef = useRef<HTMLHeadingElement>(null)
  const receiptId = snapshot.receipt?.id

  useEffect(() => {
    const previous = document.title
    document.title = 'WORLDLINE — One probe. One signal.'
    return () => { document.title = previous }
  }, [])

  useEffect(() => {
    let cancelled = false
    let active: WorldlineToolsRegistration | null = null
    void registerWorldlineTools(control, undefined, setActivityMessage)
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

  useEffect(() => {
    if (!receiptId) return
    const shouldAnimate = typeof window.matchMedia === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!shouldAnimate) {
      const completeImmediately = window.setTimeout(() => setExecutionBeat('complete'), 0)
      return () => window.clearTimeout(completeImmediately)
    }
    const burn = window.setTimeout(() => setExecutionBeat('burn'), 0)
    const signal = window.setTimeout(() => setExecutionBeat('signal'), 800)
    const arrival = window.setTimeout(() => setExecutionBeat('arrival'), 3100)
    const complete = window.setTimeout(() => setExecutionBeat('complete'), 5000)
    return () => {
      window.clearTimeout(burn)
      window.clearTimeout(signal)
      window.clearTimeout(arrival)
      window.clearTimeout(complete)
    }
  }, [receiptId])

  const showFutures = useCallback(async () => {
    if (working || snapshot.phase !== 'investigating') return
    setWorking(true)
    setGuided(true)
    setAgentPromptVisible(false)
    setError(null)
    try {
      setActivityMessage('Testing an early escape burn')
      control.simulate({
        burnAtProbeSecond: 40,
        deltaVMetersPerSecond: 3500,
        packetIds: [],
      }, control.getSnapshot().revision)
      await pause(900)
      setActivityMessage('Testing a late burn')
      control.simulate({
        burnAtProbeSecond: 55,
        deltaVMetersPerSecond: 2600,
        packetIds: ['gravity-map', 'horizon-spectrum'],
      }, control.getSnapshot().revision)
      await pause(900)
      setActivityMessage('Testing the final transmission window')
      const discovery = control.simulate({
        burnAtProbeSecond: 46,
        deltaVMetersPerSecond: 2200,
        packetIds: ['gravity-map', 'horizon-spectrum'],
      }, control.getSnapshot().revision)
      await pause(1100)
      setActivityMessage('Placing one viable future on the shared page')
      const plan = control.updatePlan(
        discovery.id,
        'Send the discovery home',
        'The two unique packets finish transmitting at probe second 71. The navigation archive is already safe on Earth.',
        control.getSnapshot().revision,
      )
      await pause(700)
      setActivityMessage('The remaining choice is yours')
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
      setActivityMessage('One exact burn is authorized')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control, snapshot.review])

  const executeGuided = useCallback(() => {
    if (!snapshot.activeGrant) return
    try {
      setActivityMessage('The authorized burn is executing')
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
    setAgentPromptVisible(false)
    setCopied(false)
    setActivityMessage(null)
    setExecutionBeat('idle')
    setError(null)
  }, [registration])

  const copyRequest = useCallback(async () => {
    setAgentPromptVisible(true)
    try {
      await navigator.clipboard.writeText(agentRequest)
      setCopied(true)
      setError(null)
    } catch {
      setCopied(false)
      setError('Copy failed. Select the request below and copy it manually.')
    }
  }, [])

  const stage = missionStage(snapshot.phase, snapshot.simulations.length, executionBeat)
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
  const escapeTested = snapshot.simulations.some((simulation) => simulation.probeSurvives)
  const lossTested = snapshot.simulations.some((simulation) => !simulation.viable)
  const signalTested = snapshot.simulations.some((simulation) => simulation.discoveryDelivered)
  const futureCount = snapshot.simulations.length
  const futureHeading = futureCount === 1 ? 'One future.' : futureCount === 2 ? 'Two futures.' : 'Three futures.'
  const futureExplanation = futureCount === 1
    ? 'An early burn saves the probe—and loses every new observation.'
    : futureCount === 2
      ? 'A later burn loses the probe and the discovery.'
      : 'The final transmission window carries the discovery to Earth.'
  const activeCaption = stage === 'waiting'
      ? 'Awaiting investigation'
      : stage === 'investigating' && activityMessage
        ? activityMessage
      : stage === 'decision'
        ? 'Waiting for you'
        : stage === 'authorized'
          ? 'One-use authority active'
          : stage === 'executing'
            ? executionBeat === 'burn'
              ? 'Burn underway'
              : executionBeat === 'signal'
                ? 'Two packets crossing space'
                : 'Earth clock advancing'
            : stage === 'received'
              ? scienceReachedEarth ? 'Transmission verified' : 'Recovery verified'
              : `${snapshot.simulations.length} future${snapshot.simulations.length === 1 ? '' : 's'} tested`

  return (
    <main className={`worldline worldline--${stage} worldline--beat-${executionBeat}${agentPromptVisible ? ' worldline--prompt-open' : ''}${snapshot.receipt ? ` worldline--outcome-${scienceReachedEarth ? 'signal' : 'escape'}` : ''}`}>
      <section className="worldline-scene" aria-labelledby="worldline-title">
        <img className="worldline-space" src="/worldline/space-background.webp" alt="" />
        <div className="worldline-vignette" />

        <header className="worldline-header">
          <a className="worldline-mark" href="/" aria-label="Restart WORLDLINE">
            <Planet aria-hidden="true" />
            WORLDLINE
          </a>
          <div className="worldline-tools" aria-live="polite">
            <span className={agentReady ? 'worldline-tools__light is-live' : 'worldline-tools__light'} />
            <span>
              {registrationPending
                ? 'Loading tools'
                : agentReady
                  ? `WebMCP ready · ${toolNames.length} tools`
                  : `Guided mode · ${modeledToolCount} modeled tools`}
            </span>
          </div>
        </header>

        <div className="worldline-clocks" aria-label="Mission clocks">
          <div>
            <span>EARTH</span>
            {snapshot.receipt?.earthArrivalYears ? (
              <strong className="worldline-year-clock" aria-label={`${snapshot.receipt.earthArrivalYears} years`}>
                <span className="worldline-year-clock__window" aria-hidden="true">
                  <span className="worldline-year-clock__track">
                    {yearTicks.map((year) => <span key={year}>+{String(year).padStart(2, '0')} YEARS</span>)}
                  </span>
                </span>
              </strong>
            ) : <strong>00:00:00</strong>}
          </div>
          <div>
            <span>PROBE</span>
            <strong>{snapshot.receipt ? '00:09:17' : '00:00:00'}</strong>
          </div>
        </div>

        <svg className="worldline-paths" viewBox="0 0 1000 560" aria-hidden="true">
          <path data-testid="worldline-path-escape" pathLength="1" className={`worldline-path worldline-path--escape${escapeTested ? ' is-tested' : ''}`} d="M 532 300 C 500 210, 590 125, 765 150" />
          <path data-testid="worldline-path-lost" pathLength="1" className={`worldline-path worldline-path--lost${lossTested ? ' is-tested' : ''}`} d="M 532 300 C 445 300, 355 320, 238 334" />
          <path data-testid="worldline-path-signal" pathLength="1" className={`worldline-path worldline-path--signal${signalTested ? ' is-tested' : ''}`} d="M 532 300 C 650 250, 770 220, 925 175" />
          <circle className="worldline-signal" cx="915" cy="175" r="6" />
          {snapshot.receipt && scienceReachedEarth && (executionBeat === 'signal' || executionBeat === 'arrival') ? (
            <g className="worldline-transmission-packets">
              <circle r="7" className="worldline-transmission-packet">
                <animateMotion dur="2.2s" fill="freeze" path="M 532 300 C 650 250, 770 220, 925 175" />
              </circle>
              <circle r="5" className="worldline-transmission-packet worldline-transmission-packet--second">
                <animateMotion begin=".18s" dur="2.2s" fill="freeze" path="M 532 300 C 650 250, 770 220, 925 175" />
              </circle>
            </g>
          ) : null}
        </svg>

        <img className="worldline-probe" src="/worldline/probe.webp" alt="The probe approaching the black hole" />
        <div className="worldline-burn-flash" aria-hidden="true" />
        <div className="worldline-earth-impact" aria-hidden="true" />

        {stage === 'investigating' ? (
          <div className="worldline-outcomes" aria-label="Tested futures">
            <div className={escapeTested ? 'worldline-outcome is-visible' : 'worldline-outcome'}>
              <span>01</span><strong>Probe saved</strong><small>Discovery lost</small>
            </div>
            <div className={lossTested ? 'worldline-outcome is-visible' : 'worldline-outcome'}>
              <span>02</span><strong>Nothing returns</strong><small>Burn misses both paths</small>
            </div>
            <div className={signalTested ? 'worldline-outcome is-visible' : 'worldline-outcome'}>
              <span>03</span><strong>Signal reaches Earth</strong><small>Probe lost</small>
            </div>
          </div>
        ) : null}

        <section className="worldline-story" aria-live="polite">
          {stage === 'waiting' && !agentPromptVisible && (
            <>
              <p className="worldline-eyebrow">71 probe-seconds remain</p>
              <h1 id="worldline-title">One probe. One signal.<br />You can’t save both.</h1>
              <p className="worldline-lede">The probe has made a discovery beside a black hole. There is enough fuel to escape—or enough time to send it home.</p>
              <div className={agentReady ? 'worldline-mode worldline-mode--agent' : 'worldline-mode'}>
                <strong>{registrationPending ? 'Checking this browser…' : agentReady ? 'WebMCP is ready' : 'Guided version'}</strong>
                <span>{registrationPending
                  ? 'The guided mission is ready now.'
                  : agentReady
                    ? 'No agent is running yet. Give it the mission and leave this page visible.'
                    : 'This browser cannot connect an agent to the page. Run the same complete mission here.'}</span>
              </div>
              <div className="worldline-actions">
                {agentReady ? (
                  <button className="worldline-primary" onClick={copyRequest}>
                    <Copy aria-hidden="true" /> Use my browser agent
                  </button>
                ) : null}
                <button className={agentReady ? 'worldline-secondary' : 'worldline-primary'} onClick={showFutures} disabled={working}>
                  <Sparkle weight="fill" aria-hidden="true" />
                  {working ? 'Tracing the futures…' : 'Run guided mission'}
                </button>
              </div>
            </>
          )}

          {stage === 'waiting' && agentPromptVisible && (
            <div className="worldline-agent-prompt">
              <p className="worldline-eyebrow">{copied ? <><Check weight="bold" /> Mission copied</> : 'Give this mission to your agent'}</p>
              <h1 id="worldline-title">Open your browser agent.</h1>
              <p className="worldline-lede">Paste this request, then leave WORLDLINE visible. The scene will react to every future the agent tests.</p>
              <blockquote>{agentRequest}</blockquote>
              <div className="worldline-actions">
                <button className="worldline-primary" onClick={copyRequest}><Copy aria-hidden="true" /> Copy request again</button>
                <button className="worldline-secondary" onClick={() => { setAgentPromptVisible(false); setCopied(false) }}>Back</button>
              </div>
            </div>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">The mission is changing</p>
              <h1 id="worldline-title">{futureHeading}</h1>
              <p className="worldline-lede">{futureExplanation}</p>
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

          {stage === 'executing' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow">Authorized burn executing</p>
              <h1 id="worldline-title">
                {executionBeat === 'burn'
                  ? 'Burn.'
                  : executionBeat === 'signal'
                    ? <>The discovery<br />is leaving.</>
                    : <>Earth<br />waits.</>}
              </h1>
              <p className="worldline-lede">
                {executionBeat === 'burn'
                  ? 'The probe turns its antenna toward Earth and commits to the chosen worldline.'
                  : executionBeat === 'signal'
                    ? 'Gravity map. Horizon spectrum. Thirty megabytes cross the final signal window.'
                    : 'The probe is gone. The signal continues across the distance to Earth.'}
              </p>
            </>
          )}

          {stage === 'received' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow worldline-eyebrow--received"><Check weight="bold" /> {scienceReachedEarth ? 'Signal received' : 'Probe recovered'}</p>
              <h1 id="worldline-title">
                {scienceReachedEarth ? <>23 years later,<br />Earth sees what it saw.</> : <>The probe comes home.<br />The discovery does not.</>}
              </h1>
              <p className="worldline-lede">{scienceReachedEarth
                ? 'For the probe, nine minutes passed. On Earth, a generation did. The probe is gone. The discovery is not.'
                : snapshot.receipt.summary}</p>
              <button className="worldline-secondary" onClick={reset}>
                <ArrowCounterClockwise aria-hidden="true" /> Run it again
              </button>
            </>
          )}
        </section>

        <div className="worldline-status" aria-live="polite">{activeCaption}</div>
      </section>

      <section className="worldline-below">
        <div>
          <p className="worldline-below__label">An interactive science story</p>
          <p>With a compatible browser agent, a learner can investigate evidence and compare possible futures instead of watching a fixed simulation. The agent explains the trade-off; the learner decides what matters.</p>
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
          <p className="worldline-fallback">No compatible browser agent detected. “Run guided mission” uses the same shared mission state on this page.</p>
        )}
        <p className="worldline-note">A deterministic, scientifically informed educational simulation—not a precision model of a real black-hole mission.</p>
      </section>
    </main>
  )
}
