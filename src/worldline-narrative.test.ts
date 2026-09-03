import { describe, expect, it } from 'vitest'
import { createWorldlineControl } from './domain'
import { formatMissionClock, recommendationStory, storyForSimulation } from './worldline-narrative'

describe('WORLDLINE human narrative', () => {
  it('turns raw science telemetry into a causal calculation and lesson', () => {
    const control = createWorldlineControl()
    const simulation = control.simulate({
      burnAtProbeSecond: 45,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 0)
    const story = storyForSimulation(simulation, control.getSnapshot().packets)

    expect(story).toMatchObject({
      question: 'Can a gentler later burn send both discoveries?',
      calculation: '30 MB ÷ 1.2 MB/s = 25s · 1 second before contact closes',
    })
    expect(story.result).toContain('finishes transmitting at t+70s')
    expect(story.lesson).toContain('fuel that could return the probe')
  })

  it('explains why a compromise is worse than either viable future', () => {
    const control = createWorldlineControl()
    const simulation = control.simulate({
      burnAtProbeSecond: 35,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
      expectedOutcome: 'science_transmission',
    }, 0)
    const story = storyForSimulation(simulation, control.getSnapshot().packets)

    expect(story.question).toBe('Can one compromise save both?')
    expect(story.result).toMatch(/neither enough thrust.*nor a stable antenna lock/i)
    expect(story.lesson).toContain('everything is lost')
  })

  it('ties a recommendation to the recorded human priority', () => {
    const control = createWorldlineControl()
    control.setHumanPriority('Preserve observations that cannot be recreated.', 0)
    const escape = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 1)
    const science = control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 2)
    control.presentLearningCheckpoint(3)
    control.selectLearnerTransmissionEstimate(25, 4)
    control.selectLearnerPrediction('combination', 5)
    control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: ['gravity-map'], testRole: 'compromise' }, 6)
    control.simulate({ burnAtProbeSecond: 44, deltaVMetersPerSecond: 3400, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'counterexample' }, 7)
    control.presentChoices(escape.id, science.id, 8, { recommendedSimulationId: science.id, rationale: 'Exact agent wording.' }, 'correct', 'The constraints conflict.')
    const choices = control.getSnapshot().choices

    expect(choices).not.toBeNull()
    expect(recommendationStory(choices!, science)).toMatch(/you asked the agent to protect irreplaceable evidence/i)
  })

  it('formats only the elapsed mission time the simulation actually records', () => {
    expect(formatMissionClock(71)).toBe('00:01:11')
  })
})
