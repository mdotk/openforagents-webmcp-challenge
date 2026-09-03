export type WorldlinePhase = 'investigating' | 'review' | 'authorized' | 'executed'

export type SciencePacketId = 'gravity-map' | 'horizon-spectrum' | 'navigation-archive'

export interface SciencePacket {
  readonly id: SciencePacketId
  readonly name: string
  readonly sizeMegabytes: number
  readonly scientificValue: number
  readonly replicatedOnEarth: boolean
  readonly observation: string
}

export interface WorldlineSimulationInput {
  readonly burnAtProbeSecond: number
  readonly deltaVMetersPerSecond: number
  readonly packetIds: readonly SciencePacketId[]
  readonly hypothesis?: string
  readonly expectedOutcome?: WorldlineOutcome
}

export type WorldlineOutcome = 'probe_return' | 'science_transmission' | 'total_loss'

export type WorldlineFailureReason =
  | 'NO_SCIENCE_SELECTED'
  | 'REPLICATED_ARCHIVE_SELECTED'
  | 'PACKET_LOAD_TOO_LARGE'
  | 'TRANSMISSION_EXCEEDS_CONTACT'
  | 'BURN_OUTSIDE_TRANSMISSION_CORRIDOR'
  | 'DELTA_V_OUTSIDE_TRANSMISSION_CORRIDOR'
  | 'BURN_AFTER_ESCAPE_CORRIDOR'
  | 'DELTA_V_BELOW_ESCAPE_CORRIDOR'

export interface WorldlineSimulation extends WorldlineSimulationInput {
  readonly id: string
  readonly hypothesis: string
  readonly expectedOutcome: WorldlineOutcome
  readonly outcome: WorldlineOutcome
  readonly viable: boolean
  readonly probeSurvives: boolean
  readonly discoveryDelivered: boolean
  readonly transmissionSeconds: number
  readonly transmissionCompletesAtProbeSecond: number | null
  readonly earthArrivalYears: number | null
  readonly fuelRemainingKilograms: number
  readonly failureReasons: readonly WorldlineFailureReason[]
  readonly explanation: string
  readonly expectationMatched: boolean
}

export interface WorldlineRecommendationInput {
  readonly recommendedSimulationId: string
  readonly rationale: string
}

export interface WorldlineChoices {
  readonly id: string
  readonly probeReturnSimulationId: string
  readonly scienceTransmissionSimulationId: string
  readonly recommendedSimulationId: string
  readonly priority: string
  readonly rationale: string
}

export interface BurnReview {
  readonly id: string
  readonly choicesId: string
  readonly status: 'pending' | 'approved' | 'consumed'
}

export interface BurnGrant {
  readonly id: string
  readonly reviewId: string
  readonly choicesId: string
  readonly simulationId: string
  readonly usesRemaining: 1
}

export interface TransmissionReceipt {
  readonly id: string
  readonly choicesId: string
  readonly simulationId: string
  readonly packetIds: readonly SciencePacketId[]
  readonly earthArrivalYears: number
  readonly probeElapsedSeconds: number
  readonly verified: true
  readonly summary: string
}

export interface WorldlineSnapshot {
  readonly revision: number
  readonly phase: WorldlinePhase
  readonly earthElapsedSeconds: number
  readonly probeElapsedSeconds: number
  readonly fuelKilograms: number
  readonly downlinkMegabytesPerSecond: number
  readonly contactSecondsRemaining: number
  readonly packets: readonly SciencePacket[]
  readonly simulations: readonly WorldlineSimulation[]
  readonly simulationAttemptsUsed: number
  readonly humanPriority: string
  readonly choices: WorldlineChoices | null
  readonly review: BurnReview | null
  readonly activeGrant: BurnGrant | null
  readonly receipt: TransmissionReceipt | null
}

export type WorldlineSubscriber = (snapshot: WorldlineSnapshot) => void

export interface WorldlineControl {
  getSnapshot(): WorldlineSnapshot
  subscribe(subscriber: WorldlineSubscriber): () => void
  setHumanPriority(priority: string, expectedRevision: number): void
  simulate(input: WorldlineSimulationInput, expectedRevision: number): WorldlineSimulation
  presentChoices(optionASimulationId: string, optionBSimulationId: string, expectedRevision: number, recommendation?: WorldlineRecommendationInput): BurnReview
  approveBurnReview(reviewId: string, simulationId: string): BurnGrant
  executeAuthorizedBurn(grantId: string): TransmissionReceipt
  reset(): void
}

export interface WorldlineToolsRegistration {
  readonly supported: boolean
  readonly initialToolNames: readonly string[]
  getRegisteredToolNames(): Promise<readonly string[]>
  getLastError(): Error | null
  whenIdle(): Promise<void>
  dispose(): Promise<void>
}
