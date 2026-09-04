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
import { createWorldlineControl, WORLDLINE_CONSTRAINTS } from './domain'
import type { LearnerPredictionId, LearnerTransmissionEstimateSeconds, WorldlineSimulation, WorldlineToolsRegistration } from './types'
import { registerWorldlineTools } from './webmcp'
import { formatMissionClock, recommendationStory, storyForSimulation } from './worldline-narrative'
import './WorldlineApp.css'

type ExecutionBeat = 'idle' | 'burn' | 'lock' | 'packet-one' | 'packet-two' | 'contact' | 'transit' | 'arrival' | 'complete'
type WorldlinePathKind = 'escape' | 'signal' | 'lost'

function pathKindFor(simulation: WorldlineSimulation | null): WorldlinePathKind | null {
  if (!simulation) return null
  if (simulation.probeSurvives) return 'escape'
  if (simulation.discoveryDelivered) return 'signal'
  return 'lost'
}

const learnerPredictions: Readonly<Record<LearnerPredictionId, { label: string; explanation: string }>> = Object.freeze({
  time: { label: 'Not enough time for both', explanation: 'There may not be enough time to send both files and make an escape burn.' },
  fuel: { label: 'The gentler burn may be too weak', explanation: 'A burn that keeps the antenna pointed at Earth may not change the probe’s speed enough for escape.' },
  antenna: { label: 'The antenna may turn away', explanation: 'A powerful escape burn may break the link with Earth.' },
  combination: { label: 'The requirements may conflict', explanation: 'The allowed times and speed changes may not work together.' },
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
  const [, setActivityMessage] = useState<string | null>(null)
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
    document.title = 'WORLDLINE: Can the probe escape and send its files?'
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
      setActivityMessage('Your chosen burn is approved')
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

  const showNextSimulation = useCallback(() => {
    setVisibleSimulationCount((count) => Math.min(count + 1, snapshot.simulations.length))
  }, [snapshot.simulations.length])

  const showFirstSimulationFromCurrentAct = useCallback(() => {
    const firstSimulationCount = snapshot.learnerPrediction
      ? snapshot.learnerPrediction.selectedAfterSimulationCount + 1
      : 1
    setVisibleSimulationCount(Math.min(firstSimulationCount, snapshot.simulations.length))
  }, [snapshot.learnerPrediction, snapshot.simulations.length])

  const continueNarrative = useCallback(() => {
    if (snapshot.phase === 'prediction') setPredictionNarrativeReady(true)
    if (snapshot.phase === 'review') setDecisionNarrativeReady(true)
  }, [snapshot.phase])

  const effectiveVisibleSimulationCount = Math.min(visibleSimulationCount, snapshot.simulations.length)
  const visibleSimulations = snapshot.simulations.slice(0, effectiveVisibleSimulationCount)
  const currentActStartSimulationCount = snapshot.learnerPrediction?.selectedAfterSimulationCount ?? 0
  const currentActResultIsOpen = effectiveVisibleSimulationCount > currentActStartSimulationCount
  const activeSimulation = currentActResultIsOpen ? visibleSimulations.at(-1) ?? null : null
  const activeStory = activeSimulation ? storyForSimulation(activeSimulation, snapshot.packets) : null
  const predictionActStarted = Boolean(snapshot.learnerPrediction && (
    snapshot.simulations.length > snapshot.learnerPrediction.selectedAfterSimulationCount
    || activityTrail.includes('Agent read your calculation and prediction')
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
  const missionRead = activityTrail.includes('Agent read the mission')
  const packetsRead = activityTrail.includes('Agent checked the three files')
  const maneuverRead = activityTrail.includes('Agent checked the engine, antenna and radio limits')
  const uniqueScienceMegabytes = snapshot.packets.filter((packet) => !packet.replicatedOnEarth).reduce((total, packet) => total + packet.sizeMegabytes, 0)
  const transmissionSeconds = Math.ceil(uniqueScienceMegabytes / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond)
  const showSendingCalculation = Boolean(snapshot.learnerCalculation)
    || !['investigating_extremes', 'prediction'].includes(snapshot.phase)
  const currentActComplete = snapshot.learnerPrediction
    ? ['review', 'authorized', 'executed'].includes(snapshot.phase)
    : ['prediction', 'investigating_prediction', 'review', 'authorized', 'executed'].includes(snapshot.phase)
  const currentActTestCount = Math.max(0, snapshot.simulations.length - currentActStartSimulationCount)
  const firstActEvidenceCanBeRead = snapshot.phase !== 'investigating_extremes' || currentActResultIsOpen
  const displayedMissionRead = firstActEvidenceCanBeRead && missionRead
  const displayedPacketsRead = firstActEvidenceCanBeRead && packetsRead
  const displayedManeuverRead = firstActEvidenceCanBeRead && maneuverRead
  const visualSimulation = selectedSimulation ?? activeSimulation
  const activePathKind = pathKindFor(visualSimulation)
  const routeExplanation = activePathKind === 'escape'
    ? { title: 'Gold curve: tested escape path', detail: 'This test sends the probe away from the black hole, but no files reach Earth.' }
    : activePathKind === 'signal'
      ? { title: 'Purple line: files sent toward Earth', detail: 'This test keeps the antenna connected long enough to send both files.' }
      : activePathKind === 'lost'
        ? { title: 'Red curve: failed burn path', detail: 'This test saves neither the probe nor the files.' }
        : null
  const viewedBurnSecond = visualSimulation?.burnAtProbeSecond ?? 0
  const firstPacketSeconds = Math.ceil((snapshot.packets.find((packet) => packet.id === 'gravity-map')?.sizeMegabytes ?? 0) / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond)
  const executionProbeSecond = !snapshot.receipt || !selectedSimulation
    ? viewedBurnSecond
    : executionBeat === 'packet-one'
      ? Math.min(snapshot.receipt.probeElapsedSeconds, selectedSimulation.burnAtProbeSecond + firstPacketSeconds)
      : ['packet-two', 'contact', 'transit', 'arrival', 'complete'].includes(executionBeat)
        ? snapshot.receipt.probeElapsedSeconds
        : selectedSimulation.burnAtProbeSecond
  const missionReadings = stage === 'executing' || stage === 'received'
    ? [
        { label: 'PROBE TIME', value: `T+${formatMissionClock(executionProbeSecond)}` },
        {
          label: 'EARTH SIGNAL',
          value: !scienceReachedEarth
            ? 'NO FILES SENT'
            : ['arrival', 'complete'].includes(executionBeat)
              ? '+23 YEARS'
              : executionBeat === 'transit'
                ? 'IN TRANSIT'
                : '+00 YEARS',
        },
      ]
    : visualSimulation
      ? [
          { label: 'TESTED BURN', value: `T+${formatMissionClock(viewedBurnSecond)}` },
          { label: 'RADIO LINK LEFT', value: formatMissionClock(Math.max(0, WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond - viewedBurnSecond)) },
        ]
      : [
          { label: 'MISSION TIME', value: 'T+00:00:00' },
          { label: 'RADIO LINK LEFT', value: formatMissionClock(WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond) },
        ]
  const activeCaption = toolsPaused
    ? 'WebMCP tools paused'
    : stage === 'waiting'
      ? 'Waiting for the agent'
      : stage === 'investigating'
        ? currentActComplete
          ? `${currentActTestCount} tests ready for you`
          : snapshot.learnerPrediction
            ? 'Agent testing your prediction'
            : 'Agent investigating possible burns'
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
                ? scienceReachedEarth ? 'Antenna stayed pointed at Earth' : 'Antenna turning away'
                : executionBeat === 'packet-one'
                  ? 'Sending gravity map'
                  : executionBeat === 'packet-two'
                  ? 'Sending light spectrum'
                    : executionBeat === 'contact'
                      ? scienceReachedEarth ? 'Radio link closed' : 'Probe escaped'
                      : executionBeat === 'transit'
                        ? 'Signal crossing 23 light-years'
                        : scienceReachedEarth ? 'Signal arriving at Earth' : 'Probe clear'
            : stage === 'received'
              ? scienceReachedEarth ? 'Transmission verified' : 'Escape verified'
              : `${snapshot.simulations.length} burn test${snapshot.simulations.length === 1 ? '' : 's'} completed`

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
            {missionReadings.map((reading) => (
              <div key={reading.label}>
                <span>{reading.label}</span>
                <strong>{reading.value}</strong>
              </div>
            ))}
          </div>

          <svg className="worldline-paths" viewBox="0 0 1000 560" aria-hidden="true">
            <defs>
              <linearGradient id="worldline-signal-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8c76ff" stopOpacity=".35" />
                <stop offset=".55" stopColor="#c7bcff" />
                <stop offset="1" stopColor="#8bf2c9" />
              </linearGradient>
              <marker id="worldline-arrow-escape" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f0bd6e" /></marker>
              <marker id="worldline-arrow-lost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ef6b7e" /></marker>
              <marker id="worldline-arrow-signal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a997ff" /></marker>
            </defs>
            <path data-testid="worldline-path-escape" pathLength="1" markerEnd="url(#worldline-arrow-escape)" className={`worldline-path worldline-path--escape${escapeTested ? ' is-tested' : ''}${activePathKind === 'escape' ? ' is-active' : ''}`} d="M 390 300 C 410 205, 535 125, 735 150" />
            <path data-testid="worldline-path-lost" pathLength="1" markerEnd="url(#worldline-arrow-lost)" className={`worldline-path worldline-path--lost${lossTested ? ' is-tested' : ''}${activePathKind === 'lost' ? ' is-active' : ''}`} d="M 390 300 C 320 300, 245 320, 145 334" />
            <path className="worldline-path worldline-path--signal-glow" d="M 390 300 C 555 250, 740 220, 925 175" />
            <path data-testid="worldline-path-signal" pathLength="1" markerEnd="url(#worldline-arrow-signal)" className={`worldline-path worldline-path--signal${signalTested ? ' is-tested' : ''}${activePathKind === 'signal' ? ' is-active' : ''}`} d="M 390 300 C 555 250, 740 220, 925 175" />
            <circle className="worldline-signal" cx="925" cy="175" r="6" />
            {stage === 'investigating' && activeSimulation && activePathKind ? (
              <circle key={activeSimulation.id} r="5" className={`worldline-test-marker worldline-test-marker--${activePathKind}`}>
                <animateMotion dur="1.5s" fill="freeze" path={activePathKind === 'escape'
                  ? 'M 390 300 C 410 205, 535 125, 735 150'
                  : activePathKind === 'signal'
                    ? 'M 390 300 C 555 250, 740 220, 925 175'
                    : 'M 390 300 C 320 300, 245 320, 145 334'} />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.82;1" dur="1.5s" fill="freeze" />
              </circle>
            ) : null}
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
          <div className="worldline-contact-horizon" aria-hidden="true"><span>RADIO LINK ENDS</span></div>
          <img className="worldline-probe" src="/worldline/probe.webp" alt="The probe approaching the black hole" />
          <div className="worldline-burn-flash" aria-hidden="true" />
          <div className="worldline-earth-impact" aria-hidden="true" />
          <div className="worldline-cinematic-status" aria-live="polite">
            {stage === 'investigating' && routeExplanation ? (
              <span className={`worldline-route-status worldline-route-status--${activePathKind}`}>
                <b>{routeExplanation.title}</b>
                <small>{routeExplanation.detail}</small>
              </span>
            ) : <span>{activeCaption}</span>}
          </div>
        </div>

        <section className="worldline-story" aria-live="polite">
          {stage === 'waiting' && (
            <>
              <p className="worldline-eyebrow">71 seconds until the radio link closes</p>
              <h1 id="worldline-title">Can one engine burn save the probe and send both files?</h1>
              <p className="worldline-lede">The probe has just flown close enough to a black hole to measure how it bends space and changes light. Its computer has processed and compressed the raw measurements into two files ready to send. Earth has no copies. The probe’s last radio connection with Earth ends in 71 seconds. It has fuel for one engine burn, a short firing that changes its speed. Work with your browser agent to find out whether that burn can both let the probe escape and send the files. If it cannot, you decide what to save.</p>
              <dl className="worldline-mission-facts" aria-label="Mission stakes">
                <div><dt>Distance</dt><dd>23 light-years</dd></div>
                <div><dt>Radio link closes</dt><dd>In 71 seconds</dd></div>
                <div><dt>Compressed files ready to send</dt><dd>2 files · {uniqueScienceMegabytes} MB</dd></div>
              </dl>
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
                  <span>Tell your browser agent</span>
                  <strong>{agentCommands.begin}</strong>
                  <small>The agent will investigate possible burns, explain what it finds and stop when it needs your calculation and prediction. It will recommend an outcome only after the tests.</small>
                </div>
              ) : <button className="worldline-primary" disabled>A WebMCP browser agent is required</button>}
            </>
          )}

          {stage === 'prediction' && (
            <div className="worldline-prediction">
              <p className="worldline-eyebrow">Your turn</p>
              {!snapshot.learnerCalculation ? <>
                <p className="worldline-learning-step">1 of 2 · Work out the sending time</p>
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>How long do both files take to send?</h1>
                <p className="worldline-lede">The probe has already processed its raw measurements into two compressed files that Earth does not have: an 18 MB gravity map and a 12 MB light spectrum. The radio sends 1.2 MB each second. Add the file sizes, then divide by the radio speed.</p>
                <div className="worldline-calculation" aria-label="Transmission-time calculation">
                  <div className="worldline-calculation__formula"><span>18 MB + 12 MB</span><b>÷</b><span>1.2 MB/s</span><b>=</b><strong>?</strong></div>
                  <div className="worldline-calculation__choices" role="group" aria-label="Choose the transmission time">
                    {([12, 25, 36] as const).map((seconds) => <button key={seconds} onClick={() => chooseTransmissionEstimate(seconds)}>{seconds} seconds</button>)}
                  </div>
                </div>
                <p className="worldline-agent-wait">This calculation tells you how long the antenna must remain pointed at Earth before the radio link closes.</p>
              </> : <>
                <p className="worldline-learning-step">2 of 2 · Predict the cause</p>
                <div className={`worldline-calculation-result${snapshot.learnerCalculation.correct ? ' is-correct' : ''}`} role="status">
                  <strong>{snapshot.learnerCalculation.correct ? 'Correct.' : 'Not quite.'} Sending both files takes {snapshot.learnerCalculation.correctSeconds} seconds.</strong>
                  <span>18 MB + 12 MB = 30 MB. Then 30 MB ÷ 1.2 MB/s = 25 seconds.</span>
                </div>
                <h1 id="worldline-title" ref={predictionRef} tabIndex={-1}>What might stop one burn from doing both?</h1>
                <p className="worldline-lede">The first tests found two different working burns. An early, powerful burn lets the probe escape but prevents the files from being sent. A later, gentler burn sends the files but cannot save the probe. The agent has not tested a middle burn yet. Choose what you think might prevent one burn from doing both.</p>
                <div className="worldline-prediction-grid" role="group" aria-label="Choose your prediction">
                  {(Object.entries(learnerPredictions) as [LearnerPredictionId, { label: string; explanation: string }][]).map(([id, prediction]) => (
                    <button key={id} onClick={() => choosePrediction(id)}>
                      <strong>{prediction.label}</strong>
                      <span>{prediction.explanation}</span>
                    </button>
                  ))}
                </div>
                <p className="worldline-agent-wait">The page saves your calculation and prediction. The agent must test your prediction before it can show the final choices.</p>
              </>}
            </div>
          )}

          {stage === 'prediction-handoff' && snapshot.learnerPrediction && (
            <div className="worldline-agent-prompt worldline-prediction-handoff">
              <p className="worldline-eyebrow">Your prediction is saved</p>
              <h1 id="worldline-title">Now ask the agent to test your prediction.</h1>
              <p className="worldline-lede">You predicted: <strong>{learnerPredictions[snapshot.learnerPrediction.id].label}</strong>. Return to the same agent. It will try a middle burn, then a different burn to see whether your prediction still holds. It will explain what each result supports.</p>
              <div className="worldline-agent-command" aria-label="Next instruction for your browser agent">
                <span>Say to your browser agent</span>
                <strong>{agentCommands.prediction}</strong>
                <small>The page has already saved your calculation and prediction.</small>
              </div>
            </div>
          )}

          {stage === 'investigating' && (
            <>
              <p className="worldline-eyebrow">{toolsPaused ? 'You stopped the tools' : 'The agent is working'}</p>
              <h1 id="worldline-title">{snapshot.phase === 'investigating_prediction' ? 'The agent is testing your prediction.' : 'The agent is testing two starting possibilities.'}</h1>
              <p className="worldline-lede">{snapshot.phase === 'investigating_prediction'
                ? `You predicted: ${snapshot.learnerPrediction?.statement} The agent is trying a middle burn and a different burn to see whether your prediction still holds. Then it will explain what the results show.`
                : 'It is testing one burn that lets the probe escape and one that sends the two files. Then it must stop for your calculation and prediction.'}</p>
              {activeStory && snapshot.simulations.length > effectiveVisibleSimulationCount ? <p className="worldline-narrative-buffer">The agent has finished {snapshot.simulations.length} test{snapshot.simulations.length === 1 ? '' : 's'}. You are viewing test {effectiveVisibleSimulationCount}. The page will wait until you are ready for the next one.</p> : null}
              <div className="worldline-evidence" aria-label="Evidence learned">
                <span className={displayedPacketsRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{displayedPacketsRead ? `Two compressed files only on the probe · ${uniqueScienceMegabytes} MB` : 'Checking which files matter'}</b><small>{displayedPacketsRead ? 'The files were made from raw measurements. Earth already has a complete copy of the separate 72 MB navigation record.' : 'Checking which files Earth already has.'}</small></span>
                <span className={displayedPacketsRead && displayedManeuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{displayedPacketsRead && displayedManeuverRead ? showSendingCalculation ? `${transmissionSeconds} seconds to send both files` : 'You will calculate the sending time' : 'Finding the numbers you will need'}</b><small>{displayedPacketsRead && displayedManeuverRead ? showSendingCalculation ? `${uniqueScienceMegabytes} MB ÷ 1.2 MB/s` : 'The agent found the file sizes and radio speed without revealing the answer.' : 'Waiting for the file sizes and radio speed.'}</small></span>
                <span className={displayedMissionRead && displayedManeuverRead ? 'is-read' : ''}><Check aria-hidden="true" /><b>{displayedMissionRead && displayedManeuverRead ? 'Comparing the two sets of requirements' : 'Checking the engine and antenna'}</b><small>{displayedMissionRead && displayedManeuverRead ? 'Escape needs an earlier, more powerful burn than sending the files.' : 'Waiting for the engine and antenna limits.'}</small></span>
              </div>
              <div className="worldline-investigation" aria-label="Agent investigation">
                <header>
                  <strong>{activeStory ? `Test ${effectiveVisibleSimulationCount}` : currentActComplete ? `${currentActTestCount} tests ready to review` : snapshot.learnerPrediction ? 'Testing your prediction' : 'Checking the mission facts'}</strong>
                  <span>{effectiveVisibleSimulationCount} of 5 tests shown</span>
                </header>
                {activeStory && activeSimulation ? (
                  <article className={`worldline-investigation__active worldline-investigation__active--${activeSimulation.outcome}`}>
                    <p className="worldline-investigation__question"><b>Question</b> {activeStory.question}</p>
                    <p className="worldline-investigation__plan"><b>Agent tests</b> {activeStory.plan}</p>
                    <p className="worldline-investigation__outcome"><b>Outcome</b><strong>{activeStory.outcomeSummary}</strong></p>
                    <p className="worldline-investigation__explanation"><b>Why</b> {!showSendingCalculation && activeSimulation.discoveryDelivered
                      ? 'Both files finish sending before the radio link closes. You will calculate exactly how long they need in the next step. This burn does not change the probe’s speed enough for escape.'
                      : activeStory.result}</p>
                    {showSendingCalculation && activeStory.calculation ? <p className="worldline-investigation__calculation"><b>The numbers</b> {activeStory.calculation}</p> : null}
                    <p className="worldline-investigation__lesson"><b>What this teaches us</b> {activeStory.lesson}</p>
                  </article>
                ) : <p className="worldline-investigation__empty">{currentActComplete
                  ? `The agent has finished this round. Open Test ${currentActStartSimulationCount + 1} when you are ready to read it.`
                  : snapshot.learnerPrediction
                    ? 'The agent is testing a middle burn and a different burn. This page will not reveal either result until the round is complete and you choose to review it.'
                    : 'The agent is checking the files, radio link, engine and antenna. This page will not reveal a result until both starting tests are complete and you choose to review them.'}</p>}
                {visibleSimulations.length > 1 ? (
                  <ol className="worldline-investigation__history" aria-label="Earlier tests">
                    {visibleSimulations.slice(0, -1).map((simulation, index) => {
                      const story = storyForSimulation(simulation, snapshot.packets)
                      return <li key={simulation.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{story.outcomeSummary}</strong><small>{story.lesson}</small></div></li>
                    })}
                  </ol>
                ) : null}
              </div>
              <div className="worldline-narrative-controls" aria-label="Investigation playback controls">
                {!activeStory && currentActComplete && currentActTestCount > 0 ? (
                  <button className="worldline-primary" onClick={showFirstSimulationFromCurrentAct}>Review Test {currentActStartSimulationCount + 1} <ArrowRight aria-hidden="true" /></button>
                ) : activeStory && snapshot.simulations.length > effectiveVisibleSimulationCount ? (
                  <button className="worldline-primary" onClick={showNextSimulation}>Show next test <ArrowRight aria-hidden="true" /></button>
                ) : snapshot.phase === 'prediction' && !predictionNarrativeReady ? (
                  <button className="worldline-primary" onClick={continueNarrative}>Continue to my calculation <ArrowRight aria-hidden="true" /></button>
                ) : snapshot.phase === 'review' && !decisionNarrativeReady ? (
                  <button className="worldline-primary" onClick={continueNarrative}>Continue to the results <ArrowRight aria-hidden="true" /></button>
                ) : null}
                <small>{activeStory ? 'This result stays on screen until you choose to continue.' : 'The agent can work quickly, but the page advances only when you choose.'}</small>
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
                <p className="worldline-lede">Across two rounds of investigation and {simulationAttemptsUsed} burn tests, the agent tested whether one burn could save the probe and send the two files. The results show that no burn in this lesson meets both sets of requirements. It found two working options. Only you can decide which result matters more.</p>
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
                  <p>Why one burn cannot do both</p>
                  <h2 id="worldline-constraint-title">The required times and speed changes do not overlap.</h2>
                </header>
                <div>
                  <article>
                    <span>Help the probe escape</span>
                    <strong>Burn by second {WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond}</strong>
                    <strong>Speed change: at least {WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s</strong>
                    <small>The probe must fire its engine early enough and change its speed by at least this amount.</small>
                  </article>
                  <div className="worldline-constraint-proof__conflict" aria-label="No overlap">
                    <b>No overlap</b>
                    <span>One burn cannot satisfy both.</span>
                  </div>
                  <article>
                    <span>Send both files</span>
                    <strong>Burn from second {WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]} to {WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]}</strong>
                    <strong>Speed change: {WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0].toLocaleString()} to {WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1].toLocaleString()} m/s</strong>
                    <small>A later burn with a smaller speed change keeps the antenna pointed at Earth.</small>
                  </article>
                </div>
                <p><b>Sending-time check:</b> {uniqueScienceMegabytes} MB ÷ {WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = {transmissionSeconds} seconds.</p>
              </section>
              {recommendedSimulation && snapshot.choices ? (
                <aside className="worldline-recommendation">
                  <p>Agent recommendation</p>
                  <strong>{recommendedSimulation.discoveryDelivered ? 'Send both files' : 'Save the probe'}</strong>
                  <span><b>Why:</b> {recommendationStory(recommendedSimulation)}</span>
                  <small>The agent recommends preserving the files because Earth has no other copy. You still decide which loss to accept.</small>
                  <details><summary>Agent’s full reason</summary><span>{snapshot.choices.rationale}</span></details>
                </aside>
              ) : null}
              <div className="worldline-choice-grid">
                <article>
                  <p>Option 1</p>
                  <h2>Save the probe</h2>
                  <span>The probe gets away from the black hole. Its radio link closes before Earth receives either file.</span>
                  <dl><div><dt>Burn</dt><dd>{probeReturnChoice.burnAtProbeSecond}s · {probeReturnChoice.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Files sent</dt><dd>0 MB</dd></div></dl>
                  <button className="worldline-secondary" onClick={() => approve(probeReturnChoice.id)}>Save the probe, send no files</button>
                </article>
                <article>
                  <p>Option 2</p>
                  <h2>Send both files</h2>
                  <span>The files finish sending before the radio link closes. Earth receives them 23 years later. The probe cannot escape.</span>
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
                ? `${selectedPacketMegabytes} MB ÷ ${WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond} MB/s = ${selectedSimulation.transmissionSeconds} seconds. Starting the burn at t+${selectedSimulation.burnAtProbeSecond}s finishes sending at t+${selectedTransmissionFinish}s, ${selectedContactMargin === 0 ? 'exactly when the radio link closes' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before the radio link closes`}. The ${selectedSimulation.deltaVMetersPerSecond.toLocaleString()} m/s burn keeps the antenna pointed at Earth, but is not powerful enough to meet the ${WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s escape requirement.`
                : `At t+${selectedSimulation?.burnAtProbeSecond}s, the burn changes the probe’s speed by ${selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s, enough to escape. It turns the antenna away before either file can be sent to Earth.`}</p>
              <dl className="worldline-mission-facts" aria-label="Calculated outcome">
                {selectedSimulation?.discoveryDelivered ? <>
                  <div><dt>Files to send</dt><dd>{selectedPacketMegabytes} MB</dd></div>
                  <div><dt>Time to send</dt><dd>{selectedSimulation.transmissionSeconds}s</dd></div>
                  <div><dt>Time before radio link closes</dt><dd>{selectedContactMargin}s</dd></div>
                </> : <>
                  <div><dt>Burn begins</dt><dd>t+{selectedSimulation?.burnAtProbeSecond}s</dd></div>
                  <div><dt>Speed change</dt><dd>{selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div>
                  <div><dt>Files sent</dt><dd>0 MB</dd></div>
                </>}
              </dl>
              <div className="worldline-agent-command" aria-label="Final instruction for your browser agent">
                <span>Final step · Tell the same browser agent</span>
                <strong>{agentCommands.execute}</strong>
                <small>Only the browser agent can use the one-time burn you approved. It will run the burn and check the result.</small>
              </div>
            </>
          )}

          {stage === 'executing' && snapshot.receipt && (
            <>
              <p className="worldline-eyebrow">The approved burn is running</p>
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
                          ? scienceReachedEarth ? <>Radio link<br />closed.</> : <>The probe<br />escaped.</>
                          : executionBeat === 'transit'
                            ? <>Across 23<br />light-years.</>
                            : scienceReachedEarth ? <>Signal<br />arriving.</> : <>The probe<br />is clear.</>}
              </h1>
              <p className="worldline-lede">
                {executionBeat === 'burn'
                  ? 'The burn you approved has started. The outcome can no longer change.'
                  : executionBeat === 'lock' && scienceReachedEarth
                    ? 'The gentler burn keeps the antenna pointed at Earth. It does not change the probe’s speed enough for escape.'
                    : executionBeat === 'lock'
                      ? 'The high-energy burn carries the probe away from the black hole but breaks its link with Earth.'
                      : executionBeat === 'packet-one'
                        ? 'The probe sends the first compressed file: the 18 MB gravity map.'
                      : executionBeat === 'packet-two'
                        ? `The second compressed file, the 12 MB light spectrum, finishes sending ${selectedContactMargin === 0 ? 'as the radio link closes' : `${selectedContactMargin} second${selectedContactMargin === 1 ? '' : 's'} before the radio link closes`}.`
                          : executionBeat === 'contact'
                            ? scienceReachedEarth ? 'Both files have left the probe. The radio link closes.' : 'The probe escapes. Earth receives neither file.'
                            : executionBeat === 'transit'
                              ? 'The signal travels at light speed. Because the probe is 23 light-years away, Earth must wait 23 years.'
                              : scienceReachedEarth ? 'Earth receives and checks the gravity map and light spectrum.' : 'The probe is safely away from the black hole.'}
              </p>
              <ol className="worldline-execution-progress" aria-label="Execution progress">
                <li className={executionBeat !== 'burn' ? 'is-complete' : 'is-current'}>Burn started</li>
                <li className={['packet-one', 'packet-two', 'contact', 'transit', 'arrival'].includes(executionBeat) ? 'is-complete' : executionBeat === 'lock' ? 'is-current' : ''}>{scienceReachedEarth ? 'Antenna stayed pointed at Earth' : 'Antenna turned away'}</li>
                <li className={['contact', 'transit', 'arrival'].includes(executionBeat) ? 'is-complete' : ['packet-one', 'packet-two'].includes(executionBeat) ? 'is-current' : ''}>{scienceReachedEarth ? '30 MB sent' : 'Probe escaped'}</li>
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
                : 'The powerful burn turned the antenna away before either file was sent. The probe escaped the black hole, but Earth will never receive the gravity map or light spectrum it recorded nearby.'}</p>
              <dl className="worldline-receipt" aria-label="Verified outcome">
                {scienceReachedEarth ? <><div><dt>Files received</dt><dd>30 MB</dd></div><div><dt>Sending completed</dt><dd>t+{snapshot.receipt.probeElapsedSeconds} seconds</dd></div><div><dt>Distance crossed</dt><dd>23 light-years</dd></div><div><dt>Probe</dt><dd>Did not escape</dd></div></> : <><div><dt>Burn started</dt><dd>t+{selectedSimulation?.burnAtProbeSecond} seconds</dd></div><div><dt>Speed change</dt><dd>{selectedSimulation?.deltaVMetersPerSecond.toLocaleString()} m/s</dd></div><div><dt>Files sent</dt><dd>0 MB</dd></div><div><dt>Probe</dt><dd>Escaped</dd></div></>}
              </dl>
              <section className="worldline-learning-recap" aria-labelledby="worldline-learning-recap-title">
                <p>What the mission showed</p>
                <h2 id="worldline-learning-recap-title">Three facts explain the result.</h2>
                <div>
                  <article><strong>1 · Sending time</strong><span>18 MB + 12 MB = 30 MB. At 1.2 MB/s, sending needs 25 seconds.</span></article>
                  <article><strong>2 · Burn timing and speed</strong><span>Escape needs a burn by second 42 that changes speed by at least 3,400 m/s. Sending needs a burn from second 44 to 50 that changes speed by 2,000 to 2,400 m/s. One burn cannot meet both requirements.</span></article>
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
        <p>A worldline is the path an object takes through space and time. See how each tested burn changes the probe’s path, why a signal from 23 light-years away takes 23 years to arrive, and why one burn cannot both let the probe escape and send the files.</p>
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
