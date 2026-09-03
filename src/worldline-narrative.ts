import type { SciencePacket, WorldlineSimulation } from './types'
import { WORLDLINE_CONSTRAINTS } from './domain/worldline'

export interface SimulationStory {
  readonly question: string
  readonly plan: string
  readonly outcomeSummary: string
  readonly result: string
  readonly lesson: string
  readonly calculation: string | null
}

function selectedMegabytes(simulation: WorldlineSimulation, packets: readonly SciencePacket[]) {
  return simulation.packetIds.reduce(
    (total, id) => total + (packets.find((packet) => packet.id === id)?.sizeMegabytes ?? 0),
    0,
  )
}

function packetDescription(simulation: WorldlineSimulation, packets: readonly SciencePacket[]) {
  if (!simulation.packetIds.length) return 'no files'
  const names = simulation.packetIds.map((id) => packets.find((packet) => packet.id === id)?.name ?? id)
  return names.join(' and ')
}

export function storyForSimulation(
  simulation: WorldlineSimulation,
  packets: readonly SciencePacket[],
): SimulationStory {
  const megabytes = selectedMegabytes(simulation, packets)
  const remaining = simulation.transmissionCompletesAtProbeSecond === null
    ? null
    : WORLDLINE_CONSTRAINTS.contactEndsAtProbeSecond - simulation.transmissionCompletesAtProbeSecond
  const selectedPackets = packetDescription(simulation, packets)

  if (simulation.outcome === 'probe_return') {
    const hasPayload = simulation.packetIds.length > 0
    return {
      question: hasPayload
        ? 'Does carrying less data change the escape trade-off?'
        : 'Can an early, powerful burn help the probe escape?',
      plan: `At second ${simulation.burnAtProbeSecond}, change the probe’s speed by ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s${hasPayload ? ` while trying to send ${selectedPackets}` : ' without sending any files'}.`,
      outcomeSummary: 'The probe escapes. Earth receives no files.',
      result: 'The probe escapes, but the burn turns its antenna away before either file is sent to Earth.',
      lesson: hasPayload
        ? 'Sending fewer files does not stop the escape burn from turning the antenna away from Earth.'
        : 'The burn that saves the probe prevents it from sending the files.',
      calculation: null,
    }
  }

  if (simulation.outcome === 'science_transmission') {
    return {
      question: 'Can a later, gentler burn send both files?',
      plan: `At second ${simulation.burnAtProbeSecond}, fire a gentler ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s burn while sending ${selectedPackets}.`,
      outcomeSummary: 'Both files are sent. The probe cannot escape.',
      result: `The ${megabytes} MB transfer finishes at t+${simulation.transmissionCompletesAtProbeSecond}s. The gentler burn is not powerful enough for the probe to escape.`,
      lesson: 'The files reach Earth only if the probe gives up the powerful burn it needs to escape.',
      calculation: `${megabytes} MB ÷ 1.2 MB/s = ${simulation.transmissionSeconds}s · finished ${remaining} second${remaining === 1 ? '' : 's'} before the radio link closed`,
    }
  }

  return {
    question: simulation.testRole === 'counterexample'
      ? 'Does a different burn support or challenge your prediction?'
      : 'Can one middle burn save the probe and send the files?',
    plan: `At second ${simulation.burnAtProbeSecond}, try a ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s burn${simulation.packetIds.length ? ` while sending ${selectedPackets}` : ' without transmitting data'}.`,
    outcomeSummary: 'The probe does not escape. Earth receives no complete files.',
    result: simulation.explanation,
    lesson: simulation.testRole === 'counterexample'
      ? 'Changing only one part of the burn still does not meet both sets of requirements.'
      : 'Trying to split the difference saves neither the probe nor the files.',
    calculation: megabytes
      ? `${megabytes} MB selected · no complete file sent`
      : 'No file selected to send',
  }
}

export function recommendationStory(
  recommendation: WorldlineSimulation,
) {
  if (recommendation.discoveryDelivered) {
    return 'Earth has no copy of either file. This option sends the gravity map and light spectrum before the radio link closes. The cost is that the probe cannot escape because the gentler burn does not change its speed enough.'
  }
  return 'This is the only tested option that lets the probe escape. Earth would receive neither file, even though it has no other copy of them.'
}

export function formatMissionClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
