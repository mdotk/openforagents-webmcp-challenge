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
}

export interface WorldlineSimulation extends WorldlineSimulationInput {
  readonly id: string
  readonly viable: boolean
  readonly probeSurvives: boolean
  readonly discoveryDelivered: boolean
  readonly transmissionSeconds: number
  readonly earthArrivalYears: number | null
  readonly fuelRemainingKilograms: number
  readonly explanation: string
}

export interface WorldlinePlan {
  readonly id: string
  readonly simulationId: string
  readonly title: string
  readonly rationale: string
  readonly consequence: string
}

export interface BurnReview {
  readonly id: string
  readonly planId: string
  readonly status: 'pending' | 'approved' | 'consumed'
}

export interface BurnGrant {
  readonly id: string
  readonly reviewId: string
  readonly planId: string
  readonly usesRemaining: 1
}

export interface TransmissionReceipt {
  readonly id: string
  readonly planId: string
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
  readonly plan: WorldlinePlan | null
  readonly review: BurnReview | null
  readonly activeGrant: BurnGrant | null
  readonly receipt: TransmissionReceipt | null
}

export type WorldlineSubscriber = (snapshot: WorldlineSnapshot) => void

export interface WorldlineControl {
  getSnapshot(): WorldlineSnapshot
  subscribe(subscriber: WorldlineSubscriber): () => void
  simulate(input: WorldlineSimulationInput, expectedRevision: number): WorldlineSimulation
  updatePlan(simulationId: string, title: string, rationale: string, expectedRevision: number): WorldlinePlan
  requestBurnReview(planId: string, expectedRevision: number): BurnReview
  approveBurnReview(reviewId: string): BurnGrant
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
