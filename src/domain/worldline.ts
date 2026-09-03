import type {
  BurnGrant,
  BurnReview,
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
    observation: 'A unique map of the warped region immediately outside the horizon.',
  },
  {
    id: 'horizon-spectrum',
    name: 'Horizon spectrum',
    sizeMegabytes: 12,
    scientificValue: 9,
    replicatedOnEarth: false,
    observation: 'The only complete spectrum captured during the probe’s closest pass.',
  },
  {
    id: 'navigation-archive',
    name: 'Navigation archive',
    sizeMegabytes: 72,
    scientificValue: 2,
    replicatedOnEarth: true,
    observation: 'A large engineering log already mirrored by mission control.',
  },
])

const CONTACT_SECONDS = 71
const DOWNLINK_MEGABYTES_PER_SECOND = 1.2
export const MAX_WORLDLINE_SIMULATIONS = 5
export const DEFAULT_WORLDLINE_PRIORITY = 'Recommend the most defensible recoverable outcome from the evidence, and explain the loss it requires.'

interface MutableState {
  revision: number
  phase: WorldlineSnapshot['phase']
  simulations: WorldlineSimulation[]
  simulationAttemptsUsed: number
  humanPriority: string
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
    phase: 'investigating',
    simulations: [],
    simulationAttemptsUsed: 0,
    humanPriority: DEFAULT_WORLDLINE_PRIORITY,
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
  const transmissionSeconds = size ? Math.ceil(size / DOWNLINK_MEGABYTES_PER_SECOND) : 0
  const escape = input.burnAtProbeSecond <= 42 && input.deltaVMetersPerSecond >= 3400
  const science = input.burnAtProbeSecond >= 44
    && input.burnAtProbeSecond <= 50
    && input.deltaVMetersPerSecond >= 2000
    && input.deltaVMetersPerSecond <= 2400
    && size > 0
    && size <= 30
    && !input.packetIds.includes('navigation-archive')
    && input.burnAtProbeSecond + transmissionSeconds <= CONTACT_SECONDS
  const fuelUsed = Math.ceil(input.deltaVMetersPerSecond / 250)
  const outcome = escape ? 'probe_return' : science ? 'science_transmission' : 'total_loss'
  const hypothesis = input.hypothesis?.trim() || 'Test this exact burn and packet configuration.'
  const expectedOutcome = input.expectedOutcome ?? outcome
  const failureReasons: WorldlineFailureReason[] = []

  if (!escape && !science) {
    if (!size) failureReasons.push('NO_SCIENCE_SELECTED')
    if (input.packetIds.includes('navigation-archive')) failureReasons.push('REPLICATED_ARCHIVE_SELECTED')
    if (size > 30) failureReasons.push('PACKET_LOAD_TOO_LARGE')
    if (size && input.burnAtProbeSecond + transmissionSeconds > CONTACT_SECONDS) failureReasons.push('TRANSMISSION_EXCEEDS_CONTACT')
    if (input.burnAtProbeSecond < 44 || input.burnAtProbeSecond > 50) failureReasons.push('BURN_OUTSIDE_TRANSMISSION_CORRIDOR')
    if (input.deltaVMetersPerSecond < 2000 || input.deltaVMetersPerSecond > 2400) failureReasons.push('DELTA_V_OUTSIDE_TRANSMISSION_CORRIDOR')
    if (input.burnAtProbeSecond > 42) failureReasons.push('BURN_AFTER_ESCAPE_CORRIDOR')
    if (input.deltaVMetersPerSecond < 3400) failureReasons.push('DELTA_V_BELOW_ESCAPE_CORRIDOR')
  }

