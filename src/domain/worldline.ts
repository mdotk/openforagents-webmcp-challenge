import type {
  BurnGrant,
  BurnReview,
  LearnerCalculation,
  LearnerPrediction,
  LearnerPredictionId,
  LearnerTransmissionEstimateSeconds,
  LearningCheckpoint,
  PredictionAssessment,
  SciencePacket,
  SciencePacketId,
  TransmissionReceipt,
  WorldlineControl,
  WorldlineChoices,
  WorldlineFailureReason,
  WorldlineRecommendationInput,
  WorldlineSimulation,
  WorldlineSimulationInput,
  WorldlineSnapshot,
  WorldlineSubscriber,
} from '../types'

export class WorldlineStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldlineStateError'
  }
}

const packets: readonly SciencePacket[] = Object.freeze([
  {
    id: 'gravity-map',
    name: 'Gravity map',
    sizeMegabytes: 18,
    scientificValue: 10,
    replicatedOnEarth: false,
    observation: 'Measurements showing how strongly the black hole bends nearby space. Earth has no copy.',
  },
  {
    id: 'horizon-spectrum',
    name: 'Light spectrum',
    sizeMegabytes: 12,
    scientificValue: 9,
    replicatedOnEarth: false,
    observation: 'Measurements showing which colours of light the probe recorded near the black hole. Earth has no copy.',
  },
  {
    id: 'navigation-archive',
    name: 'Navigation archive',
    sizeMegabytes: 72,
    scientificValue: 2,
    replicatedOnEarth: true,
    observation: 'A routine record of the probe’s route. Earth already has a complete copy.',
  },
])

export const WORLDLINE_CONSTRAINTS = Object.freeze({
  contactEndsAtProbeSecond: 71,
  downlinkMegabytesPerSecond: 1.2,
  distanceFromEarthLightYears: 23,
  escapeLatestProbeSecond: 42,
  minimumEscapeDeltaVMetersPerSecond: 3400,
  transmissionBurnProbeSeconds: Object.freeze([44, 50] as const),
  lockPreservingDeltaVMetersPerSecond: Object.freeze([2000, 2400] as const),
})
export const MAX_WORLDLINE_SIMULATIONS = 5
export const WORLDLINE_MISSION_OBJECTIVE = 'Find out whether one burn can both let the probe escape and send the gravity map and light spectrum. If it cannot, recommend sending the two files because Earth has no copies, and explain that the probe will not escape.'

export const learnerPredictionStatements: Readonly<Record<LearnerPredictionId, string>> = Object.freeze({
  time: 'There may not be enough time to send both files and make an escape burn.',
  fuel: 'A burn that keeps the antenna pointed at Earth may not change the probe’s speed enough for escape.',
  antenna: 'A powerful escape burn may point the antenna away from Earth.',
  combination: 'The timing, speed-change and antenna requirements may conflict with one another.',
})

