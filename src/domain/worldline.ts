import type {
  BurnGrant,
  BurnReview,
  SciencePacket,
  SciencePacketId,
  TransmissionReceipt,
  WorldlineControl,
  WorldlinePlan,
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

interface MutableState {
  revision: number
  phase: WorldlineSnapshot['phase']
  simulations: WorldlineSimulation[]
  plan: WorldlinePlan | null
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
    plan: null,
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
  const escape = input.burnAtProbeSecond <= 42 && input.deltaVMetersPerSecond >= 3400
  const science = input.burnAtProbeSecond >= 44
    && input.burnAtProbeSecond <= 50
    && input.deltaVMetersPerSecond >= 2000
    && input.deltaVMetersPerSecond <= 2400
    && size > 0
    && size <= 30
    && !input.packetIds.includes('navigation-archive')
  const fuelUsed = Math.ceil(input.deltaVMetersPerSecond / 250)
  const transmissionSeconds = size ? Math.ceil(size / 0.5) : 0

  let explanation = 'This burn misses both safe corridors: the probe is lost and no complete packet clears the signal window.'
  if (escape) explanation = 'The early high-energy burn saves the probe, but turns its antenna away before the unique science packets can leave.'
  if (science) explanation = 'The lower burn holds the antenna on Earth long enough to send the selected packets, but leaves too little fuel for the probe to escape.'

  return deepFreeze({
    id,
    ...input,
    viable: escape || science,
    probeSurvives: escape,
    discoveryDelivered: science,
    transmissionSeconds,
    earthArrivalYears: science ? 23 : null,
    fuelRemainingKilograms: Math.max(0, 14 - fuelUsed),
    explanation,
  })
}

export function createWorldlineControl(): WorldlineControl {
  let state = initialState()
  let snapshot: WorldlineSnapshot
  const subscribers = new Set<WorldlineSubscriber>()

  const buildSnapshot = (): WorldlineSnapshot => {
    const selected = state.plan
      ? state.simulations.find((simulation) => simulation.id === state.plan?.simulationId)
      : null
    return deepFreeze({
      revision: state.revision,
      phase: state.phase,
      earthElapsedSeconds: state.receipt ? Math.round(state.receipt.earthArrivalYears * 31_557_600) : 0,
      probeElapsedSeconds: state.receipt?.probeElapsedSeconds ?? 0,
      fuelKilograms: state.receipt ? (selected?.fuelRemainingKilograms ?? 0) : 14,
      downlinkMegabytesPerSecond: 0.5,
      contactSecondsRemaining: state.receipt ? 0 : 71,
      packets,
      simulations: [...state.simulations],
      plan: state.plan,
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
      if (state.phase !== 'investigating') throw new WorldlineStateError('Planning is closed for this mission.')
      assertRevision(state, expectedRevision)
      if (!Number.isInteger(input.burnAtProbeSecond) || input.burnAtProbeSecond < 34 || input.burnAtProbeSecond > 58) {
        throw new WorldlineStateError('Burn time must be an integer from probe second 34 to 58.')
      }
      if (!Number.isInteger(input.deltaVMetersPerSecond) || input.deltaVMetersPerSecond < 1800 || input.deltaVMetersPerSecond > 3800) {
        throw new WorldlineStateError('Delta-v must be an integer from 1800 to 3800 metres per second.')
      }
      if (new Set(input.packetIds).size !== input.packetIds.length || input.packetIds.some((id) => !packets.some((packet) => packet.id === id))) {
        throw new WorldlineStateError('Packet selection contains an unsupported or duplicate packet.')
      }
      const result = simulationFor(input, `worldline-${String(state.simulations.length + 1).padStart(2, '0')}`)
      mutate(() => {
        state.simulations.push(result)
      })
      return result
    },
    updatePlan(simulationId, title, rationale, expectedRevision) {
      if (state.phase !== 'investigating') throw new WorldlineStateError('The shared plan can no longer be changed.')
      assertRevision(state, expectedRevision)
      const simulation = state.simulations.find((candidate) => candidate.id === simulationId)
      if (!simulation?.viable) throw new WorldlineStateError('The plan must use a viable simulated worldline.')
      if (!title.trim() || title.length > 80 || !rationale.trim() || rationale.length > 240) {
        throw new WorldlineStateError('The plan needs a short title and a rationale of at most 240 characters.')
      }
      const plan: WorldlinePlan = deepFreeze({
        id: 'shared-plan-01',
        simulationId,
        title: title.trim(),
        rationale: rationale.trim(),
        consequence: simulation.probeSurvives
          ? 'The probe returns, but the unique observation is lost.'
          : 'The unique observation reaches Earth, but the probe cannot return.',
      })
      mutate(() => { state.plan = plan })
      return plan
    },
    requestBurnReview(planId, expectedRevision) {
      if (state.phase !== 'investigating') throw new WorldlineStateError('A burn review is already active or complete.')
      assertRevision(state, expectedRevision)
      if (state.plan?.id !== planId) throw new WorldlineStateError('The requested plan is not the current shared plan.')
      const review: BurnReview = deepFreeze({ id: 'burn-review-01', planId, status: 'pending' })
      mutate(() => {
        state.review = review
        state.phase = 'review'
      })
      return review
    },
    approveBurnReview(reviewId) {
      if (state.phase !== 'review' || state.review?.id !== reviewId || state.review.status !== 'pending') {
        throw new WorldlineStateError('There is no pending burn review with that identity.')
      }
      const grant: BurnGrant = deepFreeze({ id: 'burn-grant-01', reviewId, planId: state.review.planId, usesRemaining: 1 })
      mutate(() => {
        state.review = deepFreeze({ ...state.review!, status: 'approved' })
        state.activeGrant = grant
        state.phase = 'authorized'
      })
      return grant
    },
    executeAuthorizedBurn(grantId) {
      if (state.phase !== 'authorized' || state.activeGrant?.id !== grantId || !state.plan) {
        throw new WorldlineStateError('The one-use burn authority is not active.')
      }
      const simulation = state.simulations.find((candidate) => candidate.id === state.plan?.simulationId)
      if (!simulation?.viable) throw new WorldlineStateError('The approved simulation is no longer available.')
      const receipt: TransmissionReceipt = deepFreeze({
        id: 'transmission-receipt-01',
        planId: state.plan.id,
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