  let explanation = 'This burn misses both safe corridors: the probe is lost and no complete packet clears the signal window.'
  if (escape) explanation = 'The early high-energy burn saves the probe, but turns its antenna away before the unique science packets can leave.'
  if (science) explanation = 'The lower burn holds the antenna on Earth long enough to send the selected packets, but leaves too little fuel for the probe to escape.'

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
    earthArrivalYears: science ? 23 : null,
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
      earthElapsedSeconds: state.receipt ? Math.round(state.receipt.earthArrivalYears * 31_557_600) : 0,
      probeElapsedSeconds: state.receipt?.probeElapsedSeconds ?? 0,
      fuelKilograms: state.receipt ? (selected?.fuelRemainingKilograms ?? 0) : 14,
      downlinkMegabytesPerSecond: DOWNLINK_MEGABYTES_PER_SECOND,
      contactSecondsRemaining: state.receipt ? 0 : CONTACT_SECONDS,
      packets,
      simulations: [...state.simulations],
      simulationAttemptsUsed: state.simulationAttemptsUsed,
      humanPriority: state.humanPriority,
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
    setHumanPriority(priority, expectedRevision) {
      if (state.phase !== 'investigating' || state.simulationAttemptsUsed > 0) {
        throw new WorldlineStateError('The human priority can change only before the investigation begins.')
      }
      assertRevision(state, expectedRevision)
      const normalized = priority.trim()
      if (!normalized || normalized.length > 180) {
        throw new WorldlineStateError('The human priority must contain 1 to 180 characters.')
      }
      if (normalized === state.humanPriority) return
      mutate(() => { state.humanPriority = normalized })
    },
    simulate(input, expectedRevision) {
      if (state.phase !== 'investigating') throw new WorldlineStateError('Planning is closed for this mission.')
      assertRevision(state, expectedRevision)
      const outcomes = new Set(state.simulations.map((simulation) => simulation.outcome))
      if (outcomes.has('probe_return') && outcomes.has('science_transmission') && outcomes.has('total_loss')) {
        throw new WorldlineStateError('The investigation is complete. Present the two viable choices now; no additional simulation was recorded.')
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
        throw new WorldlineStateError('The simulation hypothesis must contain 1 to 160 characters.')
      }
      if (input.expectedOutcome !== undefined && !['probe_return', 'science_transmission', 'total_loss'].includes(input.expectedOutcome)) {
        throw new WorldlineStateError('The expected outcome is unsupported.')
      }
      if (new Set(input.packetIds).size !== input.packetIds.length || input.packetIds.some((id) => !packets.some((packet) => packet.id === id))) {
        throw new WorldlineStateError('Packet selection contains an unsupported or duplicate packet.')
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
      const result = simulationFor(input, `worldline-${String(state.simulations.length + 1).padStart(2, '0')}`)
      mutate(() => {
        state.simulations.push(result)
      })
      return result
    },
    presentChoices(optionASimulationId, optionBSimulationId, expectedRevision, suppliedRecommendation?: WorldlineRecommendationInput) {
      if (state.phase !== 'investigating') throw new WorldlineStateError('The human choice is already active or complete.')
      assertRevision(state, expectedRevision)
      if (optionASimulationId === optionBSimulationId) {
        throw new WorldlineStateError('The two choices must use distinct simulations.')
      }
      if (state.simulations.length < 3 || !state.simulations.some((simulation) => simulation.outcome === 'total_loss')) {
        throw new WorldlineStateError('Test at least three futures, including one total-loss control, before presenting the choice.')
      }
      const options = [optionASimulationId, optionBSimulationId]
        .map((id) => state.simulations.find((candidate) => candidate.id === id))
      const probeReturn = options.find((candidate) => candidate?.outcome === 'probe_return')
      const scienceTransmission = options.find((candidate) => candidate?.outcome === 'science_transmission')
      if (!probeReturn || !scienceTransmission) {
        throw new WorldlineStateError('The two choices must be materially different viable futures: one returns the probe and one delivers the discovery.')
      }
      const recommendation = suppliedRecommendation ?? {
        recommendedSimulationId: scienceTransmission.id,
        rationale: 'This tested future recovers the unique observation while the alternative returns the spacecraft.',
      }
      if (!options.some((candidate) => candidate?.id === recommendation.recommendedSimulationId)) {
        throw new WorldlineStateError('The recommendation must reference one of the two displayed futures.')
      }
      if (!recommendation.rationale.trim() || recommendation.rationale.length > 240) {
        throw new WorldlineStateError('The recommendation rationale must contain 1 to 240 characters.')
      }
      const choices: WorldlineChoices = deepFreeze({
        id: 'worldline-choices-01',
        probeReturnSimulationId: probeReturn.id,
        scienceTransmissionSimulationId: scienceTransmission.id,
        recommendedSimulationId: recommendation.recommendedSimulationId,
        priority: state.humanPriority,
        rationale: recommendation.rationale.trim(),
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
        throw new WorldlineStateError('Choose one of the two exact worldlines displayed for review.')
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
        throw new WorldlineStateError('The one-use burn authority is not active.')
      }
      const simulation = state.simulations.find((candidate) => candidate.id === state.activeGrant?.simulationId)
      if (!simulation?.viable) throw new WorldlineStateError('The approved simulation is no longer available.')
      const receipt: TransmissionReceipt = deepFreeze({
        id: 'transmission-receipt-01',
        choicesId: state.choices.id,
        simulationId: simulation.id,
        packetIds: simulation.packetIds,
        earthArrivalYears: simulation.earthArrivalYears ?? 0,
        probeElapsedSeconds: 557,
        verified: true,
        summary: simulation.discoveryDelivered
          ? `${simulation.packetIds.map((id) => packets.find((packet) => packet.id === id)?.name ?? id).join(' and ')} reached Earth 23 years later. The probe did not return.`
          : 'The probe escaped. The unique observation did not reach Earth.',
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
