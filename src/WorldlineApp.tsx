import {
  ArrowCounterClockwise,
  ArrowRight,
  Check,
  Planet,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createWorldlineControl, WORLDLINE_CONSTRAINTS, WORLDLINE_HUMAN_PRIORITIES } from './domain'
import type { LearnerPredictionId, LearnerTransmissionEstimateSeconds, WorldlineToolsRegistration } from './types'
import { registerWorldlineTools } from './webmcp'
import { formatMissionClock, recommendationStory, storyForSimulation } from './worldline-narrative'
import './WorldlineApp.css'

const yearTicks = Object.freeze(Array.from({ length: 24 }, (_, year) => year))

type ExecutionBeat = 'idle' | 'burn' | 'lock' | 'packet-one' | 'packet-two' | 'contact' | 'transit' | 'arrival' | 'complete'
type PriorityId = keyof typeof WORLDLINE_HUMAN_PRIORITIES

const priorities = Object.freeze({
  discovery: {
    label: 'Irreplaceable science',
    statement: WORLDLINE_HUMAN_PRIORITIES.discovery,
  },
  probe: {
    label: 'The spacecraft',
    statement: WORLDLINE_HUMAN_PRIORITIES.probe,
  },
} as const)

const learnerPredictions: Readonly<Record<LearnerPredictionId, { label: string; explanation: string }>> = Object.freeze({
  time: { label: 'Not enough time', explanation: 'The data cannot finish transmitting before contact ends.' },
  fuel: { label: 'Not enough fuel', explanation: 'The probe cannot transmit and still make the escape burn.' },
  antenna: { label: 'The antenna turns away', explanation: 'The escape maneuver breaks the link with Earth.' },
  combination: { label: 'All three conflict', explanation: 'Time, thrust and antenna direction cannot all work together.' },
})

const agentCommands = Object.freeze({
  begin: 'Begin WORLDLINE.',
  prediction: 'Test my prediction.',
  execute: 'Carry out my choice.',
})

