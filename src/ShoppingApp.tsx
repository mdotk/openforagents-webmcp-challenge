import {
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  ShoppingBagOpen,
  Sparkle,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createShoppingControl } from './domain'
import type {
  FulfilmentQuote,
  ShoppingSnapshot,
  ShoppingToolsRegistration,
} from './types'
import {
  APPLY_APPROVED_CART_TOOL_NAME,
  permanentShoppingToolNames,
  registerShoppingTools,
} from './webmcp'
import './ShoppingApp.css'

const firstLook = [
  'variant-midnight-column-dress-m',
  'variant-silver-cropped-blazer-m',
  'variant-graphite-frame-bag-one',
  'variant-silver-chain-belt-one',
] as const

const hotelReplacements = [
  'variant-ink-sculpted-jacket-m',
  'variant-ink-slim-clutch-one',
] as const

const replacedHomeItems = [
  'variant-silver-cropped-blazer-m',
  'variant-graphite-frame-bag-one',
] as const

const tighterBudgetFirstLook = [
  'variant-ink-satin-jumpsuit-m',
  'variant-silver-cropped-blazer-m',
  'variant-ink-slim-clutch-one',
  'variant-architectural-earrings-one',
] as const

const tighterBudgetHotelReplacements = [
  'variant-ink-sculpted-jacket-m',
  'variant-oxblood-silk-scarf-one',
] as const

const tighterBudgetReplacedHomeItems = [
  'variant-silver-cropped-blazer-m',
  'variant-architectural-earrings-one',
] as const

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function shortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function productForVariant(snapshot: ShoppingSnapshot, variantId: string) {
  return snapshot.products.find((product) =>
    product.variants.some((variant) => variant.id === variantId),
  )
}

function variantFor(snapshot: ShoppingSnapshot, variantId: string) {
  const product = productForVariant(snapshot, variantId)
  const variant = product?.variants.find((candidate) => candidate.id === variantId)
  return product && variant ? { product, variant } : null
}

function stageFor(snapshot: ShoppingSnapshot) {
  if (snapshot.cart.lines.length) return 'cart'
  if (snapshot.activeGrant) return 'approved'
  if (snapshot.review?.status === 'pending') return 'review'
  if (snapshot.lookVariantIds.includes('variant-ink-sculpted-jacket-m')) return 'repaired'
  if (
    snapshot.context.destinationId === 'event-hotel' &&
    snapshot.lookVariantIds.includes('variant-silver-cropped-blazer-m')
  ) return 'conflict'
  if (snapshot.lookVariantIds.length) return 'first-look'
  return 'brief'
}

function initialBudgetForLocation() {
  if (typeof window === 'undefined') return 35000
  return new URLSearchParams(window.location.search).get('scenario') === 'tighter-budget'
    ? 32500
    : 35000
}

