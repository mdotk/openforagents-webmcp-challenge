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
      question: 'Can a later, gentler burn send both files?',
      calculation: '30 MB ÷ 1.2 MB/s = 25s · finished 1 second before final contact',
    })
    expect(story.result).toContain('finishes sending at t+70s')
    expect(story.lesson).toContain('powerful burn it needs to escape')
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

    expect(story.question).toBe('Can one middle option save both?')
    expect(story.result).toMatch(/too weak for escape.*does not keep the antenna pointed at Earth/i)
    expect(story.lesson).toContain('loses the probe and the files')
  })

  it('ties a recommendation to the recorded human priority', () => {
    const control = createWorldlineControl()
    control.setHumanPriority('Send the gravity map and light spectrum to Earth.', 0)
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
    expect(recommendationStory(choices!, science)).toMatch(/you asked the agent to send the two files that Earth does not have/i)
  })

  it('formats only the elapsed mission time the simulation actually records', () => {
    expect(formatMissionClock(71)).toBe('00:01:11')
  })
})
