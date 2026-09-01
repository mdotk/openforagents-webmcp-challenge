import { describe, expect, it, vi } from 'vitest'
import { createShoppingControl, shoppingCatalogue } from './shopping'

const firstLook = [
  'variant-midnight-column-dress-m',
  'variant-silver-cropped-blazer-m',
  'variant-graphite-frame-bag-one',
  'variant-silver-chain-belt-one',
] as const

const hotelLook = [
  'variant-midnight-column-dress-m',
  'variant-ink-sculpted-jacket-m',
  'variant-ink-slim-clutch-one',
  'variant-silver-chain-belt-one',
] as const

function expectSuccess<T>(result: { ok: boolean; data?: T }): T {
  expect(result.ok).toBe(true)
  if (!result.ok || result.data === undefined) throw new Error('Expected success')
  return result.data
}

function hotelReadyControl() {
  const control = createShoppingControl({ now: () => new Date('2026-09-01T10:00:00.000Z') })
  expectSuccess(control.updateSharedLook(0, firstLook, []))
  control.setDestination('event-hotel')
  expectSuccess(
    control.updateSharedLook(
      2,
      ['variant-ink-sculpted-jacket-m', 'variant-ink-slim-clutch-one'],
      ['variant-silver-cropped-blazer-m', 'variant-graphite-frame-bag-one'],
    ),
  )
  return control
}