interface MutableState {
  revision: number
  phase: WorldlineSnapshot['phase']
  simulations: WorldlineSimulation[]
  simulationAttemptsUsed: number
  learningCheckpoint: LearningCheckpoint | null
  learnerCalculation: LearnerCalculation | null
  learnerPrediction: LearnerPrediction | null
  choices: WorldlineChoices | null
  review: BurnReview | null
  activeGrant: BurnGrant | null
  receipt: TransmissionReceipt | null
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

function initialState(): MutableState {
  return {
    revision: 0,
    phase: 'investigating_extremes',
    simulations: [],
    simulationAttemptsUsed: 0,
    learningCheckpoint: null,
    learnerCalculation: null,
    learnerPrediction: null,
    choices: null,
    review: null,
    activeGrant: null,
    receipt: null,
  }
}

function assertRevision(state: MutableState, expectedRevision: number) {
  if (state.revision !== expectedRevision) {
    throw new WorldlineStateError(`Expected revision ${expectedRevision}, but the mission is at revision ${state.revision}. Read the current state before continuing.`)
  }
}

function packetSize(ids: readonly SciencePacketId[]) {
  return ids.reduce((total, id) => total + (packets.find((packet) => packet.id === id)?.sizeMegabytes ?? 0), 0)
}

function simulationFor(input: WorldlineSimulationInput, id: string): WorldlineSimulation {
  const size = packetSize(input.packetIds)
  const transmissionSeconds = size ? Math.ceil(size / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond) : 0
  const escape = input.burnAtProbeSecond <= WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond
    && input.deltaVMetersPerSecond >= WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond
  const science = input.burnAtProbeSecond >= WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]
    && input.burnAtProbeSecond <= WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]
    && input.deltaVMetersPerSecond >= WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0]
    && input.deltaVMetersPerSecond <= WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1]
    && size > 0
    && size <= 30
    && !input.packetIds.includes('navigation-archive')
    && input.burnAtProbeSecond + transmissionSeconds <= WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond
  const fuelUsed = Math.ceil(input.deltaVMetersPerSecond / 250)
  const outcome = escape ? 'probe_return' : science ? 'science_transmission' : 'total_loss'
  const hypothesis = input.hypothesis?.trim() || 'Test what this burn and file selection would do.'
  const expectedOutcome = input.expectedOutcome ?? outcome
  const failureReasons: WorldlineFailureReason[] = []

  if (!escape && !science) {
    if (!size) failureReasons.push('NO_SCIENCE_SELECTED')
    if (input.packetIds.includes('navigation-archive')) failureReasons.push('REPLICATED_ARCHIVE_SELECTED')
    if (size > 30) failureReasons.push('PACKET_LOAD_TOO_LARGE')
    if (size && input.burnAtProbeSecond + transmissionSeconds > WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond) failureReasons.push('TRANSMISSION_EXCEEDS_CONTACT')
    if (input.burnAtProbeSecond < 44 || input.burnAtProbeSecond > 50) failureReasons.push('BURN_OUTSIDE_TRANSMISSION_CORRIDOR')
    if (input.deltaVMetersPerSecond < 2000 || input.deltaVMetersPerSecond > 2400) failureReasons.push('DELTA_V_OUTSIDE_TRANSMISSION_CORRIDOR')
    if (input.burnAtProbeSecond > 42) failureReasons.push('BURN_AFTER_ESCAPE_CORRIDOR')
    if (input.deltaVMetersPerSecond < 3400) failureReasons.push('DELTA_V_BELOW_ESCAPE_CORRIDOR')
  }

  const escapeFailures: string[] = []
  if (input.burnAtProbeSecond > WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond) {
    escapeFailures.push(`it starts after the last escape time of second ${WORLDLINE_CONSTRAINTS.escapeLatestProbeSecond}`)
  }
  if (input.deltaVMetersPerSecond < WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond) {
    escapeFailures.push(`it changes speed by less than the ${WORLDLINE_CONSTRAINTS.minimumEscapeDeltaVMetersPerSecond.toLocaleString()} m/s needed for escape`)
  }

  const sendingFailures: string[] = []
  if (!size) sendingFailures.push('no file was selected')
  if (input.packetIds.includes('navigation-archive')) sendingFailures.push('the selection includes the 72 MB navigation record that Earth already has')
  if (size > 30) sendingFailures.push('the selected files are larger than the 30 MB that can be sent in this lesson')
  if (input.burnAtProbeSecond < WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]
    || input.burnAtProbeSecond > WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]) {
    sendingFailures.push(`the burn starts outside the antenna-safe time from second ${WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[0]} to ${WORLDLINE_CONSTRAINTS.transmissionBurnProbeSeconds[1]}`)
  }
  if (input.deltaVMetersPerSecond < WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0]
    || input.deltaVMetersPerSecond > WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1]) {
    sendingFailures.push(`the speed change is outside the antenna-safe range of ${WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[0].toLocaleString()} to ${WORLDLINE_CONSTRAINTS.lockPreservingDeltaVMetersPerSecond[1].toLocaleString()} m/s`)
  }
  if (size && input.burnAtProbeSecond + transmissionSeconds > WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond) {
    sendingFailures.push(`the selected files would finish after the radio link closes at second ${WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond}`)
  }

  let explanation = `The probe cannot escape because ${escapeFailures.join(' and ')}. Earth receives no complete files because ${sendingFailures.join(' and ')}.`
  if (escape) explanation = 'The early, powerful burn lets the probe escape, but turns its antenna away before either file is sent to Earth.'
  if (science) explanation = 'The later, gentler burn keeps the antenna pointed at Earth long enough to send the selected files, but is not powerful enough for the probe to escape.'

  return deepFreeze({
    id,
    ...input,
    hypothesis,
    expectedOutcome,
    outcome,
    viable: escape || science,
    probeSurvives: escape,
    discoveryDelivered: science,
    transmissionSeconds,
    transmissionCompletesAtProbeSecond: size ? input.burnAtProbeSecond + transmissionSeconds : null,
    earthArrivalYears: science ? WORLDLINE_CONSTRAINTS.distanceFromEarthLightYears : null,
    fuelRemainingKilograms: Math.max(0, 14 - fuelUsed),
    failureReasons,
    explanation,
    expectationMatched: expectedOutcome === outcome,
  })
}

