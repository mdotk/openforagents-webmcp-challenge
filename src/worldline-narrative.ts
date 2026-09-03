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
  if (!simulation.packetIds.length) return 'no transmission payload'
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
        : 'Can a hard early burn save the probe?',
      plan: `At second ${simulation.burnAtProbeSecond}, fire a ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s escape burn${hasPayload ? ` while trying to send ${selectedPackets}` : ' without trying to transmit data'}.`,
      outcomeSummary: 'The probe returns. The discoveries do not.',
      result: 'The probe escapes, but the hard burn turns its antenna away before any discovery is sent.',
      lesson: hasPayload
        ? 'Reducing the payload does not solve the antenna conflict.'
        : 'Saving the spacecraft and saving the discovery are now proven to conflict.',
      calculation: null,
    }
  }

  if (simulation.outcome === 'science_transmission') {
    return {
      question: 'Can a gentler later burn send both discoveries?',
      plan: `At second ${simulation.burnAtProbeSecond}, fire a gentler ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s burn while sending ${selectedPackets}.`,
      outcomeSummary: 'Both discoveries are sent. The probe is lost.',
      result: `${megabytes} MB finishes transmitting at t+${simulation.transmissionCompletesAtProbeSecond}s. The probe no longer has enough thrust to escape.`,
      lesson: 'The discoveries fit inside the signal window, but only by spending the fuel that could return the probe.',
      calculation: `${megabytes} MB ÷ 1.2 MB/s = ${simulation.transmissionSeconds}s · ${remaining} second${remaining === 1 ? '' : 's'} before contact closes`,
    }
  }

  return {
    question: simulation.expectedOutcome === 'total_loss'
      ? 'Does the simulator reject an unsafe burn?'
      : 'Can one compromise save both?',
    plan: `At second ${simulation.burnAtProbeSecond}, try a ${simulation.deltaVMetersPerSecond.toLocaleString()} m/s burn${simulation.packetIds.length ? ` while sending ${selectedPackets}` : ' without transmitting data'}.`,
    outcomeSummary: 'Nothing is saved.',
    result: 'No. This burn has neither enough thrust to escape nor a stable antenna lock to finish transmitting.',
    lesson: 'The apparent compromise is worse than either viable path: everything is lost.',
    calculation: megabytes
      ? `${megabytes} MB selected · neither safe corridor reached`
      : 'No complete discovery leaves the probe',
  }
}

export function recommendationStory(
  choices: WorldlineChoices,
  recommendation: WorldlineSimulation,
) {
  if (recommendation.discoveryDelivered) {
    const framing = choices.priority.toLowerCase().includes('observations')
      ? 'You asked the agent to protect irreplaceable evidence.'
      : 'The strongest evidence favors the irreplaceable observations.'
    return `${framing} This route sends both unique observations before contact closes. The alternative returns the probe but strands their only copies.`
  }

  const framing = choices.priority.toLowerCase().includes('spacecraft')
    ? 'You asked the agent to protect the spacecraft.'
    : 'The strongest evidence favors preserving the spacecraft.'
  return `${framing} This is the only tested route that escapes. The alternative sends the discoveries but spends the thrust needed to save the probe.`
}

export function formatMissionClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