function missionStage(
  phase: string,
  simulationCount: number,
  executionBeat: ExecutionBeat,
  activityStarted: boolean,
  decisionNarrativeReady: boolean,
  predictionNarrativeReady: boolean,
  predictionActStarted: boolean,
) {
  if (phase === 'executed') return executionBeat === 'complete' ? 'received' : 'executing'
  if (phase === 'authorized') return 'authorized'
  if (phase === 'review' && decisionNarrativeReady) return 'decision'
  if (phase === 'prediction' && predictionNarrativeReady) return 'prediction'
  if (phase === 'investigating_prediction' && !predictionActStarted) return 'prediction-handoff'
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
  const [priorityId, setPriorityId] = useState<PriorityId>('discovery')
  const [activityMessage, setActivityMessage] = useState<string | null>(null)
  const [activityTrail, setActivityTrail] = useState<readonly string[]>([])
  const [agentActivityDetected, setAgentActivityDetected] = useState(false)
  const [toolsPaused, setToolsPaused] = useState(false)
  const [executionBeat, setExecutionBeat] = useState<ExecutionBeat>('idle')
  const [visibleSimulationCount, setVisibleSimulationCount] = useState(0)
  const [decisionNarrativeReady, setDecisionNarrativeReady] = useState(false)
  const [predictionNarrativeReady, setPredictionNarrativeReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const decisionRef = useRef<HTMLHeadingElement>(null)
  const predictionRef = useRef<HTMLHeadingElement>(null)
  const receiptId = snapshot.receipt?.id

  const reportToolActivity = useCallback((message: string) => {
    setAgentActivityDetected(true)
    setActivityMessage(message)
    setActivityTrail((current) => current.includes(message) ? current : [...current, message])
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
          setError('WebMCP tools did not load. Reload this page in a compatible WebMCP browser.')
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
    if (snapshot.phase !== 'review' || !decisionNarrativeReady) return
    const frame = requestAnimationFrame(() => decisionRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [decisionNarrativeReady, snapshot.phase])

  useEffect(() => {
    if (snapshot.phase !== 'prediction' || !predictionNarrativeReady) return
    const frame = requestAnimationFrame(() => predictionRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [predictionNarrativeReady, snapshot.phase])

  useEffect(() => {
    if (visibleSimulationCount >= snapshot.simulations.length) {
      if (snapshot.phase === 'prediction' && !predictionNarrativeReady) {
        const delay = import.meta.env.MODE === 'test' || typeof window.matchMedia !== 'function'
          || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1_200
        const revealPrediction = window.setTimeout(() => setPredictionNarrativeReady(true), delay)
        return () => window.clearTimeout(revealPrediction)
      }
      if (snapshot.phase !== 'review' || decisionNarrativeReady) return
      const delay = import.meta.env.MODE === 'test' || typeof window.matchMedia !== 'function'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1_700
      const revealDecision = window.setTimeout(() => setDecisionNarrativeReady(true), delay)
      return () => window.clearTimeout(revealDecision)
    }

    const delay = import.meta.env.MODE === 'test' || typeof window.matchMedia !== 'function'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2_700
    const revealNext = window.setTimeout(
      () => setVisibleSimulationCount((count) => Math.min(count + 1, snapshot.simulations.length)),
      delay,
    )
    return () => window.clearTimeout(revealNext)
  }, [decisionNarrativeReady, predictionNarrativeReady, snapshot.phase, snapshot.simulations.length, visibleSimulationCount])

  useEffect(() => {
    if (!receiptId) return
    const shouldAnimate = typeof window.matchMedia === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!shouldAnimate) {
      const completeImmediately = window.setTimeout(() => setExecutionBeat('complete'), 0)
      return () => window.clearTimeout(completeImmediately)
    }
    const selected = control.getSnapshot().simulations.find((simulation) => simulation.id === control.getSnapshot().receipt?.simulationId)
    const science = Boolean(selected?.discoveryDelivered)
    const timings: readonly [ExecutionBeat, number][] = science
      ? [
          ['burn', 0],
          ['lock', 1_200],
          ['packet-one', 2_700],
          ['packet-two', 4_500],
          ['contact', 6_400],
          ['transit', 8_000],
          ['arrival', 10_000],
          ['complete', 12_000],
        ]
      : [
          ['burn', 0],
          ['lock', 1_500],
          ['contact', 3_400],
          ['arrival', 5_200],
          ['complete', 7_000],
        ]
    const timers = timings.map(([beat, delay]) => window.setTimeout(() => setExecutionBeat(beat), delay))
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [control, receiptId])

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

  const reset = useCallback(() => {
    void registration?.dispose()
    const next = createWorldlineControl()
    setControl(next)
    setRegistration(null)
    setToolNames([])
    setRegistrationPending(true)
    setActivityMessage(null)
    setActivityTrail([])
    setAgentActivityDetected(false)
    setToolsPaused(false)
    setExecutionBeat('idle')
    setVisibleSimulationCount(0)
    setDecisionNarrativeReady(false)
    setPredictionNarrativeReady(false)
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

  const choosePrediction = useCallback((predictionId: LearnerPredictionId) => {
    try {
      control.selectLearnerPrediction(predictionId, control.getSnapshot().revision)
      setActivityMessage('Your prediction is now part of the mission')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control])

  const chooseTransmissionEstimate = useCallback((seconds: LearnerTransmissionEstimateSeconds) => {
    try {
      control.selectLearnerTransmissionEstimate(seconds, control.getSnapshot().revision)
      setActivityMessage('Your transmission calculation is now part of the mission')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control])

  const changePriority = useCallback((nextPriorityId: PriorityId) => {
    try {
      control.setHumanPriority(priorities[nextPriorityId].statement, control.getSnapshot().revision)
      setPriorityId(nextPriorityId)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [control])

  const visibleSimulations = snapshot.simulations.slice(0, visibleSimulationCount)
  const activeSimulation = visibleSimulations.at(-1) ?? null
  const activeStory = activeSimulation ? storyForSimulation(activeSimulation, snapshot.packets) : null
  const predictionActStarted = Boolean(snapshot.learnerPrediction && (
    snapshot.simulations.length > snapshot.learnerPrediction.selectedAfterSimulationCount
    || activityTrail.includes('Learner prediction inspected')
  ))
  const stage = missionStage(
    snapshot.phase,
    snapshot.simulations.length,
    executionBeat,
    agentActivityDetected,
    decisionNarrativeReady,
    predictionNarrativeReady,
    predictionActStarted,
  )
  const selectedSimulationId = snapshot.receipt?.simulationId ?? snapshot.activeGrant?.simulationId
  const selectedSimulation = selectedSimulationId
    ? snapshot.simulations.find((simulation) => simulation.id === selectedSimulationId)
      ?? null
    : null
  const probeReturnChoice = snapshot.choices
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.choices?.probeReturnSimulationId)
    : null
  const scienceTransmissionChoice = snapshot.choices
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.choices?.scienceTransmissionSimulationId)
    : null
  const recommendedSimulation = snapshot.choices
    ? snapshot.simulations.find((simulation) => simulation.id === snapshot.choices?.recommendedSimulationId)
    : null
  const agentReady = !toolsPaused && registration?.supported && toolNames.length > 0
  const scienceReachedEarth = Boolean(snapshot.receipt?.packetIds.length)
  const selectedPacketMegabytes = selectedSimulation?.packetIds.reduce(
    (total, packetId) => total + (snapshot.packets.find((packet) => packet.id === packetId)?.sizeMegabytes ?? 0),
    0,
  ) ?? 0
  const selectedTransmissionFinish = selectedSimulation?.transmissionCompletesAtProbeSecond
  const selectedContactMargin = selectedTransmissionFinish === null || selectedTransmissionFinish === undefined
    ? null
    : WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond - selectedTransmissionFinish
  const escapeTested = visibleSimulations.some((simulation) => simulation.probeSurvives)
  const lossTested = visibleSimulations.some((simulation) => !simulation.viable)
  const signalTested = visibleSimulations.some((simulation) => simulation.discoveryDelivered)
  const simulationAttemptsUsed = snapshot.simulationAttemptsUsed
  const missionRead = activityTrail.includes('Mission state inspected')
  const packetsRead = activityTrail.includes('Three science packets inspected')
  const maneuverRead = activityTrail.includes('Maneuver and signal window inspected')
  const uniqueScienceMegabytes = snapshot.packets.filter((packet) => !packet.replicatedOnEarth).reduce((total, packet) => total + packet.sizeMegabytes, 0)
  const transmissionSeconds = Math.ceil(uniqueScienceMegabytes / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond)
  const activeCaption = toolsPaused
    ? 'WebMCP tools paused'
    : stage === 'waiting'
      ? 'Awaiting investigation'
      : stage === 'investigating' && activityMessage
        ? activityMessage
      : stage === 'prediction'
        ? snapshot.learnerCalculation ? 'Waiting for your prediction' : 'Waiting for your calculation'
      : stage === 'prediction-handoff'
        ? 'Your prediction is ready for the agent'
      : stage === 'decision'
        ? 'Waiting for you'
        : stage === 'authorized'
          ? 'One-use authority active'
          : stage === 'executing'
            ? executionBeat === 'burn'
              ? 'Burn underway'
              : executionBeat === 'lock'
                ? scienceReachedEarth ? 'Antenna lock held' : 'Antenna turning away'
                : executionBeat === 'packet-one'
                  ? 'Gravity map transmitting'
                  : executionBeat === 'packet-two'
                    ? 'Horizon spectrum transmitting'
                    : executionBeat === 'contact'
                      ? scienceReachedEarth ? 'Contact window closed' : 'Probe escaped'
                      : executionBeat === 'transit'
                        ? 'Signal crossing 23 light-years'
                        : scienceReachedEarth ? 'Signal arriving at Earth' : 'Probe clear'
            : stage === 'received'
              ? scienceReachedEarth ? 'Transmission verified' : 'Recovery verified'
              : `${snapshot.simulations.length} future${snapshot.simulations.length === 1 ? '' : 's'} tested`

  return (
    <main className={`worldline worldline--${stage} worldline--beat-${executionBeat}${snapshot.receipt ? ` worldline--outcome-${scienceReachedEarth ? 'signal' : 'escape'}` : ''}`}>
      <section className="worldline-scene" aria-labelledby="worldline-title">
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
                  : 'WebMCP required'}
            </span>
          </div>
        </header>

        <div className="worldline-cinematic">
          <img className="worldline-space" src="/worldline/space-background.webp" alt="" />
          <div className="worldline-vignette" />
          <div className="worldline-star-drift" aria-hidden="true" />

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
              <strong>{snapshot.receipt ? formatMissionClock(snapshot.receipt.probeElapsedSeconds) : '00:00:00'}</strong>
            </div>
          </div>

          <svg className="worldline-paths" viewBox="0 0 1000 560" aria-hidden="true">
            <defs>
              <linearGradient id="worldline-signal-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8c76ff" stopOpacity=".35" />
                <stop offset=".55" stopColor="#c7bcff" />
                <stop offset="1" stopColor="#8bf2c9" />
              </linearGradient>
            </defs>
            <path data-testid="worldline-path-escape" pathLength="1" className={`worldline-path worldline-path--escape${escapeTested ? ' is-tested' : ''}`} d="M 390 300 C 410 205, 535 125, 735 150" />
            <path data-testid="worldline-path-lost" pathLength="1" className={`worldline-path worldline-path--lost${lossTested ? ' is-tested' : ''}`} d="M 390 300 C 320 300, 245 320, 145 334" />
            <path className="worldline-path worldline-path--signal-glow" d="M 390 300 C 555 250, 740 220, 925 175" />
            <path data-testid="worldline-path-signal" pathLength="1" className={`worldline-path worldline-path--signal${signalTested ? ' is-tested' : ''}`} d="M 390 300 C 555 250, 740 220, 925 175" />
            <circle className="worldline-signal" cx="925" cy="175" r="6" />
            {snapshot.receipt && scienceReachedEarth && executionBeat === 'packet-one' ? (
              <circle r="8" className="worldline-transmission-packet">
                <animateMotion dur="1.55s" fill="freeze" path="M 390 300 C 555 250, 740 220, 925 175" />
              </circle>
            ) : null}
            {snapshot.receipt && scienceReachedEarth && executionBeat === 'packet-two' ? (
              <circle r="8" className="worldline-transmission-packet worldline-transmission-packet--second">
                <animateMotion dur="1.65s" fill="freeze" path="M 390 300 C 555 250, 740 220, 925 175" />
              </circle>
            ) : null}
          </svg>

          <div className="worldline-antenna-lock" aria-hidden="true"><span /><span /></div>
          <div className="worldline-contact-horizon" aria-hidden="true"><span>CONTACT WINDOW</span></div>
          <img className="worldline-probe" src="/worldline/probe.webp" alt="The probe approaching the black hole" />
          <div className="worldline-burn-flash" aria-hidden="true" />
          <div className="worldline-earth-impact" aria-hidden="true" />
          <div className="worldline-cinematic-status" aria-live="polite"><span>{activeCaption}</span></div>
        </div>

        <section className="worldline-story" aria-live="polite">
          {stage === 'waiting' && (
            <>
              <p className="worldline-eyebrow">71 seconds until contact is lost</p>
              <h1 id="worldline-title">Save the probe—or send its discoveries home.</h1>
              <p className="worldline-lede">A probe beside a black hole has collected two observations that can never be repeated. It has enough fuel to escape, or enough time to transmit them to Earth—but not both. Ask your browser agent to investigate the possible futures. Then you choose what comes home.</p>
              <dl className="worldline-mission-facts" aria-label="Mission stakes">
                <div><dt>Distance</dt><dd>23 light-years</dd></div>
                <div><dt>Contact</dt><dd>71 seconds</dd></div>
                <div><dt>Unique science</dt><dd>{uniqueScienceMegabytes} MB</dd></div>
              </dl>
              <label className="worldline-priority">
                <span>What should the agent protect?</span>
                <select value={priorityId} onChange={(event) => changePriority(event.target.value as PriorityId)}>
                  {Object.entries(priorities).map(([id, priority]) => <option key={id} value={id}>{priority.label}</option>)}
                </select>
                <small>{priorities[priorityId].statement}</small>
              </label>
              {!agentReady ? (
                <div className="worldline-mode">
                  <strong>{registrationPending ? 'Checking this browser…' : 'WebMCP browser required'}</strong>
                  <span>{registrationPending
                    ? 'Looking for a browser agent that can use this page’s tools.'
                    : 'Open this page in ChatGPT’s in-app browser or Chrome with WebMCP enabled.'}</span>
                </div>
              ) : null}
              {agentReady ? (
                <div className="worldline-agent-command" aria-label="Instruction for your browser agent">
                  <span>WebMCP is ready · Say to your browser agent</span>
                  <strong>{agentCommands.begin}</strong>
                  <small>The tools provide the evidence, investigation rules and stopping point.</small>
                </div>
              ) : <button className="worldline-primary" disabled>WebMCP agent required</button>}
            </>
          )}

          {stage === 'prediction' && (
            <div className="worldline-prediction">
              <p className="worldline-eyebrow">Your turn</p>
              {!snapshot.learnerCalculation ? <>
                <p className="worldline-learning-step">1 of 2 · Work out the signal time</p>
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>Can both discoveries finish transmitting?</h1>
                <p className="worldline-lede">The agent found two unique packets: 18 MB and 12 MB. The radio sends 1.2 MB each second. Add the packet sizes, then divide by the radio speed.</p>
                <div className="worldline-calculation" aria-label="Transmission-time calculation">
                  <div className="worldline-calculation__formula"><span>18 MB + 12 MB</span><b>÷</b><span>1.2 MB/s</span><b>=</b><strong>?</strong></div>
                  <div className="worldline-calculation__choices" role="group" aria-label="Choose the transmission time">
                    {([12, 25, 36] as const).map((seconds) => <button key={seconds} onClick={() => chooseTransmissionEstimate(seconds)}>{seconds} seconds</button>)}
                  </div>
                </div>
                <p className="worldline-agent-wait">This calculation tells you how long the antenna must remain pointed at Earth.</p>
              </> : <>
                <p className="worldline-learning-step">2 of 2 · Predict the cause</p>
                <div className={`worldline-calculation-result${snapshot.learnerCalculation.correct ? ' is-correct' : ''}`} role="status">
                  <strong>{snapshot.learnerCalculation.correct ? 'Correct.' : 'Not quite.'} The transmission takes {snapshot.learnerCalculation.correctSeconds} seconds.</strong>
                  <span>18 MB + 12 MB = 30 MB. Then 30 MB ÷ 1.2 MB/s = 25 seconds.</span>
                </div>
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>Why can’t one burn save both?</h1>
                <p className="worldline-lede">The agent found both extremes: a hard early burn can save the probe, and a gentler later burn can send the discoveries. Before it tests the middle, make your prediction.</p>
                <div className="worldline-prediction-grid" role="group" aria-label="Choose your prediction">
                  {(Object.entries(learnerPredictions) as [LearnerPredictionId, { label: string; explanation: string }][]).map(([id, prediction]) => (
                    <button key={id} onClick={() => choosePrediction(id)}>
                      <strong>{prediction.label}</strong>
                      <span>{prediction.explanation}</span>
                    </button>
                  ))}
                </div>
                <p className="worldline-agent-wait">Your calculation and prediction become shared page state. The agent must read them, test your idea and explain what you got right.</p>
              </>}
            </div>
          )}

          {stage === 'prediction-handoff' && snapshot.learnerPrediction && (
            <div className="worldline-agent-prompt worldline-prediction-handoff">
              <p className="worldline-eyebrow">Prediction recorded</p>
              <h1 id="worldline-title">Now challenge your idea.</h1>
              <p className="worldline-lede">You chose: <strong>{learnerPredictions[snapshot.learnerPrediction.id].label}</strong>. Return to the same agent. It will read your prediction from the page, test a compromise and a counterexample, then explain what the evidence supports.</p>
              <div className="worldline-agent-command" aria-label="Next instruction for your browser agent">
                <span>Say to your browser agent</span>
                <strong>{agentCommands.prediction}</strong>
                <small>Your calculation, prediction and priority are already in the shared mission state.</small>
              </div>
            </div>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">{toolsPaused ? 'You stopped the tools' : 'Agent activity detected'}</p>
              <h1 id="worldline-title">{snapshot.phase === 'investigating_prediction' ? 'The agent is testing your prediction.' : 'The agent is finding the two extremes.'}</h1>
              <p className="worldline-lede">{snapshot.phase === 'investigating_prediction'
                ? `You predicted: ${snapshot.learnerPrediction?.statement} It must now test a compromise and a counterexample before explaining what the evidence supports.`
                : 'It is testing one way to save the probe and one way to send the discoveries. Then it must stop so you can calculate the signal time and predict what prevents both.'}</p>
              {snapshot.simulations.length > visibleSimulationCount ? <p className="worldline-narrative-buffer">The agent has completed {snapshot.simulations.length} test{snapshot.simulations.length === 1 ? '' : 's'}. Replaying the investigation at a pace you can follow.</p> : null}
              <div className="worldline-evidence" aria-label="Evidence learned">
                <span className={packetsRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{packetsRead ? `${uniqueScienceMegabytes} MB worth saving` : 'Packet value pending'}</b><small>{packetsRead ? 'The 72 MB archive already exists on Earth.' : 'Waiting for the packet manifest.'}</small></span>
                <span className={packetsRead && maneuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{packetsRead && maneuverRead ? `${transmissionSeconds} seconds to transmit` : 'Transmission time pending'}</b><small>{packetsRead && maneuverRead ? `${uniqueScienceMegabytes} MB ÷ 1.2 MB/s` : 'Waiting for packet size and downlink rate.'}</small></span>
                <span className={missionRead && maneuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{missionRead && maneuverRead ? 'One physical conflict' : 'Maneuver conflict pending'}</b><small>{missionRead && maneuverRead ? 'Escape thrust breaks antenna lock.' : 'Waiting for the mission and maneuver evidence.'}</small></span>
              </div>
              <div className="worldline-investigation" aria-label="Agent investigation">
                <header>
                  <strong>{activeStory ? `Possible future ${visibleSimulationCount}` : activityMessage ?? 'Reading the mission evidence…'}</strong>
                  <span>{visibleSimulationCount} of 5 tests shown</span>
                </header>
                {activeStory && activeSimulation ? (
                  <article className={`worldline-investigation__active worldline-investigation__active--${activeSimulation.outcome}`}>
                    <p className="worldline-investigation__question"><b>Question</b> {activeStory.question}</p>
                    <p className="worldline-investigation__plan"><b>Agent tests</b> {activeStory.plan}</p>
                    <p className="worldline-investigation__outcome"><b>Outcome</b><strong>{activeStory.outcomeSummary}</strong></p>
                    <p className="worldline-investigation__explanation"><b>Why</b> {activeStory.result}</p>
                    {activeStory.calculation ? <p className="worldline-investigation__calculation"><b>The numbers</b> {activeStory.calculation}</p> : null}
                    <p className="worldline-investigation__lesson"><b>What this teaches us</b> {activeStory.lesson}</p>
                  </article>
                ) : <p className="worldline-investigation__empty">The agent is measuring the data, signal window and escape corridor before spending its first simulation.</p>}
                {visibleSimulations.length > 1 ? (
                  <ol className="worldline-investigation__history" aria-label="Earlier tests">
                    {visibleSimulations.slice(0, -1).map((simulation, index) => {
                      const story = storyForSimulation(simulation, snapshot.packets)
                      return <li key={simulation.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{story.outcomeSummary}</strong><small>{story.lesson}</small></div></li>
                    })}
                  </ol>
                ) : null}
              </div>
              {agentActivityDetected && registration && !toolsPaused ? (
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
                <p className="worldline-lede">Across a three-part investigation and {simulationAttemptsUsed} tests, the agent proved there is no route that saves both. It found two credible futures and one unavoidable loss. Only you can choose which loss to accept.</p>
              </div>
              {snapshot.learnerPrediction ? (
                <aside className={`worldline-learning-result worldline-learning-result--${snapshot.choices.predictionAssessment}`}>
                  <p>Your prediction · {snapshot.choices.predictionAssessment.replace('_', ' ')}</p>
                  <strong>{learnerPredictions[snapshot.learnerPrediction.id].label}</strong>
                  <span>{snapshot.choices.teachingExplanation}</span>
                </aside>
              ) : null}
              <section className="worldline-constraint-proof" aria-labelledby="worldline-constraint-title">
                <header>
                  <p>The decisive calculation</p>
                  <h2 id="worldline-constraint-title">The safe regions never overlap.</h2>
                </header>
                <div>
                  <article>
                    <span>Return the probe</span>
                    <strong>t ≤ {WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond}s</strong>
                    <strong>Δv ≥ {WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s</strong>
                    <small>Burn early and hard enough to escape.</small>
                  </article>
                  <div className="worldline-constraint-proof__conflict" aria-label="No overlap">
                    <b>No overlap</b>
                    <span>One burn cannot satisfy both.</span>
                  </div>
                  <article>
                    <span>Send the discoveries</span>
                    <strong>{WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]}s ≤ t ≤ {WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]}s</strong>
                    <strong>{WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0].toLocaleString()}–{WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1].toLocaleString()} m/s</strong>
                    <small>Burn later and gently enough to keep Earth lock.</small>
                  </article>
                </div>
                <p><b>Transmission check:</b> {uniqueScienceMegabytes} MB ÷ {WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = {transmissionSeconds} seconds.</p>
              </section>
              {recommendedSimulation && snapshot.choices ? (
                <aside className="worldline-recommendation">
                  <p>Agent recommendation</p>
                  <strong>{recommendedSimulation.discoveryDelivered ? 'Send both discoveries' : 'Save the probe'}</strong>
                  <span><b>Why:</b> {recommendationStory(snapshot.choices, recommendedSimulation)}</span>
                  <small>Priority: {snapshot.choices.priority}</small>
                  <details><summary>Agent’s exact rationale</summary><span>{snapshot.choices.rationale}</span></details>
                </aside>
              ) : null}
              <div className="worldline-choice-grid">
                <article>
                  <p>Save the spacecraft</p>
                  <h2>Save the probe</h2>
                  <span>The probe escapes the gravity well. Both unique discoveries are lost.</span>
                  <dl><div><dt>Burn</dt><dd>{probeReturnChoice.burnAtProbeSecond}s · {probeReturnChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Signal</dt><dd>None</dd></div></dl>
                  <button className="worldline-secondary" onClick={() => approve(probeReturnChoice.id)}>Save the probe — lose both discoveries</button>
                </article>
                <article>
                  <p>Save the discovery</p>
                  <h2>Send the science</h2>
                  <span>Thirty megabytes reach Earth 23 years later. The probe does not return.</span>
                  <dl><div><dt>Burn</dt><dd>{scienceTransmissionChoice.burnAtProbeSecond}s · {scienceTransmissionChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Arrival</dt><dd>+23 years</dd></div></dl>
                  <button className="worldline-primary" onClick={() => approve(scienceTransmissionChoice.id)}>Send both discoveries — lose the probe <ArrowRight aria-hidden="true" /></button>
                </article>
              </div>
            </div>
          )}

          {stage === 'authorized' && (
            <>
              <p className="worldline-eyebrow">Your choice created one exact action</p>
              <h1 id="worldline-title">{selectedSimulation?.discoveryDelivered ? `${selectedPacketMegabytes} MB can leave. The probe cannot.` : 'The probe can escape. Its discoveries cannot.'}</h1>
              <p className="worldline-lede">{selectedSimulation?.discoveryDelivered
                ? `${selectedPacketMegabytes} MB ÷ ${WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = ${selectedSimulation.transmissionSeconds} seconds. Starting the burn at t+${selectedSimulation.burnAtProbeSecond}s finishes transmission at t+${selectedTransmissionFinish}s, ${selectedContactMargin === 0 ? 'exactly when contact ends' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before contact ends`}. The ${selectedSimulation.deltaVMetersPerSecond.toLocaleString()} m/s burn keeps the antenna on Earth, but cannot also meet the ${WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s escape requirement.`
                : `At t+${selectedSimulation?.burnAtProbeSecond}s, the ${selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s burn meets the escape requirement. That maneuver turns the antenna away from Earth before either unique observation can be transmitted.`}</p>
              <dl className="worldline-mission-facts" aria-label="Calculated outcome">
                {selectedSimulation?.discoveryDelivered ? <>
                  <div><dt>Data to send</dt><dd>{selectedPacketMegabytes} MB</dd></div>
                  <div><dt>Transmission</dt><dd>{selectedSimulation.transmissionSeconds}s</dd></div>
                  <div><dt>Time spare</dt><dd>{selectedContactMargin}s</dd></div>
                </> : <>
                  <div><dt>Burn begins</dt><dd>t+{selectedSimulation?.burnAtProbeSecond}s</dd></div>
                  <div><dt>Burn strength</dt><dd>{selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div>
                  <div><dt>Science sent</dt><dd>0 MB</dd></div>
                </>}
              </dl>
              <div className="worldline-agent-command" aria-label="Final instruction for your browser agent">
                <span>Return to the same agent and say</span>
                <strong>{agentCommands.execute}</strong>
                <small>The agent—not this page—must use the one-use burn and verify the final receipt.</small>
              </div>
            </>
          )}

          {stage === 'executing' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow">Authorized burn executing</p>
              <h1 id="worldline-title">
                {executionBeat === 'burn'
                  ? 'Burn.'
                  : executionBeat === 'lock'
                    ? scienceReachedEarth ? <>Antenna<br />locked on Earth.</> : <>The antenna<br />turns away.</>
                    : executionBeat === 'packet-one'
                      ? <>Gravity map<br />sent.</>
                      : executionBeat === 'packet-two'
                        ? <>Horizon spectrum<br />sent.</>
                        : executionBeat === 'contact'
                          ? scienceReachedEarth ? <>Contact<br />closed.</> : <>The probe<br />escaped.</>
                          : executionBeat === 'transit'
                            ? <>Across 23<br />light-years.</>
                            : scienceReachedEarth ? <>Signal<br />arriving.</> : <>The probe<br />is clear.</>}
              </h1>
              <p className="worldline-lede">
                {executionBeat === 'burn'
                  ? 'The approved burn commits the probe to the future you chose.'
                  : executionBeat === 'lock' && scienceReachedEarth
                    ? 'The gentler burn preserves the narrow antenna lock. The probe no longer has enough thrust to escape.'
                    : executionBeat === 'lock'
                      ? 'The high-energy burn carries the probe away from the black hole—and breaks its link with Earth.'
                      : executionBeat === 'packet-one'
                        ? 'The first 18 MB—the gravity map—leaves the probe.'
                      : executionBeat === 'packet-two'
                        ? `The final 12 MB—the horizon spectrum—finishes leaving ${selectedContactMargin === 0 ? 'as contact ends' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before contact ends`}.`
                          : executionBeat === 'contact'
                            ? scienceReachedEarth ? 'All 30 MB are clear. The probe falls silent behind them.' : 'The spacecraft survives. Neither unique observation was transmitted.'
                            : executionBeat === 'transit'
                              ? 'The signal travels at light speed. Because the probe is 23 light-years away, Earth must wait 23 years.'
                              : scienceReachedEarth ? 'Earth receives and verifies both irreplaceable observations.' : 'The return corridor is clear.'}
              </p>
              <ol className="worldline-execution-progress" aria-label="Execution progress">
                <li className={executionBeat !== 'burn' ? 'is-complete' : 'is-current'}>Burn committed</li>
                <li className={['packet-one', 'packet-two', 'contact', 'transit', 'arrival'].includes(executionBeat) ? 'is-complete' : executionBeat === 'lock' ? 'is-current' : ''}>{scienceReachedEarth ? 'Antenna lock held' : 'Antenna turned away'}</li>
                <li className={['contact', 'transit', 'arrival'].includes(executionBeat) ? 'is-complete' : ['packet-one', 'packet-two'].includes(executionBeat) ? 'is-current' : ''}>{scienceReachedEarth ? '30 MB transmitted' : 'Probe escaped'}</li>
                <li className={executionBeat === 'arrival' ? 'is-current' : ''}>{scienceReachedEarth ? 'Signal reaches Earth' : 'Outcome verified'}</li>
              </ol>
            </>
          )}

          {stage === 'received' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow worldline-eyebrow--received"><Check weight="bold" /> {scienceReachedEarth ? 'Signal received' : 'Escape verified'}</p>
              <h1 id="worldline-title">
                {scienceReachedEarth ? <>Both discoveries<br />reached Earth.</> : <>The probe escaped.<br />The discoveries did not.</>}
              </h1>
              <p className="worldline-lede">{scienceReachedEarth
                ? 'The gravity map and horizon spectrum arrived 23 years after transmission. The probe never returned. Your choice preserved the only copies of observations humanity could not repeat.'
                : 'The escape burn turned the antenna away before either discovery left. The spacecraft survives; the only copies are gone.'}</p>
              <dl className="worldline-receipt" aria-label="Verified outcome">
                {scienceReachedEarth ? <><div><dt>Science verified</dt><dd>30 MB</dd></div><div><dt>Signal left</dt><dd>t+{snapshot.receipt.probeElapsedSeconds}s</dd></div><div><dt>Distance crossed</dt><dd>23 light-years</dd></div><div><dt>Probe</dt><dd>Did not return</dd></div></> : <><div><dt>Escape burn</dt><dd>Verified</dd></div><div><dt>Signal sent</dt><dd>0 MB</dd></div><div><dt>Probe</dt><dd>Escaped</dd></div><div><dt>Discoveries</dt><dd>Lost</dd></div></>}
              </dl>
              <section className="worldline-learning-recap" aria-labelledby="worldline-learning-recap-title">
                <p>What you proved</p>
                <h2 id="worldline-learning-recap-title">Three ideas made this future predictable.</h2>
                <div>
                  <article><strong>1 · Data rate</strong><span>18 MB + 12 MB = 30 MB. At 1.2 MB/s, transmission needs 25 seconds.</span></article>
                  <article><strong>2 · No overlap</strong><span>Escape needs an early, hard burn. Earth lock needs a later, gentler burn. One maneuver cannot satisfy both.</span></article>
                  <article><strong>3 · Light travel</strong><span>A light-year measures distance. From 23 light-years away, even a light-speed signal takes 23 years to reach Earth.</span></article>
                </div>
              </section>
              <button className="worldline-secondary" onClick={reset}>
                <ArrowCounterClockwise aria-hidden="true" /> Run it again
              </button>
            </>
          )}
        </section>

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
              <h2>Data still on the probe</h2>
              {snapshot.packets.map((packet) => (
                <p key={packet.id}><strong>{packet.name}</strong> · {packet.sizeMegabytes} MB<br /><span>{packet.observation}</span></p>
              ))}
            </div>
            <div>
              <h2>Tools visible now</h2>
              <p>{toolNames.length ? toolNames.join(' · ') : 'No WebMCP tools are available in this browser.'}</p>
            </div>
          </div>
        </details>
        {error && <p className="worldline-error" role="alert">{error}</p>}
        {!agentReady && !registrationPending && (
          <p className="worldline-fallback">This experience requires a compatible WebMCP browser agent. Open it in ChatGPT’s in-app browser or Chrome with WebMCP enabled.</p>
        )}
        <p className="worldline-note">A deterministic, scientifically informed educational simulation—not a precision model of a real black-hole mission.</p>
        <p className="worldline-credit">An <a href="https://www.openforagents.com/">Open for Agents</a> experiment in what people and browser agents can decide together.</p>
      </section>
    </main>
  )
}