export function createWorldlineControl(): WorldlineControl {
  let state = initialState()
  let snapshot: WorldlineSnapshot
  const subscribers = new Set<WorldlineSubscriber>()

  const buildSnapshot = (): WorldlineSnapshot => {
    const selectedSimulationId = state.receipt?.simulationId ?? state.activeGrant?.simulationId
    const selected = selectedSimulationId
      ? state.simulations.find((simulation) => simulation.id === selectedSimulationId)
      : null
    return deepFreeze({
      revision: state.revision,
      phase: state.phase,
      distanceFromEarthLightYears: WORLDLINE_CONSTRAINTS.distanceFromEarthLightYears,
      earthElapsedSeconds: state.receipt ? Math.round(state.receipt.earthArrivalYears * 31_557_600) : 0,
      probeElapsedSeconds: state.receipt?.probeElapsedSeconds ?? 0,
      fuelKilograms: state.receipt ? (selected?.fuelRemainingKilograms ?? 0) : 14,
      downlinkMegabytesPerSecond: WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond,
      contactSecondsRemaining: state.receipt ? 0 : WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond,
      packets,
      simulations: [...state.simulations],
      simulationAttemptsUsed: state.simulationAttemptsUsed,
      missionObjective: WORLDLINE_MISSION_OBJECTIVE,
      learningCheckpoint: state.learningCheckpoint,
      learnerCalculation: state.learnerCalculation,
      learnerPrediction: state.learnerPrediction,
      choices: state.choices,
      review: state.review,
      activeGrant: state.activeGrant,
      receipt: state.receipt,
    })
  }

  const publish = () => {
    snapshot = buildSnapshot()
    subscribers.forEach((subscriber) => subscriber(snapshot))
  }

  const mutate = (change: () => void) => {
    change()
    state.revision += 1
    publish()
  }

  snapshot = buildSnapshot()

  return {
    getSnapshot: () => snapshot,
    subscribe(subscriber) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    simulate(input, expectedRevision) {
      if (!['investigating_extremes', 'investigating_prediction'].includes(state.phase)) {
        throw new WorldlineStateError('Simulation is paused until the person completes the current step.')
      }
      assertRevision(state, expectedRevision)
      const testRole = input.testRole ?? (state.phase === 'investigating_extremes' ? 'extreme' : undefined)
      if (state.phase === 'investigating_extremes' && testRole !== 'extreme') {
        throw new WorldlineStateError('The first investigation act can test only the two extreme outcomes.')
      }
      if (state.phase === 'investigating_prediction' && !['compromise', 'counterexample'].includes(testRole ?? '')) {
        throw new WorldlineStateError('After the person makes a prediction, run one middle-option test and one different test designed to challenge that prediction.')
      }
      const actSimulations = state.phase === 'investigating_prediction' && state.learnerPrediction
        ? state.simulations.slice(state.learnerPrediction.selectedAfterSimulationCount)
        : state.simulations
      const initialOutcomes = new Set(state.simulations.map((simulation) => simulation.outcome))
      if (state.phase === 'investigating_extremes' && initialOutcomes.has('probe_return') && initialOutcomes.has('science_transmission')) {
        throw new WorldlineStateError('The two starting outcomes are established. Show the calculation screen now; no additional test was recorded.')
      }
      const roles = new Set(actSimulations.map((simulation) => simulation.testRole))
      if (state.phase === 'investigating_prediction' && roles.has('compromise') && roles.has('counterexample') && actSimulations.some((simulation) => simulation.outcome === 'total_loss')) {
        throw new WorldlineStateError('The person’s prediction has been tested. Show the two possible choices now. No additional test was recorded.')
      }
      if (state.simulationAttemptsUsed >= MAX_WORLDLINE_SIMULATIONS) {
        throw new WorldlineStateError('The five-simulation investigation budget is exhausted. Use the tested outcomes or restart the mission; no additional simulation was recorded.')
      }
      if (!Number.isInteger(input.burnAtProbeSecond) || input.burnAtProbeSecond < 34 || input.burnAtProbeSecond > 58) {
        throw new WorldlineStateError('Burn time must be an integer from probe second 34 to 58.')
      }
      if (!Number.isInteger(input.deltaVMetersPerSecond) || input.deltaVMetersPerSecond < 1800 || input.deltaVMetersPerSecond > 3800) {
        throw new WorldlineStateError('Delta-v must be an integer from 1800 to 3800 metres per second.')
      }
      if (input.hypothesis !== undefined && (!input.hypothesis.trim() || input.hypothesis.length > 160)) {
        throw new WorldlineStateError('Describe what you think the test will show in 1 to 160 characters.')
      }
      if (input.expectedOutcome !== undefined && !['probe_return', 'science_transmission', 'total_loss'].includes(input.expectedOutcome)) {
        throw new WorldlineStateError('The expected outcome is unsupported.')
      }
      if (new Set(input.packetIds).size !== input.packetIds.length || input.packetIds.some((id) => !packets.some((packet) => packet.id === id))) {
        throw new WorldlineStateError('The file selection contains an unknown file or lists the same file twice.')
      }
      const duplicate = state.simulations.find((simulation) => (
        simulation.burnAtProbeSecond === input.burnAtProbeSecond
        && simulation.deltaVMetersPerSecond === input.deltaVMetersPerSecond
        && simulation.packetIds.length === input.packetIds.length
        && simulation.packetIds.every((id, index) => id === input.packetIds[index])
      ))
      state.simulationAttemptsUsed += 1
      if (duplicate) {
        publish()
        return duplicate
      }
      const result = simulationFor({ ...input, testRole }, `worldline-${String(state.simulations.length + 1).padStart(2, '0')}`)
      mutate(() => {
        state.simulations.push(result)
      })
      return result
    },
    presentLearningCheckpoint(expectedRevision) {
      if (state.phase !== 'investigating_extremes') throw new WorldlineStateError('The calculation screen is not available now.')
      assertRevision(state, expectedRevision)
      const outcomes = new Set(state.simulations.map((simulation) => simulation.outcome))
      if (!outcomes.has('probe_return') || !outcomes.has('science_transmission')) {
        throw new WorldlineStateError('Test one burn that lets the probe escape and one that sends both files before asking the person to calculate the sending time and predict what might stop one burn from doing both.')
      }
      const checkpoint: LearningCheckpoint = deepFreeze({ id: 'learning-checkpoint-01', status: 'waiting' })
      mutate(() => {
        state.learningCheckpoint = checkpoint
        state.phase = 'prediction'
      })
      return checkpoint
    },
    selectLearnerTransmissionEstimate(seconds, expectedRevision) {
      if (state.phase !== 'prediction' || state.learningCheckpoint?.status !== 'waiting' || state.learnerCalculation) {
        throw new WorldlineStateError('There is no sending-time calculation waiting for an answer.')
      }
      assertRevision(state, expectedRevision)
      const permitted: readonly LearnerTransmissionEstimateSeconds[] = [12, 25, 36]
      if (!permitted.includes(seconds)) {
        throw new WorldlineStateError('Choose one of the three displayed sending times.')
      }
      const correctSeconds = Math.ceil(
        packetSize(['gravity-map', 'horizon-spectrum']) / WORLDLINE_CONSTRAINTS.downlinkMegabytesPerSecond,
      )
      const calculation: LearnerCalculation = deepFreeze({
        selectedSeconds: seconds,
        correctSeconds,
        correct: seconds === correctSeconds,
      })
      mutate(() => { state.learnerCalculation = calculation })
      return calculation
    },
    selectLearnerPrediction(predictionId, expectedRevision) {
      if (state.phase !== 'prediction' || state.learningCheckpoint?.status !== 'waiting') {
        throw new WorldlineStateError('There is no prediction waiting for an answer.')
      }
      assertRevision(state, expectedRevision)
      if (!state.learnerCalculation) {
        throw new WorldlineStateError('Calculate the sending time before predicting what might stop one burn from doing both.')
      }
      const statement = learnerPredictionStatements[predictionId]
      if (!statement) throw new WorldlineStateError('Choose one of the four displayed predictions.')
      const prediction: LearnerPrediction = deepFreeze({
        id: predictionId,
        statement,
        selectedAfterSimulationCount: state.simulations.length,
      })
      mutate(() => {
        state.learningCheckpoint = deepFreeze({ ...state.learningCheckpoint!, status: 'answered' })
        state.learnerPrediction = prediction
        state.phase = 'investigating_prediction'
      })
      return prediction
    },
    presentChoices(optionASimulationId, optionBSimulationId, expectedRevision, suppliedRecommendation: WorldlineRecommendationInput, predictionAssessment: PredictionAssessment, teachingExplanation: string) {
      if (state.phase !== 'investigating_prediction' || !state.learnerPrediction) throw new WorldlineStateError('The person’s prediction must be tested before the final choice can be presented.')
      assertRevision(state, expectedRevision)
      if (optionASimulationId === optionBSimulationId) {
        throw new WorldlineStateError('The two choices must use distinct simulations.')
      }
      const predictionTests = state.simulations.slice(state.learnerPrediction.selectedAfterSimulationCount)
      const testRoles = new Set(predictionTests.map((simulation) => simulation.testRole))
      if (predictionTests.length < 2 || !testRoles.has('compromise') || !testRoles.has('counterexample') || !predictionTests.some((simulation) => simulation.outcome === 'total_loss')) {
        throw new WorldlineStateError('After the person makes a prediction, test one middle option and one different option designed to challenge that prediction. At least one test must show that the probe does not escape and Earth receives no complete files before you present the choice.')
      }
      const options = [optionASimulationId, optionBSimulationId]
        .map((id) => state.simulations.find((candidate) => candidate.id === id))
      const probeReturn = options.find((candidate) => candidate?.outcome === 'probe_return')
      const scienceTransmission = options.find((candidate) => candidate?.outcome === 'science_transmission')
      if (!probeReturn || !scienceTransmission) {
        throw new WorldlineStateError('Show two different possible outcomes: one where the probe escapes and one where Earth receives both files.')
      }
      const recommendation = suppliedRecommendation
      if (!options.some((candidate) => candidate?.id === recommendation.recommendedSimulationId)) {
        throw new WorldlineStateError('The recommendation must reference one of the two displayed futures.')
      }
      const recommendedSimulation = options.find((candidate) => candidate?.id === recommendation.recommendedSimulationId)
      if (recommendedSimulation?.outcome !== 'science_transmission') {
        throw new WorldlineStateError('The recommendation must be the tested option that sends the gravity map and light spectrum because Earth has no copies. The person will still make the final choice.')
      }
      if (!recommendation.rationale.trim() || recommendation.rationale.length > 240) {
        throw new WorldlineStateError('The recommendation rationale must contain 1 to 240 characters.')
      }
      if (!['correct', 'partly_correct', 'not_supported'].includes(predictionAssessment)) {
        throw new WorldlineStateError('The prediction assessment is unsupported.')
      }
      if (!teachingExplanation.trim() || teachingExplanation.length > 320) {
        throw new WorldlineStateError('The teaching explanation must contain 1 to 320 characters.')
      }
      const choices: WorldlineChoices = deepFreeze({
        id: 'worldline-choices-01',
        probeReturnSimulationId: probeReturn.id,
        scienceTransmissionSimulationId: scienceTransmission.id,
        recommendedSimulationId: recommendation.recommendedSimulationId,
        rationale: recommendation.rationale.trim(),
        predictionAssessment,
        teachingExplanation: teachingExplanation.trim(),
      })
      const review: BurnReview = deepFreeze({ id: 'burn-review-01', choicesId: choices.id, status: 'pending' })
      mutate(() => {
        state.choices = choices
        state.review = review
        state.phase = 'review'
      })
      return review
    },
    approveBurnReview(reviewId, simulationId) {
      if (state.phase !== 'review' || state.review?.id !== reviewId || state.review.status !== 'pending') {
        throw new WorldlineStateError('There is no pending burn review with that identity.')
      }
      if (!state.choices || ![state.choices.probeReturnSimulationId, state.choices.scienceTransmissionSimulationId].includes(simulationId)) {
        throw new WorldlineStateError('Choose one of the two tested outcomes displayed for review.')
      }
      const grant: BurnGrant = deepFreeze({
        id: 'burn-grant-01',
        reviewId,
        choicesId: state.review.choicesId,
        simulationId,
        usesRemaining: 1,
      })
      mutate(() => {
        state.review = deepFreeze({ ...state.review!, status: 'approved' })
        state.activeGrant = grant
        state.phase = 'authorized'
      })
      return grant
    },
    executeAuthorizedBurn(grantId) {
      if (state.phase !== 'authorized' || state.activeGrant?.id !== grantId || !state.choices) {
        throw new WorldlineStateError('There is no approved burn ready to run.')
      }
      const simulation = state.simulations.find((candidate) => candidate.id === state.activeGrant?.simulationId)
      if (!simulation?.viable) throw new WorldlineStateError('The approved burn is no longer available.')
      const receipt: TransmissionReceipt = deepFreeze({
        id: 'transmission-receipt-01',
        choicesId: state.choices.id,
        simulationId: simulation.id,
        packetIds: simulation.packetIds,
        earthArrivalYears: simulation.earthArrivalYears ?? 0,
        probeElapsedSeconds: simulation.transmissionCompletesAtProbeSecond ?? simulation.burnAtProbeSecond,
        verified: true,
        summary: simulation.discoveryDelivered
          ? `${simulation.packetIds.map((id) => packets.find((packet) => packet.id === id)?.name ?? id).join(' and ')} reached Earth ${WORLDLINE_CONSTRAINTS.distanceFromEarthLightYears} years after they were sent. The probe did not escape.`
          : 'The probe escaped the black hole. Earth did not receive the gravity map or light spectrum before the radio link closed.',
      })
      mutate(() => {
        state.review = deepFreeze({ ...state.review!, status: 'consumed' })
        state.activeGrant = null
        state.receipt = receipt
        state.phase = 'executed'
      })
      return receipt
    },
    reset() {
      state = initialState()
      publish()
    },
  }
}
