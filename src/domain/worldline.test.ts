import { describe, expect, it } from 'vitest'
import { createWorldlineControl, WorldlineStateError } from './worldline'

describe('WORLDLINE mission control', () => {
  it('makes the probe and discovery outcomes mutually exclusive', () => {
    const control = createWorldlineControl()
    const escape = control.simulate({
      burnAtProbeSecond: 40,
      deltaVMetersPerSecond: 3500,
      packetIds: [],
    }, 0)
    const discovery = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 1)

    expect(escape).toMatchObject({ viable: true, probeSurvives: true, discoveryDelivered: false })
    expect(discovery).toMatchObject({
      viable: true,
      probeSurvives: false,
      discoveryDelivered: true,
      earthArrivalYears: 23,
      transmissionSeconds: 25,
    })
    expect(discovery.packetIds).toEqual(['gravity-map', 'horizon-spectrum'])
    expect(discovery.burnAtProbeSecond + discovery.transmissionSeconds).toBe(71)
  })

  it('rejects a science path that cannot finish before contact ends', () => {
    const control = createWorldlineControl()
    const tooLate = control.simulate({
      burnAtProbeSecond: 50,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 0)

    expect(tooLate).toMatchObject({ viable: false, discoveryDelivered: false, transmissionSeconds: 25 })
  })

  it('requires a fresh revision, viable plan and explicit person approval', () => {
    const control = createWorldlineControl()
    const discovery = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 0)

    expect(() => control.simulate({
      burnAtProbeSecond: 40,
      deltaVMetersPerSecond: 3500,
      packetIds: [],
    }, 0)).toThrow(WorldlineStateError)

    const plan = control.updatePlan(discovery.id, 'Send the discovery home', 'The unique packets fit the final window.', 1)
    const review = control.requestBurnReview(plan.id, 2)
    expect(control.getSnapshot()).toMatchObject({ phase: 'review', activeGrant: null })
    expect(() => control.executeAuthorizedBurn('burn-grant-01')).toThrow('one-use burn authority is not active')

    const grant = control.approveBurnReview(review.id)
    expect(control.getSnapshot()).toMatchObject({ phase: 'authorized', activeGrant: { id: grant.id } })
  })

  it('executes the immutable burn once and produces a verified receipt', () => {
    const control = createWorldlineControl()
    const simulation = control.simulate({
      burnAtProbeSecond: 46,
      deltaVMetersPerSecond: 2200,
      packetIds: ['gravity-map', 'horizon-spectrum'],
    }, 0)
    const plan = control.updatePlan(simulation.id, 'Send the discovery home', 'Preserve the only unique observation.', 1)
    const review = control.requestBurnReview(plan.id, 2)
    const grant = control.approveBurnReview(review.id)
    const receipt = control.executeAuthorizedBurn(grant.id)

    expect(receipt).toMatchObject({ verified: true, earthArrivalYears: 23, probeElapsedSeconds: 557 })
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

  it('reports an approved probe-recovery outcome without inventing a transmission', () => {
    const control = createWorldlineControl()
    const simulation = control.simulate({
      burnAtProbeSecond: 40,
      deltaVMetersPerSecond: 3500,
      packetIds: [],
    }, 0)
    const plan = control.updatePlan(simulation.id, 'Bring the probe home', 'Preserve the spacecraft and its future missions.', 1)
    const review = control.requestBurnReview(plan.id, 2)
    const grant = control.approveBurnReview(review.id)
    const receipt = control.executeAuthorizedBurn(grant.id)

    expect(receipt).toMatchObject({ packetIds: [], earthArrivalYears: 0 })
    expect(receipt.summary).toBe('The probe escaped. The unique observation did not reach Earth.')
    expect(control.getSnapshot()).toMatchObject({ earthElapsedSeconds: 0, fuelKilograms: 0 })
  })
})
