import {
  Check,
  CopySimple,
  MapPin,
  Robot,
  ShieldCheck,
  ShoppingBagOpen,
  Sparkle,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createShoppingControl } from './domain'
import type {
  FulfilmentQuote,
  ShoppingSnapshot,
  ShoppingToolActivityEvent,
  ShoppingToolsRegistration,
} from './types'
import {
  APPLY_APPROVED_CART_TOOL_NAME,
  registerShoppingTools,
} from './webmcp'
import './ShoppingApp.css'

function agentRequestForBudget(budgetCents: number) {
  return `Shop this wedding brief for the current destination. Build the strongest complete look around my blue boots, stay under ${money(budgetCents)}, explain your choices, and keep the cart empty. If I change the destination, recheck every item, repair only what breaks, and stop at the exact cart review.`
}

const agentContinuation =
  'The destination changed. Recheck every item, repair only what broke, and stop at the exact cart review.'

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

type ExperienceMode = 'guided' | 'agent' | null

interface DisplayActivity {
  readonly id: string
  readonly source: 'Demo' | 'Browser agent'
  readonly status: 'working' | 'complete' | 'attention'
  readonly title: string
  readonly detail?: string
}

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
  const [control, setControl] = useState(() =>
    createShoppingControl({ now: () => new Date(), budgetCents: initialBudgetCents }),
  )
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
  const [mode, setMode] = useState<ExperienceMode>(null)
  const [guidedActivity, setGuidedActivity] = useState<readonly DisplayActivity[]>([])
  const [agentActivity, setAgentActivity] = useState<readonly DisplayActivity[]>([])
  const [copied, setCopied] = useState(false)
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null)
  const cartHeadingRef = useRef<HTMLHeadingElement>(null)
  const agentRequest = agentRequestForBudget(snapshot.context.budgetCents)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Morrow: Adaptive Shopping Canvas'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const observeToolActivity = useCallback((event: ShoppingToolActivityEvent) => {
    setMode('agent')
    setGuidedDemo(false)
    setAgentActivity((current) => {
      const next: DisplayActivity = {
        id: event.id,
        source: 'Browser agent',
        status: event.status === 'started'
          ? 'working'
          : event.status === 'failed'
            ? 'attention'
            : 'complete',
        title: event.message,
        detail: event.toolName,
      }
      if (event.status === 'started') return [...current, next]
      const runningIndex = current.findLastIndex(
        (entry) => entry.detail === event.toolName && entry.status === 'working',
      )
      if (runningIndex < 0) return [...current, next]
      return current.map((entry, index) => index === runningIndex ? next : entry)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let active: ShoppingToolsRegistration | null = null
    void registerShoppingTools(control, undefined, { onActivity: observeToolActivity })
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
        setActionError('WebMCP tools did not finish loading. The complete guided demo still works.')
      })
    return () => {
      cancelled = true
      if (active) void active.dispose()
    }
  }, [control, observeToolActivity])

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

  useEffect(() => {
    if (snapshot.review?.status !== 'pending') return
    const frame = requestAnimationFrame(() => reviewHeadingRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [snapshot.review?.status])

  useEffect(() => {
    if (!snapshot.cart.lines.length) return
    const frame = requestAnimationFrame(() => {
      cartHeadingRef.current?.focus()
      cartHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [snapshot.cart.lines.length])

  const act = useCallback((action: () => unknown) => {
    try {
      action()
      setActionError(null)
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'That action could not run.')
      return false
    }
  }, [])

  const selected = useMemo(
    () => snapshot.lookVariantIds
      .map((id) => variantFor(snapshot, id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [snapshot],
  )
  const selectedBySlot = useMemo(
    () => Object.fromEntries(selected.map((item) => [item.product.slot, item])) as Partial<
      Record<'base' | 'layer' | 'bag' | 'accent', (typeof selected)[number]>
    >,
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
  ) as Readonly<Record<string, string | undefined>>, [
    control,
    snapshot.context.destinationId,
    snapshot.context.neededBy,
    snapshot.lookVariantIds,
  ])

  const stage = stageFor(snapshot)
  const isTighterBudget = initialBudgetCents === 32500
  const isLate = stage === 'conflict'
  const isRepaired = ['repaired', 'review', 'approved', 'cart'].includes(stage)
  const registrationError = registration?.getLastError() ?? null
  const nativeAvailable = Boolean(registration?.supported && !registrationError)
  const nativeDetail = registrationPending
    ? 'The guided demo works now'
    : registrationError
      ? 'The guided demo still works'
      : registration?.supported
        ? `${registeredToolNames.length} tools available to browser agents`
        : 'This browser does not expose WebMCP'
  const visibleActivity = mode === 'agent' ? agentActivity : guidedActivity
  const latestActivity = visibleActivity.at(-1)
  const replacementVariantIds: readonly string[] = isTighterBudget
    ? tighterBudgetHotelReplacements
    : hotelReplacements
  const stageStatus = stage === 'brief'
    ? { tone: 'quiet', title: 'Nothing selected yet', detail: 'Start with the note above.' }
    : stage === 'first-look'
      ? { tone: 'ready', title: 'Four pieces found', detail: `All arrive Friday · ${money(snapshot.validation.subtotalCents)} total` }
      : stage === 'conflict'
        ? { tone: 'warning', title: 'One item misses Friday', detail: 'The silver blazer now arrives Monday at the event hotel.' }
        : stage === 'cart'
          ? { tone: 'ready', title: 'Added to the demo cart', detail: `${snapshot.cart.lines.length} items · ${money(snapshot.cart.subtotalCents)}` }
          : { tone: 'ready', title: 'Updated for the hotel', detail: `Kept two pieces, changed two · arrives Friday · ${money(snapshot.validation.subtotalCents)}` }
  const currentStatus = latestActivity?.status === 'working' || (mode === 'agent' && stage === 'brief' && latestActivity)
    ? {
        tone: latestActivity.status === 'attention' ? 'warning' : 'working',
        title: latestActivity.title,
        detail: latestActivity.detail ?? 'Browser agent',
      }
    : stageStatus

  const addGuidedActivity = (...entries: readonly Omit<DisplayActivity, 'id' | 'source'>[]) => {
    setGuidedActivity((current) => [
      ...current,
      ...entries.map((entry, index) => ({
        ...entry,
        id: `guided-activity-${String(current.length + index + 1).padStart(3, '0')}`,
        source: 'Demo' as const,
      })),
    ])
  }

  const requestReview = () => {
    const fulfilment = control.checkFulfilment(
      snapshot.lookVariantIds,
      snapshot.context.destinationId,
      snapshot.context.neededBy,
    )
    if (!fulfilment.ok) {
      setActionError(fulfilment.error.message)
      return false
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
    if (!result.ok) {
      setActionError(result.error.message)
      return false
    }
    setActionError(null)
    return true
  }

  const reset = () => {
    void registration?.dispose()
    setControl(createShoppingControl({ now: () => new Date(), budgetCents: initialBudgetCents }))
    setRegistration(null)
    setRegisteredToolNames([])
    setRegistrationPending(true)
    setActionError(null)
    setGuidedDemo(false)
    setMode(null)
    setGuidedActivity([])
    setAgentActivity([])
    setCopied(false)
  }

  const startGuidedDemo = () => {
    setGuidedDemo(true)
    setMode('guided')
    setAgentActivity([])
    setGuidedActivity([
      {
        id: 'guided-activity-001',
        source: 'Demo',
        status: 'complete',
        title: 'Read the brief and locked the four constraints.',
        detail: `Size M · Friday · ${money(snapshot.context.budgetCents)} · keep the boots`,
      },
      {
        id: 'guided-activity-002',
        source: 'Demo',
        status: 'complete',
        title: 'Searched 30 exact variants across 12 products.',
        detail: 'Compared style, size, stock, price and delivery facts',
      },
      {
        id: 'guided-activity-003',
        source: 'Demo',
        status: 'complete',
        title: 'Built the strongest complete first look.',
        detail: 'Four retailer items around the owned cobalt boots',
      },
    ])
    act(() => control.updateSharedLook(
      snapshot.revision,
      isTighterBudget ? tighterBudgetFirstLook : firstLook,
      [],
    ))
  }

  const changeGuidedDestination = () => {
    if (!act(() => control.setDestination('event-hotel'))) return
    addGuidedActivity(
      {
        status: 'complete',
        title: 'You changed delivery from Home to the event hotel.',
        detail: 'The look now has to be checked against a new destination',
      },
      {
        status: 'attention',
        title: 'Rechecked four promises and found one late item.',
        detail: 'The silver blazer now arrives Monday, after the wedding',
      },
    )
  }

  const repairGuidedLook = () => {
    if (!act(() => control.updateSharedLook(
      snapshot.revision,
      isTighterBudget ? tighterBudgetHotelReplacements : hotelReplacements,
      isTighterBudget ? tighterBudgetReplacedHomeItems : replacedHomeItems,
    ))) return
    addGuidedActivity(
      {
        status: 'complete',
        title: 'Kept the pieces that still worked.',
        detail: isTighterBudget ? 'The jumpsuit and clutch stayed' : 'The dress and belt stayed',
      },
      {
        status: 'complete',
        title: 'Replaced only the two problem pieces.',
        detail: isTighterBudget
          ? 'Added the hotel-ready jacket and scarf'
          : 'Added the hotel-ready jacket and smaller bag',
      },
      {
        status: 'complete',
        title: `Confirmed Friday delivery at ${money(isTighterBudget ? 32500 : 34500)}.`,
        detail: 'All four exact variants are available; the cart is still empty',
      },
    )
  }

  const prepareGuidedReview = () => {
    if (!requestReview()) return
    addGuidedActivity({
      status: 'complete',
      title: 'Prepared one exact four-item cart decision.',
      detail: 'Nothing has been added and $0 has been charged',
    })
  }

  const addGuidedCart = () => {
    const reviewId = snapshot.review?.id
    if (!reviewId) return
    try {
      const approved = control.approveCartReview(reviewId)
      const grantId = approved.activeGrant?.id
      if (!grantId) throw new Error('The demo cart permission was not created.')
      const applied = control.applyApprovedCart(grantId)
      if (!applied.ok) throw new Error(applied.error.message)
      setActionError(null)
      addGuidedActivity({
        status: 'complete',
        title: 'Added the four reviewed items to the demo cart.',
        detail: `${money(applied.data.cart.subtotalCents)} total · $0 charged · no order placed`,
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The demo cart could not be updated.')
    }
  }

  const approveAgentCart = () => {
    const reviewId = snapshot.review?.id
    if (!reviewId) return
    act(() => control.approveCartReview(reviewId))
  }

  const copyAgentRequest = async () => {
    if (nativeAvailable) setMode('agent')
    try {
      await navigator.clipboard.writeText(agentRequest)
      setCopied(true)
      setActionError(null)
    } catch {
      setCopied(false)
      setActionError('Copy was unavailable. Select the request text and copy it manually.')
    }
  }

  const copyAgentContinuation = async () => {
    try {
      await navigator.clipboard.writeText(agentContinuation)
      setCopied(true)
      setActionError(null)
    } catch {
      setCopied(false)
      setActionError('Copy was unavailable. Select the follow-up text and copy it manually.')
    }
  }

  return (
    <div className="shopping-canvas">
      <header className="shopping-canvas__header">
        <a className="shopping-canvas__brand" href="?experience=shopping" aria-label="Morrow demo home">
          <span>M</span>
          <strong>Morrow</strong>
        </a>
        <span className="shopping-canvas__collection">Occasion edit</span>
        <div className="shopping-canvas__header-actions">
          <div className="shopping-canvas__tool-status" aria-live="polite">
            <span className={`shopping-canvas__pulse ${nativeAvailable ? 'is-ready' : ''}`} />
            <div>
              <strong>{nativeAvailable ? 'Browser agent ready' : registrationPending ? 'Checking browser support' : 'Guided demo available'}</strong>
              <small>{nativeAvailable ? `${registeredToolNames.length} tools` : nativeDetail}</small>
            </div>
          </div>
          <div className="shopping-canvas__bag" aria-label={`${snapshot.cart.lines.length} items in the demo cart`}>
            <ShoppingBagOpen aria-hidden="true" />
            <span>{snapshot.cart.lines.length}</span>
          </div>
        </div>
      </header>

      <main>
        <section className={`shopping-canvas__shopper-note ${stage !== 'brief' ? 'is-compact' : ''}`} aria-labelledby="shopping-note-title">
          <div className="shopping-canvas__note-copy">
            <p className="shopping-canvas__eyebrow">Your note</p>
            <h1 id="shopping-note-title">Find a wedding look around these boots.</h1>
            <blockquote>Wedding Saturday. I’m a size M. Keep it under {money(snapshot.context.budgetCents)} and make sure everything arrives by Friday.</blockquote>
            {stage === 'brief' ? (
              <div className="shopping-canvas__start-actions">
                <button className="is-primary" type="button" onClick={startGuidedDemo}>Find me a look</button>
                {nativeAvailable ? (
                  <button className="is-secondary" type="button" onClick={() => void copyAgentRequest()}>
                    {copied ? <Check weight="bold" /> : <Robot />} {copied ? 'Agent request copied' : 'Use my browser agent'}
                  </button>
                ) : (
                  <span>The guided version works in this browser.</span>
                )}
              </div>
            ) : null}
          </div>
          <figure className="shopping-canvas__owned-item">
            <img src={snapshot.context.ownedItems[0].assetPath} alt="Your owned cobalt-blue ankle boots" width="900" height="900" />
            <figcaption><small>Already yours</small><strong>Cobalt-blue ankle boots</strong><span>Size 8 · never added to the cart</span></figcaption>
          </figure>
        </section>

        <section className={`shopping-canvas__workspace is-${stage}`} aria-labelledby="canvas-title">
          <div className="shopping-canvas__canvas-heading">
            <div>
              <p className="shopping-canvas__eyebrow">Wedding guest edit</p>
              <h2 id="canvas-title">Your look</h2>
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

          <div className={`shopping-canvas__status is-${currentStatus.tone}`} aria-live="polite">
            {currentStatus.tone === 'warning' ? <WarningCircle aria-hidden="true" /> : currentStatus.tone === 'ready' ? <Check aria-hidden="true" /> : <Sparkle aria-hidden="true" />}
            <div><strong>{currentStatus.title}</strong><span>{currentStatus.detail}</span></div>
          </div>

          {(guidedDemo || mode === 'agent') && ['first-look', 'conflict', 'repaired'].includes(stage) ? (
            <div className="shopping-canvas__next-action">
              <p>{stage === 'first-look'
                ? 'The first look works for home.'
                : stage === 'conflict'
                  ? 'The blazer no longer reaches the new destination in time.'
                  : 'The revised look reaches the hotel by Friday.'}</p>
              {stage === 'first-look' ? (
                <button type="button" onClick={changeGuidedDestination}>Send it to the event hotel</button>
              ) : stage === 'conflict' && guidedDemo ? (
                <button type="button" onClick={repairGuidedLook}>Fix the late items</button>
              ) : stage === 'conflict' ? (
                <button type="button" onClick={() => void copyAgentContinuation()}><CopySimple /> {copied ? 'Follow-up copied' : 'Ask my agent to fix it'}</button>
              ) : guidedDemo ? (
                <button type="button" onClick={prepareGuidedReview}>Review 4 items</button>
              ) : (
                <span><Robot aria-hidden="true" /> Waiting for your agent to prepare the review</span>
              )}
            </div>
          ) : null}

          <div className={`shopping-canvas__content ${selected.length ? '' : 'is-empty'}`}>
            <figure className="shopping-canvas__look" aria-live="polite">
              {selected.length ? (
                <>
                  {selectedBySlot.base ? <img className="shopping-canvas__item shopping-canvas__item--base" src={selectedBySlot.base.product.assetPath} alt={selectedBySlot.base.product.name} width="900" height="900" /> : null}
                  {selectedBySlot.layer ? <img className="shopping-canvas__item shopping-canvas__item--layer" src={selectedBySlot.layer.product.assetPath} alt={selectedBySlot.layer.product.name} width="900" height="900" /> : null}
                  {selectedBySlot.bag ? <img className="shopping-canvas__item shopping-canvas__item--bag" src={selectedBySlot.bag.product.assetPath} alt={selectedBySlot.bag.product.name} width="900" height="900" /> : null}
                  {selectedBySlot.accent ? <img className="shopping-canvas__item shopping-canvas__item--accent" src={selectedBySlot.accent.product.assetPath} alt={selectedBySlot.accent.product.name} width="900" height="900" /> : null}
                  <img className="shopping-canvas__item shopping-canvas__item--boots" src={snapshot.context.ownedItems[0].assetPath} alt="Your owned cobalt-blue ankle boots" width="900" height="900" />
                  <figcaption><span>{selected.length} pieces · {money(snapshot.validation.subtotalCents)}</span><strong>Built around your boots</strong></figcaption>
                </>
              ) : (
                <div className="shopping-canvas__empty-look">
                  <Sparkle aria-hidden="true" />
                  <strong>Your look will appear here.</strong>
                  <span>No products have been selected yet.</span>
                </div>
              )}
            </figure>

            {selected.length ? <div className="shopping-canvas__products">
              <div className="shopping-canvas__products-heading">
                <h3>Selected pieces</h3>
                <span>{selected.length} from Morrow · 1 owned</span>
              </div>
              <ol aria-label="Selected exact products">
                  {selected.map(({ product, variant }) => {
                    const late = isLate && variant.id === 'variant-silver-cropped-blazer-m'
                    const replacement = isRepaired && replacementVariantIds.includes(variant.id)
                    const kept = isRepaired && !replacement
                    const arrivesOn = deliveryByVariant[variant.id]
                    return (
                      <li className={`${late ? 'is-late' : ''} ${replacement ? 'is-replacement' : ''}`} key={variant.id}>
                        <img src={product.assetPath} alt="" width="900" height="900" />
                        <div className="shopping-canvas__product-copy">
                          <span className="shopping-canvas__product-badge">{late ? 'Too late' : replacement ? 'Replacement' : kept ? 'Kept' : product.slot}</span>
                          <strong>{product.name}</strong>
                          <small>{product.color} · Size {variant.size}</small>
                          {late ? (
                            <span className="shopping-canvas__delivery is-late"><del>Friday</del> Arrives {arrivesOn ? shortDate(arrivesOn) : 'Monday'}</span>
                          ) : (
                            <span className="shopping-canvas__delivery">{arrivesOn ? `Arrives ${shortDate(arrivesOn)}` : 'Checking delivery'}</span>
                          )}
                        </div>
                        <strong className="shopping-canvas__price">{money(variant.priceCents)}</strong>
                      </li>
                    )
                  })}
                  <li className="is-owned">
                    <img src={snapshot.context.ownedItems[0].assetPath} alt="" width="900" height="900" />
                    <div className="shopping-canvas__product-copy"><span className="shopping-canvas__product-badge">Already yours</span><strong>Cobalt-blue ankle boots</strong><small>Size 8</small><span className="shopping-canvas__delivery">Not added to the cart</span></div>
                    <strong className="shopping-canvas__price">$0</strong>
                  </li>
              </ol>
            </div> : null}
          </div>
        </section>

        {visibleActivity.length ? (
          <details className="shopping-canvas__activity-details">
            <summary>See activity ({visibleActivity.length})</summary>
            <ol>
              {visibleActivity.map((entry) => (
                <li className={`is-${entry.status}`} key={entry.id}><span>{entry.status === 'attention' ? <WarningCircle /> : entry.status === 'working' ? <Sparkle /> : <Check />}</span><div><strong>{entry.title}</strong>{entry.detail ? <small>{entry.detail}</small> : null}</div></li>
              ))}
            </ol>
          </details>
        ) : null}

        {snapshot.review?.status === 'pending' ? (
          <div className="shopping-canvas__review-backdrop">
            <section className="shopping-canvas__review" role="dialog" aria-modal="true" aria-labelledby="cart-review-title">
              <div className="shopping-canvas__review-heading">
                <div>
                  <p className="shopping-canvas__eyebrow">Review your cart</p>
                  <h2 id="cart-review-title" ref={reviewHeadingRef} tabIndex={-1}>Add these exact four items?</h2>
                  <p>Nothing is in the cart. Nothing has been charged.</p>
                </div>
                <strong>{money(snapshot.review.proposedCart.subtotalCents)}</strong>
              </div>
              <ul>
                {snapshot.review.proposedCart.lines.map((line) => (
                  <li key={line.variantId}><span><strong>{line.name} · {line.size}</strong><small>{line.sku} · Arrives {shortDate(snapshot.review!.fulfilmentQuotes.find((quote) => quote.variantId === line.variantId)!.arrivesOn)}</small></span><strong>{money(line.unitPriceCents)}</strong></li>
                ))}
              </ul>
              <div className="shopping-canvas__review-actions">
                <button type="button" className="is-approve" onClick={guidedDemo ? addGuidedCart : approveAgentCart}>
                  <ShieldCheck /> {guidedDemo ? 'Add these 4 items to the demo cart' : 'Approve these 4 items'}
                </button>
                <button type="button" onClick={() => act(() => control.keepEditing(snapshot.review!.id))}>Keep editing</button>
                <button type="button" className="is-decline" onClick={() => act(() => control.declineCartReview(snapshot.review!.id))}><X /> Decline</button>
              </div>
            </section>
          </div>
        ) : null}

        {snapshot.activeGrant ? (
          <section className="shopping-canvas__authority" aria-live="polite">
            <div><ShieldCheck /><span><strong>Approved. Your agent can add this cart once.</strong><small>The four reviewed items cannot be changed.</small></span></div>
            <button type="button" onClick={() => act(() => control.revokeCartGrant(snapshot.activeGrant!.id))}>Revoke</button>
          </section>
        ) : null}

        {snapshot.cart.lines.length ? (
          <section className="shopping-canvas__cart" aria-labelledby="cart-title">
            <div className="shopping-canvas__cart-heading"><ShoppingBagOpen aria-hidden="true" /><div><p className="shopping-canvas__eyebrow">Demo cart</p><h2 id="cart-title" ref={cartHeadingRef} tabIndex={-1}>Added to your demo cart.</h2><p>Everything arrives at the event hotel by Friday.</p></div></div>
            <div className="shopping-canvas__cart-layout">
              <ul aria-label="Exact cart lines">
                {snapshot.cart.lines.map((line) => {
                  const item = variantFor(snapshot, line.variantId)
                  return (
                    <li key={line.variantId}>
                      {item ? <img src={item.product.assetPath} alt="" width="900" height="900" /> : null}
                      <span><strong>{line.name}</strong><small>{line.size} · Arrives {shortDate(snapshot.review!.fulfilmentQuotes.find((quote) => quote.variantId === line.variantId)!.arrivesOn)}</small></span>
                      <strong>{money(line.unitPriceCents)}</strong>
                    </li>
                  )
                })}
              </ul>
              <aside className="shopping-canvas__cart-summary"><div><span>Subtotal</span><strong>{money(snapshot.cart.subtotalCents)}</strong></div><div><span>Delivery</span><strong>Event hotel · Friday</strong></div><button type="button" disabled>Continue to checkout</button><p>Checkout is not part of this demo. Nothing has been charged.</p></aside>
            </div>
          </section>
        ) : null}

        <div className="shopping-canvas__reset-row">
          <button type="button" onClick={reset}>Reset experience</button>
          {actionError ? <p role="alert">{actionError}</p> : null}
        </div>

        <details className="shopping-canvas__technical">
          <summary>See how WebMCP powers the agent version</summary>
          <div>
            <p>Seven permanent tools expose exact retailer facts and the shared revisioned canvas. The optional activity history reports observable tool actions and results, not private model reasoning.</p>
            <p>Human approval adds one temporary <code>{APPLY_APPROVED_CART_TOOL_NAME}</code> tool. It closes over the exact reviewed patch, works once, then disappears. There is no checkout, payment or order tool.</p>
            <p>Catalogue fixture: 12 styles, 30 canonical variants and two delivery destinations. The imagery is a fictional product styling preview, not a virtual try-on.</p>
          </div>
        </details>
      </main>

      <footer className="shopping-canvas__footer">
        <span>Morrow is a fictional retailer created for the WebMCP Challenge.</span>
        <span>Browser-local demo · no account · no payment</span>
      </footer>
    </div>
  )
}

export default ShoppingApp
