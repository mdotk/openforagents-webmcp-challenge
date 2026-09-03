import { describe, expect, it } from 'vitest'
import type { WorldlineControl } from '../types'
import { createWorldlineControl, MAX_WORLDLINE_SIMULATIONS, WorldlineStateError } from './worldline'

function prepareChoices(control: WorldlineControl) {
  const probeReturn = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
  const scienceTransmission = control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
  control.presentLearningCheckpoint(2)
  control.selectLearnerTransmissionEstimate(25, 3)
  control.selectLearnerPrediction('combination', 4)
  control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'compromise' }, 5)
  control.simulate({ burnAtProbeSecond: 44, deltaVMetersPerSecond: 3400, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'counterexample' }, 6)
  const review = control.presentChoices(probeReturn.id, scienceTransmission.id, 7, {
    recommendedSimulationId: scienceTransmission.id,
    rationale: 'Both files fit inside the remaining contact time.',
  }, 'correct', 'The tests show that timing, thrust and antenna direction conflict; changing only one does not save both.')
  return { probeReturn, scienceTransmission, review }
}

describe('WORLDLINE mission control', () => {
  it('makes the probe and discovery outcomes mutually exclusive', () => {
    const control = createWorldlineControl()
    const escape = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    const discovery = control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
    expect(escape).toMatchObject({ outcome: 'probe_return', probeSurvives: true, discoveryDelivered: false })
    expect(discovery).toMatchObject({ outcome: 'science_transmission', probeSurvives: false, discoveryDelivered: true, earthArrivalYears: 23, transmissionSeconds: 25, transmissionCompletesAtProbeSecond: 71 })
  })

  it('pauses after the two extremes and requires a learner calculation and prediction', () => {
    const control = createWorldlineControl()
    control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
    expect(() => control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: [], testRole: 'extreme' }, 2)).toThrow('Present the learning checkpoint')
    const checkpoint = control.presentLearningCheckpoint(2)
    expect(control.getSnapshot()).toMatchObject({ phase: 'prediction', learningCheckpoint: { id: checkpoint.id, status: 'waiting' } })
    expect(() => control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: [], testRole: 'compromise' }, 3)).toThrow('paused')
    expect(() => control.selectLearnerPrediction('combination', 3)).toThrow('Calculate the transmission time')
    const calculation = control.selectLearnerTransmissionEstimate(25, 3)
    expect(calculation).toEqual({ selectedSeconds: 25, correctSeconds: 25, correct: true })
    const prediction = control.selectLearnerPrediction('combination', 4)
    expect(control.getSnapshot()).toMatchObject({ phase: 'investigating_prediction', learnerPrediction: { id: prediction.id, selectedAfterSimulationCount: 2 } })
  })

  it('teaches the correct transmission arithmetic even after a wrong estimate', () => {
    const control = createWorldlineControl()
    control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
    control.presentLearningCheckpoint(2)
    expect(control.selectLearnerTransmissionEstimate(12, 3)).toEqual({ selectedSeconds: 12, correctSeconds: 25, correct: false })
    expect(control.getSnapshot()).toMatchObject({ phase: 'prediction', learnerCalculation: { correctSeconds: 25, correct: false } })
  })

  it('requires both post-prediction tests and carries the teaching into the choice', () => {
    const control = createWorldlineControl()
    const escape = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    const science = control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
    control.presentLearningCheckpoint(2)
    control.selectLearnerTransmissionEstimate(25, 3)
    control.selectLearnerPrediction('antenna', 4)
    control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: ['gravity-map'], testRole: 'compromise' }, 5)
    expect(() => control.presentChoices(escape.id, science.id, 6, { recommendedSimulationId: science.id, rationale: 'Earth needs the two files.' }, 'partly_correct', 'The antenna matters, alongside timing and thrust.')).toThrow('designed to prove their answer wrong')
    control.simulate({ burnAtProbeSecond: 44, deltaVMetersPerSecond: 3400, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'counterexample' }, 6)
    control.presentChoices(escape.id, science.id, 7, { recommendedSimulationId: science.id, rationale: 'Earth needs the two files.' }, 'partly_correct', 'The antenna matters, but the timing and thrust requirements also fail to overlap.')
    expect(control.getSnapshot().choices).toMatchObject({ predictionAssessment: 'partly_correct', teachingExplanation: expect.stringContaining('timing and thrust') })
  })

  it('does not let the agent contradict the learner’s recorded priority', () => {
    const control = createWorldlineControl()
    const probe = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    const science = control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 1)
    control.presentLearningCheckpoint(2)
    control.selectLearnerTransmissionEstimate(25, 3)
    control.selectLearnerPrediction('combination', 4)
    control.simulate({ burnAtProbeSecond: 43, deltaVMetersPerSecond: 2800, packetIds: ['gravity-map'], testRole: 'compromise' }, 5)
    control.simulate({ burnAtProbeSecond: 44, deltaVMetersPerSecond: 3400, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'counterexample' }, 6)

    expect(() => control.presentChoices(probe.id, science.id, 7, {
      recommendedSimulationId: probe.id,
      rationale: 'Ignore the stated priority.',
    }, 'correct', 'The safe regions do not overlap.')).toThrow('recorded priority')
  })

  it('records whether evidence confirmed or revised a hypothesis', () => {
    const control = createWorldlineControl()
    const confirmed = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], hypothesis: 'An early, powerful burn may let the probe escape.', expectedOutcome: 'probe_return', testRole: 'extreme' }, 0)
    const revised = control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [], hypothesis: 'A late burn may send the science.', expectedOutcome: 'science_transmission', testRole: 'extreme' }, 1)
    expect(confirmed.expectationMatched).toBe(true)
    expect(revised).toMatchObject({ expectationMatched: false, outcome: 'total_loss' })
  })

  it('returns actionable reasons when science cannot finish before contact ends', () => {
    const control = createWorldlineControl()
    const result = control.simulate({ burnAtProbeSecond: 50, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'], testRole: 'extreme' }, 0)
    expect(result).toMatchObject({ outcome: 'total_loss', transmissionCompletesAtProbeSecond: 75, failureReasons: expect.arrayContaining(['TRANSMISSION_EXCEEDS_CONTACT', 'BURN_AFTER_ESCAPE_CORRIDOR']) })
  })

  it('enforces the five-attempt budget', () => {
    const control = createWorldlineControl()
    for (let index = 0; index < MAX_WORLDLINE_SIMULATIONS; index += 1) {
      control.simulate({ burnAtProbeSecond: 34 + index, deltaVMetersPerSecond: 1800, packetIds: [], testRole: 'extreme' }, index)
    }
    expect(control.getSnapshot()).toMatchObject({ revision: 5, simulationAttemptsUsed: 5 })
    expect(() => control.simulate({ burnAtProbeSecond: 58, deltaVMetersPerSecond: 3800, packetIds: [], testRole: 'extreme' }, 5)).toThrow('budget is exhausted')
  })

  it('executes only the science future selected by the person and rejects replay', () => {
    const control = createWorldlineControl()
    const { scienceTransmission, review } = prepareChoices(control)
    const grant = control.approveBurnReview(review.id, scienceTransmission.id)
    const receipt = control.executeAuthorizedBurn(grant.id)
    expect(receipt).toMatchObject({ simulationId: scienceTransmission.id, verified: true, earthArrivalYears: 23, probeElapsedSeconds: 71 })
    expect(control.getSnapshot()).toMatchObject({ phase: 'executed', activeGrant: null, contactSecondsRemaining: 0, review: { status: 'consumed' } })
    expect(() => control.executeAuthorizedBurn(grant.id)).toThrow('There is no approved burn ready to run')
  })

  it('executes the probe-return future without inventing a transmission', () => {
    const control = createWorldlineControl()
    const { probeReturn, review } = prepareChoices(control)
    const receipt = control.executeAuthorizedBurn(control.approveBurnReview(review.id, probeReturn.id).id)
    expect(receipt).toMatchObject({ simulationId: probeReturn.id, packetIds: [], earthArrivalYears: 0 })
    expect(control.getSnapshot()).toMatchObject({ earthElapsedSeconds: 0, fuelKilograms: 0 })
  })

  it('still rejects stale revisions', () => {
    const control = createWorldlineControl()
    control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [], testRole: 'extreme' }, 0)
    expect(() => control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [], testRole: 'extreme' }, 0)).toThrow(WorldlineStateError)
  })
})
