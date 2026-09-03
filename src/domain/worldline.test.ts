import { describe, expect, it } from 'vitest'
import type { WorldlineControl } from '../types'
import { createWorldlineControl, MAX_WORLDLINE_SIMULATIONS, WorldlineStateError } from './worldline'

function prepareChoices(control: WorldlineControl) {
  const probeReturn = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 0)
  control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: ['gravity-map', 'horizon-spectrum'] }, 1)
  const scienceTransmission = control.simulate({
    burnAtProbeSecond: 46,
    deltaVMetersPerSecond: 2200,
    packetIds: ['gravity-map', 'horizon-spectrum'],
  }, 2)
  const review = control.presentChoices(probeReturn.id, scienceTransmission.id, 3)
  return { probeReturn, scienceTransmission, review }
}

describe('WORLDLINE mission control', () => {
  it('makes the probe and discovery outcomes mutually exclusive', () => {
    const control = createWorldlineControl()
    const escape = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 0)
    const discovery = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 1)

    expect(escape).toMatchObject({ outcome: 'probe_return', viable: true, probeSurvives: true, discoveryDelivered: false })
    expect(discovery).toMatchObject({
      outcome: 'science_transmission',
      viable: true,
      probeSurvives: false,
      discoveryDelivered: true,
      earthArrivalYears: 23,
      transmissionSeconds: 25,
      transmissionCompletesAtProbeSecond: 71,
    })
  })

  it('records whether evidence confirmed or revised the stated hypothesis', () => {
    const control = createWorldlineControl()
    const confirmed = control.simulate({
      burnAtProbeSecond: 40,
      deltaVMetersPerSecond: 3500,
      packetIds: [],
      hypothesis: 'An early high-energy burn may return the probe.',
      expectedOutcome: 'probe_return',
    }, 0)
    const revised = control.simulate({
      burnAtProbeSecond: 55,
      deltaVMetersPerSecond: 2600,
      packetIds: [],
      hypothesis: 'A late compromise may still return the probe.',
      expectedOutcome: 'probe_return',
    }, 1)

    expect(confirmed).toMatchObject({ expectationMatched: true, expectedOutcome: 'probe_return' })
    expect(revised).toMatchObject({ expectationMatched: false, expectedOutcome: 'probe_return', outcome: 'total_loss' })
  })

  it('returns actionable reasons when science cannot finish before contact ends', () => {
    const control = createWorldlineControl()
    const tooLate = control.simulate({
      burnAtProbeSecond: 50,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 0)

    expect(tooLate).toMatchObject({
      outcome: 'total_loss',
      transmissionCompletesAtProbeSecond: 75,
      failureReasons: expect.arrayContaining(['TRANSMISSION_EXCEEDS_CONTACT', 'BURN_AFTER_ESCAPE_CORRIDOR']),
    })
  })

  it('reuses exact duplicates without another revision while every call consumes the five-attempt budget', () => {
    const control = createWorldlineControl()
    const first = control.simulate({ burnAtProbeSecond: 35, deltaVMetersPerSecond: 2000, packetIds: [] }, 0)
    const duplicate = control.simulate({ burnAtProbeSecond: 35, deltaVMetersPerSecond: 2000, packetIds: [] }, 1)
    expect(duplicate.id).toBe(first.id)
    expect(control.getSnapshot()).toMatchObject({ revision: 1, simulationAttemptsUsed: 2, simulations: [{ id: first.id }] })

    for (let index = 1; index < MAX_WORLDLINE_SIMULATIONS - 1; index += 1) {
      control.simulate({ burnAtProbeSecond: 35 + index, deltaVMetersPerSecond: 1800, packetIds: [] }, index)
    }
    expect(control.getSnapshot()).toMatchObject({ revision: 4, simulationAttemptsUsed: 5 })
    expect(() => control.simulate({ burnAtProbeSecond: 58, deltaVMetersPerSecond: 3800, packetIds: [] }, 4))
      .toThrow('five-simulation investigation budget is exhausted')
    expect(control.getSnapshot()).toMatchObject({ revision: 4, simulationAttemptsUsed: 5 })
  })

  it('requires a failed control and both opposite viable outcomes before opening the human choice', () => {
    const control = createWorldlineControl()
    const escape = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 0)
    const discovery = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 1)
    expect(() => control.presentChoices(escape.id, discovery.id, 2)).toThrow('including one total-loss control')

    control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [] }, 2)
    const review = control.presentChoices(escape.id, discovery.id, 3)
    expect(control.getSnapshot()).toMatchObject({ phase: 'review', activeGrant: null, review: { id: review.id } })
    expect(() => control.executeAuthorizedBurn('burn-grant-01')).toThrow('one-use burn authority is not active')
    expect(() => control.approveBurnReview(review.id, 'worldline-03')).toThrow('two exact worldlines')
  })

  it('preserves the human priority and requires a recommendation among the displayed futures', () => {
    const control = createWorldlineControl()
    control.setHumanPriority('Preserve irreplaceable science.', 0)
    const probeReturn = control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 1)
    control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [] }, 2)
    const science = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 3)

    expect(() => control.presentChoices(probeReturn.id, science.id, 4, {
      recommendedSimulationId: 'worldline-does-not-exist',
      rationale: 'The packets cannot be recreated.',
    })).toThrow('displayed futures')

    control.presentChoices(probeReturn.id, science.id, 4, {
      recommendedSimulationId: science.id,
      rationale: 'Both unique packets fit inside the remaining contact window.',
    })
    expect(control.getSnapshot().choices).toMatchObject({
      recommendedSimulationId: science.id,
      priority: 'Preserve irreplaceable science.',
      rationale: 'Both unique packets fit inside the remaining contact window.',
    })
  })

  it('closes simulation as soon as all three required outcomes exist', () => {
    const control = createWorldlineControl()
    control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 0)
    control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [] }, 1)
    control.simulate({ burnAtProbeSecond: 46, deltaVMetersPerSecond: 2200, packetIds: ['gravity-map', 'horizon-spectrum'] }, 2)
    expect(() => control.simulate({ burnAtProbeSecond: 38, deltaVMetersPerSecond: 2400, packetIds: [] }, 3))
      .toThrow('investigation is complete')
    expect(control.getSnapshot()).toMatchObject({ revision: 3, simulationAttemptsUsed: 3 })
  })

  it('executes only the science future selected by the person and rejects replay', () => {
    const control = createWorldlineControl()
    const { scienceTransmission, review } = prepareChoices(control)
    const grant = control.approveBurnReview(review.id, scienceTransmission.id)
    const receipt = control.executeAuthorizedBurn(grant.id)

    expect(receipt).toMatchObject({ simulationId: scienceTransmission.id, verified: true, earthArrivalYears: 23, probeElapsedSeconds: 557 })
    expect(receipt.packetIds).toEqual(['gravity-map', 'horizon-spectrum'])
    expect(control.getSnapshot()).toMatchObject({
      phase: 'executed',
      activeGrant: null,
      contactSecondsRemaining: 0,
      fuelKilograms: 5,
      review: { status: 'consumed' },
    })
    expect(() => control.executeAuthorizedBurn(grant.id)).toThrow('one-use burn authority is not active')
  })

  it('executes the probe-return future selected by the person without inventing a transmission', () => {
    const control = createWorldlineControl()
    const { probeReturn, review } = prepareChoices(control)
    const grant = control.approveBurnReview(review.id, probeReturn.id)
    const receipt = control.executeAuthorizedBurn(grant.id)

    expect(receipt).toMatchObject({ simulationId: probeReturn.id, packetIds: [], earthArrivalYears: 0 })
    expect(receipt.summary).toBe('The probe escaped. The unique observation did not reach Earth.')
    expect(control.getSnapshot()).toMatchObject({ earthElapsedSeconds: 0, fuelKilograms: 0 })
  })

  it('still rejects stale revisions', () => {
    const control = createWorldlineControl()
    control.simulate({ burnAtProbeSecond: 40, deltaVMetersPerSecond: 3500, packetIds: [] }, 0)
    expect(() => control.simulate({ burnAtProbeSecond: 55, deltaVMetersPerSecond: 2600, packetIds: [] }, 0))
      .toThrow(WorldlineStateError)
  })
})