describe('Adaptive Shopping Canvas domain', () => {
  it('publishes twelve exact product styles and thirty canonical variants', () => {
    const control = createShoppingControl()
    const snapshot = control.getSnapshot()

    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(snapshot.products).toHaveLength(12)
    expect(shoppingCatalogue.flatMap((product) => product.variants)).toHaveLength(30)
    expect(snapshot.context).toMatchObject({
      clothingSize: 'M',
      budgetCents: 35000,
      destinationId: 'home',
      ownedItems: [{ id: 'owned-blue-boots' }],
    })
    expect(snapshot.cart).toEqual({ lines: [], subtotalCents: 0, chargedCents: 0 })

    const layers = control.searchProducts({
      slots: ['layer'],
      styleTags: ['sharp'],
      sizes: ['M'],
      maxItemPriceCents: 12000,
      limit: 12,
    })
    expect(layers.matches.map((product) => product.id)).toEqual([
      'product-silver-cropped-blazer',
      'product-ink-sculpted-jacket',
    ])
    expect(control.getSnapshot().revision).toBe(0)
  })

  it('builds the first valid $343 look without touching the cart', () => {
    const control = createShoppingControl()
    const subscriber = vi.fn()
    control.subscribe(subscriber)

    const updated = expectSuccess(control.updateSharedLook(0, firstLook, []))

    expect(updated).toMatchObject({
      revision: 1,
      lookRevision: 1,
      validation: { valid: true, subtotalCents: 34300 },
      cart: { lines: [], subtotalCents: 0, chargedCents: 0 },
    })
    expect(subscriber).toHaveBeenCalledTimes(1)

    const stale = control.updateSharedLook(0, [], ['variant-graphite-frame-bag-one'])
    expect(stale).toMatchObject({
      ok: false,
      stateChanged: false,
      error: { code: 'STALE_REVISION' },
      revisions: { revision: 1 },
    })
    expect(control.getSnapshot().revision).toBe(1)
  })

  it('makes the destination failure explicit and supports a coordinated $345 replan', () => {
    const control = createShoppingControl()
    expectSuccess(control.updateSharedLook(0, firstLook, []))

    const home = control.checkFulfilment(firstLook, 'home', '2026-09-04')
    const homeQuotes = expectSuccess(home)
    expect(homeQuotes.quotes).toHaveLength(4)
    expect(control.getSnapshot().revision).toBe(1)

    const changed = control.setDestination('event-hotel')
    expect(changed).toMatchObject({
      revision: 2,
      context: { destinationId: 'event-hotel' },
      shopperContextRevision: 2,
      fulfilmentContextRevision: 2,
    })

    const failed = control.checkFulfilment(
      ['variant-silver-cropped-blazer-m'],
      'event-hotel',
      '2026-09-04',
    )
    expect(failed).toMatchObject({
      ok: false,
      stateChanged: false,
      error: {
        code: 'DELIVERY_CHANGED',
        details: {
          variantId: 'variant-silver-cropped-blazer-m',
          previous: { destinationId: 'home', arrivesOn: '2026-09-04' },
          current: { destinationId: 'event-hotel', arrivesOn: '2026-09-07' },
          neededBy: '2026-09-04',
        },
      },
      revisions: { revision: 2 },
    })
    expect(control.getSnapshot().revision).toBe(2)

    const repaired = expectSuccess(
      control.updateSharedLook(
        2,
        ['variant-ink-sculpted-jacket-m', 'variant-ink-slim-clutch-one'],
        ['variant-silver-cropped-blazer-m', 'variant-graphite-frame-bag-one'],
      ),
    )
    expect(repaired).toMatchObject({
      revision: 3,
      lookRevision: 2,
      lookVariantIds: hotelLook,
      validation: { valid: true, subtotalCents: 34500 },
      cart: { lines: [] },
    })
    expectSuccess(control.checkFulfilment(hotelLook, 'event-hotel', '2026-09-04'))
  })

  it('requires fresh delivery quotes and creates an immutable review without cart mutation', () => {
    const control = hotelReadyControl()
    const fulfilment = expectSuccess(
      control.checkFulfilment(hotelLook, 'event-hotel', '2026-09-04'),
    )
    const snapshot = control.getSnapshot()

    const missing = control.requestCartReview({
      expectedRevision: snapshot.revision,
      lookRevision: snapshot.lookRevision,
      cartRevision: snapshot.cartRevision,
      quoteIds: fulfilment.quotes.slice(0, 3).map((quote) => quote.quoteId),
      summary: 'A hotel-ready look around the owned blue boots.',
      rationales: [{ variantId: hotelLook[1], reason: 'Restores Friday delivery.' }],
    })
    expect(missing).toMatchObject({ ok: false, error: { code: 'MISSING_FULFILMENT_QUOTE' } })
    expect(control.getSnapshot().revision).toBe(3)

    const reviewed = expectSuccess(
      control.requestCartReview({
        expectedRevision: snapshot.revision,
        lookRevision: snapshot.lookRevision,
        cartRevision: snapshot.cartRevision,
        quoteIds: fulfilment.quotes.map((quote) => quote.quoteId),
        summary: 'A hotel-ready look around the owned blue boots.',
        rationales: [
          { variantId: hotelLook[0], reason: 'Keeps the sharp evening silhouette.' },
          { variantId: hotelLook[1], reason: 'Restores Friday delivery.' },
          { variantId: hotelLook[2], reason: 'Offsets the jacket increase.' },
          { variantId: hotelLook[3], reason: 'Connects the blue boots to the look.' },
        ],
      }),
    )

    expect(reviewed).toMatchObject({
      revision: 4,
      cart: { lines: [], subtotalCents: 0 },
      review: {
        id: 'cart-review-001',
        status: 'pending',
        requiresHumanApproval: true,
        cartChanged: false,
        chargedCents: 0,
        proposedCart: { subtotalCents: 34500 },
        patch: { add: expect.arrayContaining([expect.objectContaining({ variantId: hotelLook[1] })]), remove: [] },
      },
      activeGrant: null,
    })
    expect(Object.isFrozen(reviewed.review)).toBe(true)
  })

  it('applies the exact approved cart once and rejects replay', () => {
    const control = hotelReadyControl()
    const snapshot = control.getSnapshot()
    const fulfilment = expectSuccess(control.checkFulfilment(hotelLook, 'event-hotel', '2026-09-04'))
    const reviewed = expectSuccess(control.requestCartReview({
      expectedRevision: snapshot.revision,
      lookRevision: snapshot.lookRevision,
      cartRevision: snapshot.cartRevision,
      quoteIds: fulfilment.quotes.map((quote) => quote.quoteId),
      summary: 'Hotel-ready and still under budget.',
      rationales: hotelLook.map((variantId) => ({ variantId, reason: 'Fits the confirmed look and delivery constraints.' })),
    }))
    const approved = control.approveCartReview(reviewed.review?.id ?? '')
    const grantId = approved.activeGrant?.id ?? ''

    expect(approved).toMatchObject({
      revision: 5,
      review: { status: 'approved' },
      activeGrant: { id: 'cart-grant-001', usesRemaining: 1, expiresAt: '2026-09-01T10:05:00.000Z' },
      cart: { lines: [] },
    })

    const applied = expectSuccess(control.applyApprovedCart(grantId))
    expect(applied).toMatchObject({
      revision: 6,
      cartRevision: 1,
      cart: { subtotalCents: 34500, chargedCents: 0 },
      review: { status: 'consumed', cartChanged: true },
      activeGrant: null,
    })
    expect(applied.cart.lines.map((line) => line.variantId)).toEqual(hotelLook)

    const replay = control.applyApprovedCart(grantId)
    expect(replay).toMatchObject({ ok: false, stateChanged: false, error: { code: 'GRANT_INVALID' }, revisions: { revision: 6, cartRevision: 1 } })
    expect(control.getSnapshot().cart.lines).toHaveLength(4)
  })

  it('invalidates authority on scope change and supports revocation and expiry', () => {
    const clock = { now: () => new Date('2026-09-01T10:00:00.000Z') }
    const control = createShoppingControl(clock)
    expectSuccess(control.updateSharedLook(0, firstLook, []))
    const quotes = expectSuccess(control.checkFulfilment(firstLook, 'home', '2026-09-04')).quotes
    expectSuccess(control.requestCartReview({
      expectedRevision: 1,
      lookRevision: 1,
      cartRevision: 0,
      quoteIds: quotes.map((quote) => quote.quoteId),
      summary: 'The first complete look.',
      rationales: firstLook.map((variantId) => ({ variantId, reason: 'Matches the confirmed brief.' })),
    }))
    const approved = control.approveCartReview('cart-review-001')
    const invalidated = control.setDestination('event-hotel')
    expect(invalidated).toMatchObject({ review: { status: 'invalidated' }, activeGrant: null, cart: { lines: [] } })
    expect(control.applyApprovedCart(approved.activeGrant?.id ?? '')).toMatchObject({ ok: false, error: { code: 'GRANT_INVALID' } })

    const revokedControl = createShoppingControl(clock)
    expectSuccess(revokedControl.updateSharedLook(0, firstLook, []))
    const revokedQuotes = expectSuccess(revokedControl.checkFulfilment(firstLook, 'home', '2026-09-04')).quotes
    expectSuccess(revokedControl.requestCartReview({ expectedRevision: 1, lookRevision: 1, cartRevision: 0, quoteIds: revokedQuotes.map((quote) => quote.quoteId), summary: 'Ready to review.', rationales: firstLook.map((variantId) => ({ variantId, reason: 'Matches the brief.' })) }))
    const grant = revokedControl.approveCartReview('cart-review-001').activeGrant!
    const revoked = revokedControl.revokeCartGrant(grant.id)
    expect(revoked).toMatchObject({ review: { status: 'revoked' }, activeGrant: null, cart: { lines: [] } })

    let now = new Date('2026-09-01T10:00:00.000Z')
    const expiredControl = createShoppingControl({ now: () => now })
    expectSuccess(expiredControl.updateSharedLook(0, firstLook, []))
    const expiredQuotes = expectSuccess(expiredControl.checkFulfilment(firstLook, 'home', '2026-09-04')).quotes
    expectSuccess(expiredControl.requestCartReview({ expectedRevision: 1, lookRevision: 1, cartRevision: 0, quoteIds: expiredQuotes.map((quote) => quote.quoteId), summary: 'Ready to review.', rationales: firstLook.map((variantId) => ({ variantId, reason: 'Matches the brief.' })) }))
    const expiringGrant = expiredControl.approveCartReview('cart-review-001').activeGrant!
    now = new Date('2026-09-01T10:06:00.000Z')
    const expired = expiredControl.applyApprovedCart(expiringGrant.id)
    expect(expired).toMatchObject({ ok: false, stateChanged: false, error: { code: 'GRANT_EXPIRED' } })
    expect(expiredControl.getSnapshot().cart.lines).toEqual([])
  })
})
