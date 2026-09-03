import type { SciencePacket, WorldlineChoices, WorldlineSimulation } from './types'
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
      result: `${megabytes} MB finishes sending at t+${simulation.transmissionCompletesAtProbeSecond}s. The gentler burn is not powerful enough for the probe to escape.`,
      lesson: 'The files reach Earth only if the probe gives up the powerful burn it needs to escape.',
      calculation: `${megabytes} MB ÷ 1.2 MB/s = ${simulation.transmissionSeconds}s · finished ${remaining} second${remaining === 1 ? '' : 's'} before final contact`,
    }
  }

  return {
    question: simulation.expectedOutcome === 'total_loss'
      ? 'Does the simulator reject an unsafe burn?'
      : 'Can one middle option save both?',
    plan: `At second ${simulation.burnAtProbeSecond}, try a ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s burn${simulation.packetIds.length ? ` while sending ${selectedPackets}` : ' without transmitting data'}.`,
    outcomeSummary: 'The probe is lost. Earth receives no complete files.',
    result: 'No. This burn is too weak for escape and does not keep the antenna pointed at Earth long enough to finish sending a file.',
    lesson: 'Trying to split the difference loses the probe and the files.',
    calculation: megabytes
      ? `${megabytes} MB selected · no complete file sent`
      : 'No file selected to send',
  }
}

export function recommendationStory(
  choices: WorldlineChoices,
  recommendation: WorldlineSimulation,
) {
  if (recommendation.discoveryDelivered) {
    const framing = choices.priority.toLowerCase().includes('gravity map')
      ? 'You asked the agent to send the two files that Earth does not have.'
      : 'The mission priority favors sending the two files that Earth does not have.'
    return `${framing} This option sends the gravity map and light spectrum before final contact. The other option lets the probe escape, but Earth never receives those files.`
  }

  const framing = choices.priority.toLowerCase().includes('probe')
    ? 'You asked the agent to save the probe.'
    : 'The mission priority favors saving the probe.'
  return `${framing} This is the only tested option that lets the probe escape. The other option sends both files, but its gentler burn is not powerful enough to save the probe.`
}

export function formatMissionClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
