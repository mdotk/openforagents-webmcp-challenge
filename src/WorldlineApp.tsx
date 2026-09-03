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
    label: 'The two files Earth does not have',
    statement: WORLDLINE_HUMAN_PRIORITIES.discovery,
  },
  probe: {
    label: 'The probe',
    statement: WORLDLINE_HUMAN_PRIORITIES.probe,
  },
} as const)

const learnerPredictions: Readonly<Record<LearnerPredictionId, { label: string; explanation: string }>> = Object.freeze({
  time: { label: 'Not enough time', explanation: 'The files cannot finish sending before final contact ends.' },
  fuel: { label: 'Not enough fuel', explanation: 'The probe cannot send the files and still make the escape burn.' },
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
    document.title = 'WORLDLINE: One probe. One signal.'
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
  const packetsRead = activityTrail.includes('Three files inspected')
  const maneuverRead = activityTrail.includes('Engine, antenna and contact limits inspected')
  const uniqueScienceMegabytes = snapshot.packets.filter((packet) => !packet.replicatedOnEarth).reduce((total, packet) => total + packet.sizeMegabytes, 0)
  const transmissionSeconds = Math.ceil(uniqueScienceMegabytes / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond)
  const activeCaption = toolsPaused
    ? 'WebMCP tools paused'
    : stage === 'waiting'
      ? 'Waiting for the agent'
      : stage === 'investigating' && activityMessage
        ? activityMessage
      : stage === 'prediction'
        ? snapshot.learnerCalculation ? 'Waiting for your prediction' : 'Waiting for your calculation'
      : stage === 'prediction-handoff'
        ? 'Your prediction is ready for the agent'
      : stage === 'decision'
        ? 'Waiting for you'
        : stage === 'authorized'
          ? 'Your approved burn is ready'
          : stage === 'executing'
            ? executionBeat === 'burn'
              ? 'Burn underway'
              : executionBeat === 'lock'
                ? scienceReachedEarth ? 'Antenna lock held' : 'Antenna turning away'
                : executionBeat === 'packet-one'
                  ? 'Gravity map is sending'
                  : executionBeat === 'packet-two'
                  ? 'Light spectrum transmitting'
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
          <div className="worldline-contact-horizon" aria-hidden="true"><span>FINAL CONTACT</span></div>
          <img className="worldline-probe" src="/worldline/probe.webp" alt="The probe approaching the black hole" />
          <div className="worldline-burn-flash" aria-hidden="true" />
          <div className="worldline-earth-impact" aria-hidden="true" />
          <div className="worldline-cinematic-status" aria-live="polite"><span>{activeCaption}</span></div>
        </div>

        <section className="worldline-story" aria-live="polite">
          {stage === 'waiting' && (
            <>
              <p className="worldline-eyebrow">Final contact ends in 71 seconds</p>
              <h1 id="worldline-title">Save the probe or send the two files to Earth.</h1>
              <p className="worldline-lede">The probe has finished its only close pass beside a black hole. It recorded a gravity map and a light spectrum, and Earth has no copies. Its final connection with Earth ends in 71 seconds. Work with your browser agent to find out whether one burn can both let the probe escape and send the files. If it cannot, you decide what to save.</p>
              <dl className="worldline-mission-facts" aria-label="Mission stakes">
                <div><dt>Distance</dt><dd>23 light-years</dd></div>
                <div><dt>Final contact</dt><dd>71 seconds</dd></div>
                <div><dt>Files with no Earth copy</dt><dd>{uniqueScienceMegabytes} MB</dd></div>
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
                  <small>The page gives the agent the mission facts, five chances to test burns and clear instructions to stop for your input.</small>
                </div>
              ) : <button className="worldline-primary" disabled>WebMCP agent required</button>}
            </>
          )}

          {stage === 'prediction' && (
            <div className="worldline-prediction">
              <p className="worldline-eyebrow">Your turn</p>
              {!snapshot.learnerCalculation ? <>
                <p className="worldline-learning-step">1 of 2 · Work out the signal time</p>
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>Can both files finish sending?</h1>
                <p className="worldline-lede">The agent found two files that Earth does not have: an 18 MB gravity map and a 12 MB light spectrum. The radio sends 1.2 MB each second. Add the file sizes, then divide by the radio speed.</p>
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
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>Why can’t one burn save the probe and send both files?</h1>
                <p className="worldline-lede">The first tests found two clear outcomes. An early, powerful burn lets the probe escape but prevents the files from being sent. A later, gentler burn sends the files but cannot save the probe. Before the agent tests a middle option, choose why you think one burn cannot do both.</p>
                <div className="worldline-prediction-grid" role="group" aria-label="Choose your prediction">
                  {(Object.entries(learnerPredictions) as [LearnerPredictionId, { label: string; explanation: string }][]).map(([id, prediction]) => (
                    <button key={id} onClick={() => choosePrediction(id)}>
                      <strong>{prediction.label}</strong>
                      <span>{prediction.explanation}</span>
                    </button>
                  ))}
                </div>
                <p className="worldline-agent-wait">The page saves your calculation and answer. The agent must read them, test whether your answer holds up and explain the result.</p>
              </>}
            </div>
          )}

          {stage === 'prediction-handoff' && snapshot.learnerPrediction && (
            <div className="worldline-agent-prompt worldline-prediction-handoff">
              <p className="worldline-eyebrow">Your answer is saved</p>
              <h1 id="worldline-title">Now ask the agent to test your answer.</h1>
              <p className="worldline-lede">You chose: <strong>{learnerPredictions[snapshot.learnerPrediction.id].label}</strong>. Return to the same agent. It will try a middle option, then run another test designed to prove your answer wrong. It will show which parts of your answer the results support.</p>
              <div className="worldline-agent-command" aria-label="Next instruction for your browser agent">
                <span>Say to your browser agent</span>
                <strong>{agentCommands.prediction}</strong>
                <small>The page has already saved your calculation, answer and priority.</small>
              </div>
            </div>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">{toolsPaused ? 'You stopped the tools' : 'The agent is working'}</p>
              <h1 id="worldline-title">{snapshot.phase === 'investigating_prediction' ? 'The agent is testing your answer.' : 'The agent is testing both clear choices.'}</h1>
              <p className="worldline-lede">{snapshot.phase === 'investigating_prediction'
                ? `You answered: ${snapshot.learnerPrediction?.statement} The agent must try a middle option and an option designed to prove your answer wrong before explaining what happens.`
                : 'It is testing one burn that lets the probe escape and one that sends the two files. Then it must stop for your calculation and answer.'}</p>
              {snapshot.simulations.length > visibleSimulationCount ? <p className="worldline-narrative-buffer">The agent has completed {snapshot.simulations.length} test{snapshot.simulations.length === 1 ? '' : 's'}. Replaying the investigation at a pace you can follow.</p> : null}
              <div className="worldline-evidence" aria-label="Evidence learned">
                <span className={packetsRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{packetsRead ? `${uniqueScienceMegabytes} MB with no copy on Earth` : 'Checking which files matter'}</b><small>{packetsRead ? 'Earth already has a complete copy of the 72 MB navigation record.' : 'Checking which files Earth already has.'}</small></span>
                <span className={packetsRead && maneuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{packetsRead && maneuverRead ? `${transmissionSeconds} seconds to send both files` : 'Working out the sending time'}</b><small>{packetsRead && maneuverRead ? `${uniqueScienceMegabytes} MB ÷ 1.2 MB/s` : 'Waiting for the file sizes and radio speed.'}</small></span>
                <span className={missionRead && maneuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{missionRead && maneuverRead ? 'Why one burn cannot do both' : 'Checking the engine and antenna'}</b><small>{missionRead && maneuverRead ? 'The powerful escape burn points the antenna away from Earth.' : 'Waiting for the engine and antenna limits.'}</small></span>
              </div>
              <div className="worldline-investigation" aria-label="Agent investigation">
                <header>
                  <strong>{activeStory ? `Test ${visibleSimulationCount}` : activityMessage ?? 'Reading the mission facts…'}</strong>
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
                ) : <p className="worldline-investigation__empty">The agent is checking the file sizes, sending time and engine limits before it tries the first burn.</p>}
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
                <h1 id="worldline-title" ref={decisionRef} tabIndex={-1}>What do you save?</h1>
                <p className="worldline-lede">Across three steps and {simulationAttemptsUsed} tests, the agent proved no burn can both save the probe and send the two files. It found two possible outcomes. Each saves one thing and sacrifices the other. Only you can decide which result matters more.</p>
              </div>
              {snapshot.learnerPrediction ? (
                <aside className={`worldline-learning-result worldline-learning-result--${snapshot.choices.predictionAssessment}`}>
                  <p>Your answer · {snapshot.choices.predictionAssessment.replace('_', ' ')}</p>
                  <strong>{learnerPredictions[snapshot.learnerPrediction.id].label}</strong>
                  <span>{snapshot.choices.teachingExplanation}</span>
                </aside>
              ) : null}
              <section className="worldline-constraint-proof" aria-labelledby="worldline-constraint-title">
                <header>
                  <p>Why one burn cannot do both</p>
                  <h2 id="worldline-constraint-title">The requirements happen at different times.</h2>
                </header>
                <div>
                  <article>
                    <span>Help the probe escape</span>
                    <strong>Burn by second {WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond}</strong>
                    <strong>Speed change: at least {WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s</strong>
                    <small>The probe must fire early and powerfully to escape.</small>
                  </article>
                  <div className="worldline-constraint-proof__conflict" aria-label="No overlap">
                    <b>No overlap</b>
                    <span>One burn cannot satisfy both.</span>
                  </div>
                  <article>
                    <span>Send both files</span>
                    <strong>Burn from second {WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]} to {WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]}</strong>
                    <strong>Speed change: {WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0].toLocaleString()} to {WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1].toLocaleString()} m/s</strong>
                    <small>A later, gentler burn keeps the antenna pointed at Earth.</small>
                  </article>
                </div>
                <p><b>Transmission check:</b> {uniqueScienceMegabytes} MB ÷ {WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = {transmissionSeconds} seconds.</p>
              </section>
              {recommendedSimulation && snapshot.choices ? (
                <aside className="worldline-recommendation">
                  <p>Agent recommendation</p>
                  <strong>{recommendedSimulation.discoveryDelivered ? 'Send both files' : 'Save the probe'}</strong>
                  <span><b>Why:</b> {recommendationStory(snapshot.choices, recommendedSimulation)}</span>
                  <small>Priority: {snapshot.choices.priority}</small>
                  <details><summary>Agent’s full reason</summary><span>{snapshot.choices.rationale}</span></details>
                </aside>
              ) : null}
              <div className="worldline-choice-grid">
                <article>
                  <p>Save the spacecraft</p>
                  <h2>Save the probe</h2>
                  <span>The probe gets away from the black hole. Its final contact ends before Earth receives either file.</span>
                  <dl><div><dt>Burn</dt><dd>{probeReturnChoice.burnAtProbeSecond}s · {probeReturnChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Signal</dt><dd>None</dd></div></dl>
                  <button className="worldline-secondary" onClick={() => approve(probeReturnChoice.id)}>Save the probe, send no files</button>
                </article>
                <article>
                  <p>Send the files</p>
                  <h2>Send both files</h2>
                  <span>Earth receives both files after 23 years. The probe cannot escape.</span>
                  <dl><div><dt>Burn</dt><dd>{scienceTransmissionChoice.burnAtProbeSecond}s · {scienceTransmissionChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Arrival</dt><dd>+23 years</dd></div></dl>
                  <button className="worldline-primary" onClick={() => approve(scienceTransmissionChoice.id)}>Send both files, lose the probe <ArrowRight aria-hidden="true" /></button>
                </article>
              </div>
            </div>
          )}

          {stage === 'authorized' && (
            <>
              <p className="worldline-eyebrow">Your approved burn is ready</p>
              <h1 id="worldline-title">{selectedSimulation?.discoveryDelivered ? 'Both files can reach Earth. The probe cannot escape.' : 'The probe can escape. Earth will not receive the files.'}</h1>
              <p className="worldline-lede">{selectedSimulation?.discoveryDelivered
                ? `${selectedPacketMegabytes} MB ÷ ${WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = ${selectedSimulation.transmissionSeconds} seconds. Starting the burn at t+${selectedSimulation.burnAtProbeSecond}s finishes sending at t+${selectedTransmissionFinish}s, ${selectedContactMargin === 0 ? 'exactly when final contact ends' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before final contact ends`}. The ${selectedSimulation.deltaVMetersPerSecond.toLocaleString()} m/s burn keeps the antenna pointed at Earth, but is not powerful enough to meet the ${WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s escape requirement.`
                : `At t+${selectedSimulation?.burnAtProbeSecond}s, the burn changes the probe’s speed by ${selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s, enough to escape. It turns the antenna away before either file can be sent to Earth.`}</p>
              <dl className="worldline-mission-facts" aria-label="Calculated outcome">
                {selectedSimulation?.discoveryDelivered ? <>
                  <div><dt>Files to send</dt><dd>{selectedPacketMegabytes} MB</dd></div>
                  <div><dt>Time to send</dt><dd>{selectedSimulation.transmissionSeconds}s</dd></div>
                  <div><dt>Time before final contact</dt><dd>{selectedContactMargin}s</dd></div>
                </> : <>
                  <div><dt>Burn begins</dt><dd>t+{selectedSimulation?.burnAtProbeSecond}s</dd></div>
                  <div><dt>Speed change</dt><dd>{selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div>
                  <div><dt>Files sent</dt><dd>0 MB</dd></div>
                </>}
              </dl>
              <div className="worldline-agent-command" aria-label="Final instruction for your browser agent">
                <span>Return to the same agent and say</span>
                <strong>{agentCommands.execute}</strong>
                <small>The agent must run the approved burn and check the result. The page cannot perform this step.</small>
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
                        ? <>Light spectrum<br />sent.</>
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
                      ? 'The high-energy burn carries the probe away from the black hole but breaks its link with Earth.'
                      : executionBeat === 'packet-one'
                        ? 'The probe sends the first file: the 18 MB gravity map.'
                      : executionBeat === 'packet-two'
                        ? `The final 12 MB, the light spectrum, finishes sending ${selectedContactMargin === 0 ? 'as final contact ends' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before final contact ends`}.`
                          : executionBeat === 'contact'
                            ? scienceReachedEarth ? 'Both files have left the probe. Final contact ends.' : 'The probe escapes. Earth receives neither file.'
                            : executionBeat === 'transit'
                              ? 'The signal travels at light speed. Because the probe is 23 light-years away, Earth must wait 23 years.'
                              : scienceReachedEarth ? 'Earth receives and checks the gravity map and light spectrum.' : 'The probe is safely away from the black hole.'}
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
                {scienceReachedEarth ? <>Both files<br />reached Earth.</> : <>The probe escaped.<br />Earth received no files.</>}
              </h1>
              <p className="worldline-lede">{scienceReachedEarth
                ? 'Earth received the gravity map and light spectrum 23 years after they were sent. The probe did not escape. You chose to save the two files that had no backup on Earth.'
                : 'The powerful burn turned the antenna away before either file was sent. The probe escaped the black hole, but Earth will never receive the gravity map or light spectrum from its close pass.'}</p>
              <dl className="worldline-receipt" aria-label="Verified outcome">
                {scienceReachedEarth ? <><div><dt>Files received</dt><dd>30 MB</dd></div><div><dt>Files sent</dt><dd>t+{snapshot.receipt.probeElapsedSeconds}s</dd></div><div><dt>Distance crossed</dt><dd>23 light-years</dd></div><div><dt>Probe</dt><dd>Did not escape</dd></div></> : <><div><dt>Escape burn</dt><dd>Checked</dd></div><div><dt>Files sent</dt><dd>0 MB</dd></div><div><dt>Probe</dt><dd>Escaped</dd></div><div><dt>Files received</dt><dd>None</dd></div></>}
              </dl>
              <section className="worldline-learning-recap" aria-labelledby="worldline-learning-recap-title">
                <p>What you proved</p>
                <h2 id="worldline-learning-recap-title">Three simple calculations explain the result.</h2>
                <div>
                  <article><strong>1 · Sending time</strong><span>18 MB + 12 MB = 30 MB. At 1.2 MB/s, sending needs 25 seconds.</span></article>
                  <article><strong>2 · Burn timing</strong><span>Escape needs a powerful burn by second 42. Sending needs a gentler burn from second 44 to 50. One burn cannot meet both requirements.</span></article>
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
          <p className="worldline-below__label">An interactive science lesson</p>
          <p>Each route the agent tests is a possible future called a worldline. See why a signal from 23 light-years away takes 23 years to arrive, work out how long the probe needs to send two files, and learn why one burn cannot save everything.</p>
        </div>
        <details>
          <summary>Mission data and exact tools</summary>
          <div className="worldline-details-grid">
            <div>
              <h2>Files on the probe at the start</h2>
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
        <p className="worldline-note">A made-up mission built to teach the ideas. It is not a real spacecraft or an exact black-hole model.</p>
        <p className="worldline-credit">An <a href="https://www.openforagents.com/">Open for Agents</a> experiment in what people and browser agents can decide together.</p>
      </section>
    </main>
  )
}
