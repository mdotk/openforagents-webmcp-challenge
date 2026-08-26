import { describe, expect, it, vi } from 'vitest'
import { RevisionConflictError } from './mission-control'
import {
  createFittingRoomControl,
  FittingRoomStateError,
} from './fitting-room'

function buildFinalValidLook() {
  const control = createFittingRoomControl()
  control.updateFittingRoom(0, ['FV-101', 'FV-206', 'FV-304'], [])
  control.setHumanLock(1, 'FV-101', true)
  control.updateFittingRoom(2, ['FV-207', 'FV-408'], ['FV-206'])
  control.applyDemoInventoryUpdate(3)
  control.updateFittingRoom(4, ['FV-409'], ['FV-408'])
  return control
}

describe('createFittingRoomControl', () => {
  it('publishes immutable shopper and catalogue facts and searches structured fields', () => {
    const control = createFittingRoomControl()
    const initial = control.getSnapshot()

    expect(Object.isFrozen(initial)).toBe(true)
    expect(Object.isFrozen(initial.products)).toBe(true)
    expect(initial.products).toHaveLength(6)
    expect(initial.shopper.ownedItems).toEqual(['Black boots'])

    const matches = control.searchProducts({
      categories: ['layer'],
      colors: ['black'],
      styleTags: ['dramatic'],
      size: 'M',
      pickupOn: '2026-10-30',
      excludedContactZones: ['neck'],
      minimumMovement: 'high',
      limit: 12,
    })

    expect(matches.map(({ id }) => id)).toEqual(['FV-408', 'FV-409'])
    expect(control.getSnapshot().revision).toBe(0)
  })

  it('uses revisions and prevents the agent from removing a human-pinned item', () => {
    const control = createFittingRoomControl()
    const subscriber = vi.fn()
    control.subscribe(subscriber)

    const firstLook = control.updateFittingRoom(
      0,
      ['FV-101', 'FV-206', 'FV-304'],
      [],
    )
    expect(firstLook.subtotalCents).toBe(21000)
    expect(firstLook.validation.valid).toBe(true)

    const pinned = control.setHumanLock(1, 'FV-101', true)
    expect(pinned.humanLockedItemIds).toEqual(['FV-101'])
    expect(() =>
      control.updateFittingRoom(2, [], ['FV-101']),
    ).toThrow('pinned by the person')
    expect(() =>
      control.updateFittingRoom(1, ['FV-207'], []),
    ).toThrow(RevisionConflictError)
    expect(subscriber).toHaveBeenCalledTimes(2)
  })

  it('makes the inventory conflict explicit and accepts a valid substitute', () => {
    const control = createFittingRoomControl()
    control.updateFittingRoom(0, ['FV-101', 'FV-206', 'FV-304'], [])
    control.setHumanLock(1, 'FV-101', true)
    const revised = control.updateFittingRoom(
      2,
      ['FV-207', 'FV-408'],
      ['FV-206'],
    )

    expect(revised.subtotalCents).toBe(24800)
    expect(revised.validation.valid).toBe(true)

    const unavailable = control.applyDemoInventoryUpdate(3)
    expect(unavailable.availabilityRevision).toBe(2)
    expect(unavailable.validation.valid).toBe(false)
    expect(unavailable.validation.issues).toContainEqual(
      expect.objectContaining({
        code: 'PICKUP_UNAVAILABLE',
        itemId: 'FV-408',
      }),
    )
    expect(() =>
      control.requestReservationReview(4, 15, 'friday-16:00'),
    ).toThrow('cannot be reviewed')

    const substituted = control.updateFittingRoom(4, ['FV-409'], ['FV-408'])
    expect(substituted.subtotalCents).toBe(24200)
    expect(substituted.validation.valid).toBe(true)
  })

  it('creates an exact review and invalidates approval when the person changes scope', () => {
    const control = buildFinalValidLook()
    const reviewed = control.requestReservationReview(5, 15, 'friday-16:00')

    expect(reviewed.review).toMatchObject({
      id: 'review-001',
      status: 'pending',
      subtotalCents: 24200,
      chargedNowCents: 0,
    })
    expect(reviewed.activeGrant).toBeNull()
    expect(reviewed.reservation).toBeNull()

    const approved = control.approveReservationReview('review-001')
    expect(approved.activeGrant).toMatchObject({
      id: 'reservation-grant-001',
      usesRemaining: 1,
    })

    const changed = control.setHumanLock(7, 'FV-101', false)
    expect(changed.review?.status).toBe('invalidated')
    expect(changed.activeGrant).toBeNull()
    expect(changed.reservation).toBeNull()
  })

  it('creates exactly one simulated hold and rejects replay', () => {
    const control = buildFinalValidLook()
    control.requestReservationReview(5, 15, 'friday-16:00')
    const approved = control.approveReservationReview('review-001')
    const grantId = approved.activeGrant?.id ?? ''

    const held = control.reserveApprovedLook(grantId)

    expect(held.reservation).toMatchObject({
      id: 'FF-DEMO-001',
      subtotalCents: 24200,
      chargedCents: 0,
      authorityConsumed: true,
    })
    expect(held.activeGrant).toBeNull()
    expect(held.review?.status).toBe('consumed')
    expect(held.validation.valid).toBe(true)
    expect(
      held.products.find(({ id }) => id === 'FV-409')?.fridayQuantity,
    ).toBe(0)
    expect(() => control.reserveApprovedLook(grantId)).toThrow(
      FittingRoomStateError,
    )
    expect(() => control.updateFittingRoom(held.revision, [], ['FV-409'])).toThrow(
      'already held',
    )
  })

  it('supports human revocation and deterministic expiry without creating a hold', () => {
    const control = buildFinalValidLook()
    control.requestReservationReview(5, 15, 'friday-16:00')
    const approved = control.approveReservationReview('review-001')
    const grantId = approved.activeGrant?.id ?? ''

    const revoked = control.revokeReservationGrant(grantId)
    expect(revoked.review?.status).toBe('revoked')
    expect(revoked.activeGrant).toBeNull()
    expect(revoked.reservation).toBeNull()

    const second = createFittingRoomControl()
    second.updateFittingRoom(0, ['FV-101', 'FV-206', 'FV-304'], [])
    second.requestReservationReview(1, 15, 'friday-16:00')
    const secondApproved = second.approveReservationReview('review-001')
    const expired = second.expireReservationGrant(
      secondApproved.activeGrant?.id ?? '',
    )
    expect(expired.review?.status).toBe('expired')
    expect(expired.reservation).toBeNull()
  })
})