function ShoppingApp() {
  const [initialBudgetCents] = useState(initialBudgetForLocation)
  const [control, setControl] = useState(() => createShoppingControl({ now: () => new Date(), budgetCents: initialBudgetCents }))
  const subscribe = useCallback(
    (onStoreChange: () => void) => control.subscribe(() => onStoreChange()),
    [control],
  )
  const getSnapshot = useCallback(() => control.getSnapshot(), [control])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [registration, setRegistration] = useState<ShoppingToolsRegistration | null>(null)
  const [registeredToolNames, setRegisteredToolNames] = useState<readonly string[]>([])
  const [registrationPending, setRegistrationPending] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [guidedDemo, setGuidedDemo] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Morrow — Adaptive Shopping Canvas'
    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let active: ShoppingToolsRegistration | null = null
    void registerShoppingTools(control)
      .then(async (next) => {
        active = next
        if (cancelled) {
          await next.dispose()
          return
        }
        setRegistration(next)
        setRegisteredToolNames(await next.getRegisteredToolNames())
        setRegistrationPending(false)
      })
      .catch(() => {
        if (cancelled) return
        setRegistrationPending(false)
        setActionError('Native browser tools did not finish loading. The visible demo controls still work.')
      })
    return () => {
      cancelled = true
      if (active) void active.dispose()
    }
  }, [control])

  useEffect(() => {
    if (!registration) return
    let cancelled = false
    void registration.whenIdle().then(async () => {
      const names = await registration.getRegisteredToolNames()
      if (!cancelled) setRegisteredToolNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [registration, snapshot.revision])

  const act = useCallback((action: () => unknown) => {
    try {
      action()
      setActionError(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'That action could not run.')
    }
  }, [])

  const selected = useMemo(
    () => snapshot.lookVariantIds.map((id) => variantFor(snapshot, id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [snapshot],
  )
  const selectedBySlot = useMemo(
    () => Object.fromEntries(selected.map((item) => [item.product.slot, item])) as Partial<Record<'base' | 'layer' | 'bag' | 'accent', (typeof selected)[number]>>,
    [selected],
  )
  const deliveryByVariant = useMemo(() => Object.fromEntries(
    snapshot.lookVariantIds.map((variantId) => {
      const result = control.checkFulfilment(
        [variantId],
        snapshot.context.destinationId,
        snapshot.context.neededBy,
      )
      if (result.ok) return [variantId, result.data.quotes[0]?.arrivesOn]
      const current = result.error.details?.current
      const arrivesOn = current && typeof current === 'object' && 'arrivesOn' in current
        ? String(current.arrivesOn)
        : undefined
      return [variantId, arrivesOn]
    }),
  ) as Readonly<Record<string, string | undefined>>, [control, snapshot.context.destinationId, snapshot.context.neededBy, snapshot.lookVariantIds])
  const stage = stageFor(snapshot)
  const isTighterBudget = initialBudgetCents === 32500
  const isLate = stage === 'conflict'
  const isRepaired = ['repaired', 'review', 'approved', 'cart'].includes(stage)
  const registrationError = registration?.getLastError() ?? null
  const nativeAvailable = Boolean(registration?.supported && !registrationError)
  const nativeStatus = registrationPending
    ? 'Checking this browser…'
    : registrationError
      ? 'Tool registration needs attention'
      : registration?.supported
        ? `${registeredToolNames.length} native tools live`
        : `${permanentShoppingToolNames.length} modeled tools · native unavailable`
  const compactNativeStatus = registrationPending
    ? 'Checking…'
    : registrationError
      ? 'Tools need attention'
      : registration?.supported
        ? `${registeredToolNames.length} tools live`
        : 'Native unavailable'

  const requestReview = () => {
    const fulfilment = control.checkFulfilment(
      snapshot.lookVariantIds,
      snapshot.context.destinationId,
      snapshot.context.neededBy,
    )
    if (!fulfilment.ok) {
      setActionError(fulfilment.error.message)
      return
    }
    const quotes: readonly FulfilmentQuote[] = fulfilment.data.quotes
    const result = control.requestCartReview({
      expectedRevision: snapshot.revision,
      lookRevision: snapshot.lookRevision,
      cartRevision: snapshot.cartRevision,
      quoteIds: quotes.map((quote) => quote.quoteId),
      summary: 'A hotel-ready evening look around the owned cobalt boots, repaired to stay under budget.',
      rationales: snapshot.lookVariantIds.map((variantId) => ({
        variantId,
        reason:
          variantId === 'variant-ink-sculpted-jacket-m'
            ? 'Restores Friday delivery to the event hotel.'
            : variantId === 'variant-ink-slim-clutch-one'
              ? 'Offsets the jacket increase and keeps the total under $350.'
              : 'Preserves the sharp evening direction around the owned boots.',
      })),
    })
    if (!result.ok) setActionError(result.error.message)
    else setActionError(null)
  }

  const reset = () => {
    void registration?.dispose()
    setControl(createShoppingControl({ now: () => new Date(), budgetCents: initialBudgetCents }))
    setRegistration(null)
    setRegisteredToolNames([])
    setRegistrationPending(true)
    setActionError(null)
    setGuidedDemo(false)
  }

  const startGuidedDemo = () => {
    setGuidedDemo(true)
    act(() => control.updateSharedLook(snapshot.revision, isTighterBudget ? tighterBudgetFirstLook : firstLook, []))
  }

  return (
    <div className="shopping-canvas">
      <header className="shopping-canvas__header">
        <a className="shopping-canvas__brand" href="/" aria-label="Morrow fictional retailer demo home">
          <span>M</span>
          <strong>Morrow</strong>
        </a>
        <div className="shopping-canvas__demo-label">Fictional retailer demo</div>
        <div className="shopping-canvas__tool-status" aria-live="polite">
          <span className="shopping-canvas__pulse" />
          <div>
            <small>WebMCP</small>
            <strong><span className="shopping-canvas__status-full">{nativeStatus}</span><span className="shopping-canvas__status-compact" aria-hidden="true">{compactNativeStatus}</span></strong>
          </div>
        </div>
      </header>

      <main>
        <section className="shopping-canvas__intro">
          <div>
            <p className="shopping-canvas__eyebrow">A shared shopping canvas for you and your agent</p>
            <h1>Your agent shops.<br />You make the call.</h1>
          </div>
          <div className="shopping-canvas__brief">
            <blockquote>“{snapshot.context.brief}”</blockquote>
            <ul aria-label="Confirmed shopping constraints">
              <li>Size M</li>
              <li>By Friday</li>
              <li>Under {money(snapshot.context.budgetCents)}</li>
              <li>Keep my boots</li>
            </ul>
          </div>
        </section>

        <nav className="shopping-canvas__journey" aria-label="Shopping journey">
          {[
            ['1', 'Agent searches', stage === 'brief' ? 'current' : 'done'],
            ['2', 'Plans the look', ['first-look', 'conflict'].includes(stage) ? 'current' : stage === 'brief' ? '' : 'done'],
            ['3', 'Repairs the surprise', stage === 'repaired' ? 'current' : ['review', 'approved', 'cart'].includes(stage) ? 'done' : ''],
            ['4', 'You approve', stage === 'review' || stage === 'approved' ? 'current' : stage === 'cart' ? 'done' : ''],
          ].map(([number, label, status]) => (
            <div className={status ? `is-${status}` : ''} key={number}>
              <span>{status === 'done' ? <Check weight="bold" /> : number}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </nav>

        {stage === 'brief' ? (
          <section className={`shopping-canvas__start ${nativeAvailable ? 'is-native' : 'is-guided'}`} aria-labelledby="shopping-start-title">
            <div className="shopping-canvas__start-copy">
              <p className="shopping-canvas__eyebrow">Start here</p>
              <h2 id="shopping-start-title">
                {registrationPending
                  ? 'Checking for WebMCP…'
                  : nativeAvailable
                    ? 'WebMCP tools are ready.'
                    : registrationError
                      ? 'WebMCP tools need attention.'
                      : 'No compatible WebMCP agent connected.'}
              </h2>
              <p>
                {registrationPending
                  ? 'You can start the guided version as soon as this browser check finishes.'
                  : nativeAvailable
                    ? `This page has registered ${registeredToolNames.length} tools. Open your browser agent and give it the request shown here; the canvas will update as it works.`
                    : 'You can still run the complete shopping journey here with visible controls. Nothing is purchased or charged.'}
              </p>
            </div>
            {nativeAvailable ? (
              <div className="shopping-canvas__agent-request">
                <small>Ask your browser agent</small>
                <blockquote>“Shop this brief. Build the look here, explain your choices and stop at the exact cart review.”</blockquote>
              </div>
            ) : null}
            <button
              type="button"
              onClick={startGuidedDemo}
              disabled={registrationPending}
            >
              <ArrowRight aria-hidden="true" />
              {registrationPending
                ? 'Checking this browser…'
                : nativeAvailable
                  ? 'Run guided demo instead'
                  : 'Start guided demo'}
            </button>
          </section>
        ) : null}

        {guidedDemo && ['first-look', 'conflict', 'repaired'].includes(stage) ? (
          <section className="shopping-canvas__guided-step" aria-live="polite">
            <div>
              <small>Guided demo</small>
              <strong>
                {stage === 'first-look'
                  ? 'The first look works for Home. Now change the delivery destination.'
                  : stage === 'conflict'
                    ? 'The blazer now arrives too late. Repair the look and the budget.'
                    : 'The repaired look arrives Friday and stays under budget. Prepare the exact cart review.'}
              </strong>
            </div>
            {stage === 'first-look' ? (
              <button type="button" onClick={() => act(() => control.setDestination('event-hotel'))}>Change delivery to the event hotel</button>
            ) : stage === 'conflict' ? (
              <button type="button" onClick={() => act(() => control.updateSharedLook(snapshot.revision, isTighterBudget ? tighterBudgetHotelReplacements : hotelReplacements, isTighterBudget ? tighterBudgetReplacedHomeItems : replacedHomeItems))}>Repair delivery and budget</button>
            ) : (
              <button type="button" onClick={() => act(requestReview)}>Prepare exact cart review</button>
            )}
          </section>
        ) : null}

        <section className={`shopping-canvas__workspace is-${stage}`} aria-labelledby="canvas-title">
          <div className="shopping-canvas__canvas-heading">
            <div>
              <p className="shopping-canvas__eyebrow">Shared styling canvas</p>
              <h2 id="canvas-title">
                {stage === 'brief' ? 'Ready for the agent' : isLate ? 'The destination changed' : isRepaired ? 'Replanned for the hotel' : 'First look found'}
              </h2>
            </div>
            <div className="shopping-canvas__destination">
              <MapPin aria-hidden="true" />
              <label htmlFor="shopping-destination">Deliver to</label>
              <select
                id="shopping-destination"
                value={snapshot.context.destinationId}
                onChange={(event) => act(() => control.setDestination(event.target.value as 'home' | 'event-hotel'))}
                disabled={Boolean(snapshot.review?.status === 'pending' || snapshot.activeGrant || snapshot.cart.lines.length)}
              >
                <option value="home">Home</option>
                <option value="event-hotel">Event hotel</option>
              </select>
            </div>
          </div>

          <div className="shopping-canvas__content">
            <figure className="shopping-canvas__look" aria-live="polite">
              {selectedBySlot.base ? (
                <img className="shopping-canvas__item shopping-canvas__item--base" src={selectedBySlot.base.product.assetPath} alt={selectedBySlot.base.product.name} width="900" height="900" />
              ) : (
                <div className="shopping-canvas__empty-look">
                  <Sparkle aria-hidden="true" />
                  <strong>One request. Thirty variants.</strong>
                  <span>The agent must search, inspect and check delivery—not press a dressed-up recommendation button.</span>
                </div>
              )}
              {selectedBySlot.layer ? <img className="shopping-canvas__item shopping-canvas__item--layer" src={selectedBySlot.layer.product.assetPath} alt={selectedBySlot.layer.product.name} width="900" height="900" /> : null}
              {selectedBySlot.bag ? <img className="shopping-canvas__item shopping-canvas__item--bag" src={selectedBySlot.bag.product.assetPath} alt={selectedBySlot.bag.product.name} width="900" height="900" /> : null}
              {selectedBySlot.accent ? <img className="shopping-canvas__item shopping-canvas__item--accent" src={selectedBySlot.accent.product.assetPath} alt={selectedBySlot.accent.product.name} width="900" height="900" /> : null}
              <img className="shopping-canvas__item shopping-canvas__item--boots" src={snapshot.context.ownedItems[0].assetPath} alt="Your owned cobalt-blue ankle boots" width="900" height="900" />
              <figcaption>
                <span>Exact product cutouts arranged as a styling preview</span>
                <strong>Your boots stay. They never become a cart line.</strong>
              </figcaption>
            </figure>

            <aside className="shopping-canvas__decision" aria-live="polite">
              {stage === 'brief' ? (
                <>
                  <div className="shopping-canvas__decision-icon"><ArrowRight /></div>
                  <p className="shopping-canvas__eyebrow">Give the agent one objective</p>
                  <h3>Find the strongest complete look.</h3>
                  <p>It has to reconcile style, size, stock, delivery and the total from retailer-owned facts.</p>
                  <div className="shopping-canvas__prompt">“Shop this brief. Build the look here, explain your choices and stop at the exact cart review.”</div>
                </>
              ) : isLate ? (
                <>
                  <div className="shopping-canvas__decision-icon is-warning"><WarningCircle /></div>
                  <p className="shopping-canvas__eyebrow">The plan just broke</p>
                  <h3>Silver blazer arrives Monday.</h3>
                  <p>It reached Home by Friday. It misses the event when delivery changes to the hotel.</p>
                  <dl>
                    <div><dt>Was</dt><dd>Friday · Home</dd></div>
                    <div><dt>Now</dt><dd>Monday · Hotel</dd></div>
                    <div><dt>Cart</dt><dd>Still empty</dd></div>
                  </dl>
                </>
              ) : isRepaired ? (
                <>
                  <div className="shopping-canvas__decision-icon is-success"><Check /></div>
                  <p className="shopping-canvas__eyebrow">Coordinated repair</p>
                  <h3>One late item fixed. Budget restored.</h3>
                  <div className="shopping-canvas__repair-row">
                    <span>Jacket</span><strong>+$18</strong><small>Arrives Friday</small>
                  </div>
                  <div className="shopping-canvas__repair-row">
                    <span>{isTighterBudget ? 'Scarf' : 'Bag'}</span><strong>{isTighterBudget ? '−$6' : '−$16'}</strong><small>Keeps total under budget</small>
                  </div>
                  <dl>
                    <div><dt>Total</dt><dd>{money(snapshot.validation.subtotalCents)}</dd></div>
                    <div><dt>Deadline</dt><dd>Friday</dd></div>
                    <div><dt>Cart</dt><dd>{snapshot.cart.lines.length ? `${snapshot.cart.lines.length} items` : 'Still empty'}</dd></div>
                  </dl>
                </>
              ) : (
                <>
                  <div className="shopping-canvas__decision-icon"><Sparkle /></div>
                  <p className="shopping-canvas__eyebrow">Result from this run</p>
                  <h3>Sharp, coherent, under budget.</h3>
                  <p>The agent combined four exact retailer variants with your owned boots. Nothing has been added to the cart.</p>
                  <dl>
                    <div><dt>Total</dt><dd>{money(snapshot.validation.subtotalCents)}</dd></div>
                    <div><dt>Delivery</dt><dd>Friday · Home</dd></div>
                    <div><dt>Cart</dt><dd>Empty</dd></div>
                  </dl>
                </>
              )}
            </aside>
          </div>

          {selected.length ? (
            <ol className="shopping-canvas__look-lines" aria-label="Selected exact products">
              {selected.map(({ product, variant }) => (
                <li key={variant.id}>
                  <img src={product.assetPath} alt="" width="900" height="900" />
                  <div><strong>{product.name}</strong><span>{product.sku} · {product.color}</span><small>Size {variant.size}{deliveryByVariant[variant.id] ? ` · Arrives ${shortDate(deliveryByVariant[variant.id]!)}` : ''}</small></div>
                  <div><span>{money(variant.priceCents)}</span><small>{product.slot}</small></div>
                </li>
              ))}
              <li className="is-owned">
                <img src={snapshot.context.ownedItems[0].assetPath} alt="" width="900" height="900" />
                <div><strong>Cobalt-blue ankle boots</strong><span>Owned item · Size 8</span><small>Provided for this demo</small></div>
                <div><span>$0</span><small>never carted</small></div>
              </li>
            </ol>
          ) : null}
        </section>

        {snapshot.review?.status === 'pending' ? (
          <section className="shopping-canvas__review" aria-labelledby="cart-review-title">
            <div className="shopping-canvas__review-heading">
              <div>
                <p className="shopping-canvas__eyebrow">Your decision</p>
                <h2 id="cart-review-title">Review the exact cart change</h2>
                <p>The agent cannot approve this. No item is in the cart and no payment has been taken.</p>
              </div>
              <strong>{money(snapshot.review.proposedCart.subtotalCents)}</strong>
            </div>
            <ul>
              {snapshot.review.proposedCart.lines.map((line) => (
                <li key={line.variantId}><span><strong>{line.name} · {line.size}</strong><small>{line.sku} · Arrives {shortDate(snapshot.review!.fulfilmentQuotes.find((quote) => quote.variantId === line.variantId)!.arrivesOn)}</small></span><strong>{money(line.unitPriceCents)}</strong></li>
              ))}
            </ul>
            <div className="shopping-canvas__review-actions">
              <button type="button" className="is-approve" onClick={() => act(() => control.approveCartReview(snapshot.review!.id))}><ShieldCheck /> Approve exact cart</button>
              <button type="button" onClick={() => act(() => control.keepEditing(snapshot.review!.id))}>Keep editing</button>
              <button type="button" className="is-decline" onClick={() => act(() => control.declineCartReview(snapshot.review!.id))}><X /> Decline</button>
            </div>
          </section>
        ) : null}

        {snapshot.activeGrant ? (
          <section className="shopping-canvas__authority" aria-live="polite">
            <div><ShieldCheck /><span><strong>You approved one exact cart patch.</strong><small>{APPLY_APPROVED_CART_TOOL_NAME} is temporarily available to the agent for one use.</small></span></div>
            <div className="shopping-canvas__authority-actions">
              {guidedDemo ? <button type="button" className="is-apply" onClick={() => act(() => control.applyApprovedCart(snapshot.activeGrant!.id))}>Apply approved cart</button> : null}
              <button type="button" onClick={() => act(() => control.revokeCartGrant(snapshot.activeGrant!.id))}>Revoke</button>
            </div>
          </section>
        ) : null}

        {snapshot.cart.lines.length ? (
          <section className="shopping-canvas__cart" aria-labelledby="cart-title">
            <ShoppingBagOpen aria-hidden="true" />
            <div className="shopping-canvas__cart-body">
              <p className="shopping-canvas__eyebrow">Exact approved result</p>
              <h2 id="cart-title">Your cart is ready.</h2>
              <p>{snapshot.cart.lines.length} items · {money(snapshot.cart.subtotalCents)} · $0 charged. Checkout stays with you.</p>
              <ul aria-label="Exact cart lines">
                {snapshot.cart.lines.map((line) => (
                  <li key={line.variantId}>
                    <span><strong>{line.name} · {line.size}</strong><small>{line.sku} · Arrives {shortDate(snapshot.review!.fulfilmentQuotes.find((quote) => quote.variantId === line.variantId)!.arrivesOn)}</small></span>
                    <strong>{money(line.unitPriceCents)}</strong>
                  </li>
                ))}
              </ul>
              <p className="shopping-canvas__order-boundary">No order has been placed.</p>
            </div>
            <button type="button" disabled>Continue to checkout</button>
          </section>
        ) : null}

        <div className="shopping-canvas__reset-row">
          <button type="button" onClick={reset}>Reset demo</button>
          {actionError ? <p role="alert">{actionError}</p> : null}
        </div>

        <details className="shopping-canvas__technical">
          <summary>How WebMCP changes this experience</summary>
          <div>
            <p>Seven permanent tools expose exact retailer facts and a shared revisioned canvas. The model still has to reason about the brief and choose a plan.</p>
            <p>Human approval adds one temporary <code>apply_approved_cart</code> tool. It closes over the exact reviewed patch, works once, then disappears. There is no checkout tool.</p>
            <p>Catalogue fixture: 12 styles, 30 canonical variants, two delivery destinations. All product imagery is a canonical fictional SKU asset; the layout is a styling preview, not a virtual try-on.</p>
          </div>
        </details>
      </main>

      <footer className="shopping-canvas__footer">
        <span>Open for Agents experiment</span>
        <span>Browser-local demo · no account · no payment</span>
      </footer>
    </div>
  )
}

export default ShoppingApp
