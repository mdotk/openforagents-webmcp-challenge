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

const agentRequest = 'Prepare this decision for me. Read the mission, science packets and maneuver window once. Use that evidence to test a probe-return route, one failed control and a science-transmission route. Use no more than five simulations. Present both viable futures together, then stop. Do not select a future or execute anything.'
const yearTicks = Object.freeze(Array.from({ length: 24 }, (_, year) => year))

type ExecutionBeat = 'idle' | 'burn' | 'signal' | 'arrival' | 'complete'
type CopyState = 'idle' | 'copying' | 'copied' | 'manual'

const clipboardTimeoutMilliseconds = 1_200

async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) return false

  let timeoutId: number | undefined
  try {
    return await Promise.race([
      navigator.clipboard.writeText(text).then(() => true, () => false),
      new Promise<false>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(false), clipboardTimeoutMilliseconds)
      }),
    ])
  } catch {
    return false
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function missionStage(phase: string, simulationCount: number, executionBeat: ExecutionBeat, activityStarted: boolean) {
  if (phase === 'executed') return executionBeat === 'complete' ? 'received' : 'executing'
  if (phase === 'authorized') return 'authorized'
  if (phase === 'review') return 'decision'
  if (simulationCount || activityStarted) return 'investigating'
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
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [activityMessage, setActivityMessage] = useState<string | null>(null)
  const [agentActivityDetected, setAgentActivityDetected] = useState(false)
  const [toolsPaused, setToolsPaused] = useState(false)
  const [executionBeat, setExecutionBeat] = useState<ExecutionBeat>('idle')
  const [error, setError] = useState<string | null>(null)
  const decisionRef = useRef<HTMLHeadingElement>(null)
  const receiptId = snapshot.receipt?.id

  const reportToolActivity = useCallback((message: string) => {
    setAgentActivityDetected(true)
    setAgentPromptVisible(false)
    setActivityMessage(message)
  }, [])

  useEffect(() => {
    const previous = document.title
    document.title = 'WORLDLINE — One probe. One signal.'
    return () => { document.title = previous }
  }, [])

  useEffect(() => {
    let cancelled = false
    let active: WorldlineToolsRegistration | null = null
    void registerWorldlineTools(control, undefined, reportToolActivity)
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
  }, [control, reportToolActivity])

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
      const probeReturn = control.simulate({
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
      setActivityMessage('Placing both viable futures on the shared page')
      control.presentChoices(probeReturn.id, discovery.id, control.getSnapshot().revision)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setWorking(false)
    }
  }, [control, snapshot.phase, working])

  const approve = useCallback((simulationId: string) => {
    if (!snapshot.review) return
    try {
      control.approveBurnReview(snapshot.review.id, simulationId)
      setActivityMessage('One exact burn is authorized')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control, snapshot.review])

  const executeAuthorized = useCallback(() => {
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
    setCopyState('idle')
    setActivityMessage(null)
    setAgentActivityDetected(false)
    setToolsPaused(false)
    setExecutionBeat('idle')
    setError(null)
  }, [registration])

  const stopAgentTools = useCallback(async () => {
    if (!registration) return
    await registration.dispose()
    setRegistration(null)
    setToolNames([])
    setToolsPaused(true)
    setActivityMessage('Agent tools stopped')
  }, [registration])

  const copyRequest = useCallback(async () => {
    setAgentPromptVisible(true)
    setCopyState('copying')
    const copied = await copyText(agentRequest)
    if (copied) {
      setCopyState('copied')
      setError(null)
    } else {
      setCopyState('manual')
      setError('Copy failed. Select the request below and copy it manually.')
    }
  }, [])

  const stage = missionStage(snapshot.phase, snapshot.simulations.length, executionBeat, agentActivityDetected || working)
  const selectedSimulationId = snapshot.receipt?.simulationId ?? snapshot.activeGrant?.simulationId
  const selectedSimulation = selectedSimulationId
    ? snapshot.simulations.find((simulation) => simulation.id === selectedSimulationId)
    : null
  const probeReturnChoice = snapshot.choices
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.choices?.probeReturnSimulationId)
    : null
  const scienceTransmissionChoice = snapshot.choices
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.choices?.scienceTransmissionSimulationId)
    : null
  const agentReady = !toolsPaused && registration?.supported && toolNames.length > 0
  const modeledToolCount = snapshot.phase === 'executed' ? 2 : snapshot.activeGrant ? 6 : 5
  const scienceReachedEarth = Boolean(snapshot.receipt?.packetIds.length)
  const escapeTested = snapshot.simulations.some((simulation) => simulation.probeSurvives)
  const lossTested = snapshot.simulations.some((simulation) => !simulation.viable)
  const signalTested = snapshot.simulations.some((simulation) => simulation.discoveryDelivered)
  const simulationAttemptsUsed = snapshot.simulationAttemptsUsed
  const outcomesFound = [escapeTested, lossTested, signalTested].filter(Boolean).length
  const futureHeading = toolsPaused
    ? 'Agent tools stopped.'
    : outcomesFound === 0
      ? 'Investigation started.'
      : `${outcomesFound} of 3 outcomes found.`
  const futureExplanation = activityMessage ?? `${simulationAttemptsUsed} of 5 simulation attempts used.`
  const activeCaption = toolsPaused
    ? 'WebMCP tools paused'
    : stage === 'waiting'
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
                ? scienceReachedEarth ? 'Two packets crossing space' : 'Probe returning'
                : scienceReachedEarth ? 'Earth clock advancing' : 'Probe clear'
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
                : toolsPaused
                  ? 'WebMCP paused'
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
                    <Copy aria-hidden="true" /> Copy mission for my agent
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
              <p className="worldline-eyebrow">
                {copyState === 'copied'
                  ? <><Check weight="bold" /> Mission copied</>
                  : copyState === 'copying'
                    ? 'Copying mission…'
                    : copyState === 'manual'
                      ? 'Copy did not finish'
                      : 'Give this mission to your agent'}
              </p>
              <h1 id="worldline-title">Open your browser agent.</h1>
              <p className="worldline-lede">Paste this request and press Send. The agent will call tools automatically; the scene will change as it tests up to five browser-local futures.</p>
              <ul className="worldline-agent-expectations">
                <li>No real burn occurs during investigation.</li>
                <li>The agent must stop with two futures for you.</li>
                <li>Only your choice can create the one-use burn tool.</li>
              </ul>
              <blockquote>{agentRequest}</blockquote>
              <div className="worldline-actions">
                <button className="worldline-primary" onClick={copyRequest} disabled={copyState === 'copying'}><Copy aria-hidden="true" /> {copyState === 'copying' ? 'Copying…' : 'Copy request again'}</button>
                <button className="worldline-secondary" onClick={() => { setAgentPromptVisible(false); setCopyState('idle'); setError(null) }}>Back</button>
              </div>
            </div>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">{toolsPaused ? 'You stopped the tools' : agentActivityDetected ? 'Agent activity detected' : 'Guided investigation'}</p>
              <h1 id="worldline-title">{futureHeading}</h1>
              <p className="worldline-lede">{futureExplanation}</p>
              <p className="worldline-attempts">{simulationAttemptsUsed} of 5 simulation attempts used</p>
              {agentActivityDetected && !guided && registration && !toolsPaused ? (
                <button className="worldline-secondary" onClick={() => { void stopAgentTools() }}>Stop agent tools</button>
              ) : null}
              {toolsPaused ? (
                <button className="worldline-secondary" onClick={reset}><ArrowCounterClockwise aria-hidden="true" /> Start over</button>
              ) : null}
            </>
          )}

          {stage === 'decision' && snapshot.choices && probeReturnChoice && scienceTransmissionChoice && (
            <div className="worldline-decision">
              <div className="worldline-decision-intro">
                <p className="worldline-eyebrow">Your decision</p>
                <h1 id="worldline-title" ref={decisionRef} tabIndex={-1}>What comes home?</h1>
                <p className="worldline-lede">The agent found both possible futures. It cannot decide which loss you accept.</p>
              </div>
              <div className="worldline-choice-grid">
                <article>
                  <p>Save the spacecraft</p>
                  <h2>Bring the probe home</h2>
                  <span>The probe returns. The unique discovery is lost.</span>
                  <dl><div><dt>Burn</dt><dd>{probeReturnChoice.burnAtProbeSecond}s · {probeReturnChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Signal</dt><dd>None</dd></div></dl>
                  <button className="worldline-secondary" onClick={() => approve(probeReturnChoice.id)}>Choose the probe</button>
                </article>
                <article>
                  <p>Save the discovery</p>
                  <h2>Send the science</h2>
                  <span>Thirty megabytes reach Earth 23 years later. The probe does not return.</span>
                  <dl><div><dt>Burn</dt><dd>{scienceTransmissionChoice.burnAtProbeSecond}s · {scienceTransmissionChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Arrival</dt><dd>+23 years</dd></div></dl>
                  <button className="worldline-primary" onClick={() => approve(scienceTransmissionChoice.id)}>Choose the discovery <ArrowRight aria-hidden="true" /></button>
                </article>
              </div>
            </div>
          )}

          {stage === 'authorized' && (
            <>
              <p className="worldline-eyebrow">Your burn is ready</p>
              <h1 id="worldline-title">{selectedSimulation?.discoveryDelivered ? 'Send the discovery.' : 'Bring the probe home.'}</h1>
              <p className="worldline-lede">This is the final step. Execute the burn to {selectedSimulation?.discoveryDelivered ? 'send the discovery to Earth. The probe will not return.' : 'return the probe. The discovery will be lost.'}</p>
              <button className="worldline-primary" onClick={executeAuthorized}>
                {selectedSimulation?.discoveryDelivered ? 'Send the discovery' : 'Execute the return burn'} <ArrowRight aria-hidden="true" />
              </button>
              <p className="worldline-agent-wait">You can finish here now. A WebMCP-enabled browser agent can use the same one-use action.</p>
            </>
          )}

          {stage === 'executing' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow">Authorized burn executing</p>
              <h1 id="worldline-title">
                {executionBeat === 'burn'
                  ? 'Burn.'
                  : executionBeat === 'signal' && scienceReachedEarth
                    ? <>The discovery<br />is leaving.</>
                    : executionBeat === 'signal'
                      ? <>The probe<br />turns home.</>
                      : scienceReachedEarth ? <>Earth<br />waits.</> : <>The probe<br />is clear.</>}
              </h1>
              <p className="worldline-lede">
                {executionBeat === 'burn'
                  ? 'The approved burn commits the probe to the future you chose.'
                  : executionBeat === 'signal' && scienceReachedEarth
                    ? 'Gravity map. Horizon spectrum. Thirty megabytes cross the final signal window.'
                    : executionBeat === 'signal'
                      ? 'The high-energy burn carries the probe away from the black hole—and turns its antenna away from Earth.'
                      : scienceReachedEarth ? 'The probe is gone. The signal continues across the distance to Earth.' : 'The spacecraft survives. The unique observation does not.'}
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
