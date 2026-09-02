import {
  ArrowRight,
  Check,
  CopySimple,
  MapPin,
  Play,
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

function journeyFor(stage: string) {
  if (stage === 'brief') return { number: 1, label: 'Start with one shopping brief' }
  if (stage === 'first-look' || stage === 'conflict') {
    return { number: 2, label: 'Compare the first complete look' }
  }
  if (stage === 'repaired' || stage === 'review') {
    return { number: 3, label: 'Repair the delivery surprise' }
  }
  return { number: 4, label: 'Make the exact cart decision' }
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
    document.title = 'Morrow — Adaptive Shopping Canvas'
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
  const journey = journeyFor(stage)
  const isTighterBudget = initialBudgetCents === 32500
  const isLate = stage === 'conflict'
  const isRepaired = ['repaired', 'review', 'approved', 'cart'].includes(stage)
  const registrationError = registration?.getLastError() ?? null
  const nativeAvailable = Boolean(registration?.supported && !registrationError)
  const nativeStatus = registrationPending
    ? 'Checking WebMCP support'
    : registrationError
      ? 'WebMCP needs attention'
      : registration?.supported
        ? 'WebMCP ready'
        : 'Guided demo ready'
  const nativeDetail = registrationPending
    ? 'The guided demo works now'
    : registrationError
      ? 'The guided demo still works'
      : registration?.supported
        ? `${registeredToolNames.length} tools available to browser agents`
        : 'This browser does not expose WebMCP'
  const visibleActivity = mode === 'agent' ? agentActivity : guidedActivity

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
        detail: 'The silver blazer now arrives Monday—after the wedding',
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
        <a className="shopping-canvas__brand" href="/" aria-label="Morrow fictional retailer demo home">
          <span>M</span>
          <strong>Morrow</strong>
        </a>
        <div className="shopping-canvas__demo-label">Fictional retailer demo</div>
        <div className="shopping-canvas__tool-status" aria-live="polite">
          <span className={`shopping-canvas__pulse ${nativeAvailable ? 'is-ready' : ''}`} />
          <div>
            <strong>{nativeStatus}</strong>
            <small>{nativeDetail}</small>
          </div>
        </div>
      </header>

      <main>
        <section className="shopping-canvas__intro">
          <div>
            <p className="shopping-canvas__eyebrow">A 45-second shopping challenge</p>
            <h1>The outfit works.<br />Then delivery changes.</h1>
            <p className="shopping-canvas__lede">A wedding look has to arrive by Friday. Then the delivery destination changes. Watch the store recover—or hand the problem to your browser agent.</p>
          </div>
          <div className="shopping-canvas__brief">
            <small>The brief</small>
            <blockquote>“Wedding Saturday. Size M. Under {money(snapshot.context.budgetCents)}. Keep my blue boots. Everything must reach my destination by Friday.”</blockquote>
            <ul aria-label="Confirmed shopping constraints">
              <li>Size M</li>
              <li>By Friday</li>
              <li>Under {money(snapshot.context.budgetCents)}</li>
              <li>Keep my boots</li>
            </ul>
          </div>
        </section>

        {stage === 'brief' ? <section className="shopping-canvas__entry" aria-labelledby="shopping-start-title">
          <div className="shopping-canvas__entry-heading">
            <p className="shopping-canvas__eyebrow">Choose how to experience it</p>
            <h2 id="shopping-start-title">See it work—or delegate it.</h2>
          </div>
          <article className="shopping-canvas__entry-card is-demo">
            <div className="shopping-canvas__entry-icon"><Play weight="fill" /></div>
            <div>
              <small>Works in every browser</small>
              <h3>Watch the 45-second demo</h3>
              <p>Step through the complete search, surprise, repair and cart result.</p>
            </div>
            <button type="button" onClick={startGuidedDemo} disabled={stage !== 'brief'}>
              <Play weight="fill" /> {stage === 'brief' ? 'Start the demo' : 'Demo running'}
            </button>
          </article>
          <article className={`shopping-canvas__entry-card is-agent ${nativeAvailable ? 'is-ready' : ''}`}>
            <div className="shopping-canvas__entry-icon"><Robot /></div>
            <div>
              <small>{nativeAvailable ? 'WebMCP is ready' : registrationPending ? 'Checking this browser' : 'Requires a WebMCP browser'}</small>
              <h3>Use your browser agent</h3>
              <p>{nativeAvailable
                ? 'Give your agent one objective. Real tool calls will appear live on this page.'
                : 'The same request is ready to copy. The guided demo remains fully available.'}</p>
            </div>
            <div className="shopping-canvas__agent-request">
              <blockquote>{agentRequest}</blockquote>
              <button type="button" onClick={() => void copyAgentRequest()}>
                {copied ? <Check weight="bold" /> : <CopySimple />} {copied ? 'Request copied' : 'Copy agent request'}
              </button>
            </div>
          </article>
        </section> : null}

        <nav className="shopping-canvas__journey" aria-label="Shopping journey">
          <span>Step {journey.number} of 4</span>
          <strong>{journey.label}</strong>
          <div className="shopping-canvas__journey-dots" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => <i className={step <= journey.number ? 'is-active' : ''} key={step} />)}
          </div>
        </nav>

        {guidedDemo && ['first-look', 'conflict', 'repaired'].includes(stage) ? (
          <section className="shopping-canvas__guided-step" aria-live="polite">
            <div>
              <small>Guided demo · your next move</small>
              <strong>
                {stage === 'first-look'
                  ? 'The first look works for Home. Now move delivery to the event hotel.'
                  : stage === 'conflict'
                    ? 'One delivery promise broke. Let the demo repair the plan.'
                    : 'The repaired look works. Open the exact cart decision.'}
              </strong>
            </div>
            {stage === 'first-look' ? (
              <button type="button" onClick={changeGuidedDestination}>Change delivery to the hotel</button>
            ) : stage === 'conflict' ? (
              <button type="button" onClick={repairGuidedLook}>Repair delivery and budget</button>
            ) : (
              <button type="button" onClick={prepareGuidedReview}>Review the exact cart</button>
            )}
          </section>
        ) : null}

        {mode === 'agent' && !guidedDemo && ['first-look', 'conflict', 'repaired'].includes(stage) ? (
          <section className="shopping-canvas__guided-step is-agent-step" aria-live="polite">
            <div>
              <small>Browser agent journey · your next move</small>
              <strong>
                {stage === 'first-look'
                  ? 'The first look works for Home. Change delivery to reveal the real problem.'
                  : stage === 'conflict'
                    ? 'The destination changed. Tell your agent to recheck and repair only what broke.'
                    : 'The repaired look works. Ask your agent to prepare the exact cart review.'}
              </strong>
              {stage === 'conflict' ? <p>{agentContinuation}</p> : null}
            </div>
            {stage === 'first-look' ? (
              <button type="button" onClick={changeGuidedDestination}>Change delivery to the hotel</button>
            ) : stage === 'conflict' ? (
              <button type="button" onClick={() => void copyAgentContinuation()}>
                <CopySimple /> Copy the agent follow-up
              </button>
            ) : (
              <span className="shopping-canvas__agent-wait"><Robot /> Waiting for your agent</span>
            )}
          </section>
        ) : null}

        <section className={`shopping-canvas__workspace is-${stage}`} aria-labelledby="canvas-title">
          <div className="shopping-canvas__canvas-heading">
            <div>
              <p className="shopping-canvas__eyebrow">Shared shopping canvas</p>
              <h2 id="canvas-title">
                {stage === 'brief'
                  ? 'Your boots are the starting point'
                  : isLate
                    ? 'The destination changed'
                    : isRepaired
                      ? 'Replanned for the hotel'
                      : 'First look found'}
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
                  <strong>Start with what you already own.</strong>
                  <span>The blue boots are fixed. Everything else has to earn its place.</span>
                </div>
              )}
              {selectedBySlot.layer ? <img className="shopping-canvas__item shopping-canvas__item--layer" src={selectedBySlot.layer.product.assetPath} alt={selectedBySlot.layer.product.name} width="900" height="900" /> : null}
              {selectedBySlot.bag ? <img className="shopping-canvas__item shopping-canvas__item--bag" src={selectedBySlot.bag.product.assetPath} alt={selectedBySlot.bag.product.name} width="900" height="900" /> : null}
              {selectedBySlot.accent ? <img className="shopping-canvas__item shopping-canvas__item--accent" src={selectedBySlot.accent.product.assetPath} alt={selectedBySlot.accent.product.name} width="900" height="900" /> : null}
              <img className="shopping-canvas__item shopping-canvas__item--boots" src={snapshot.context.ownedItems[0].assetPath} alt="Your owned cobalt-blue ankle boots" width="900" height="900" />
              <figcaption>
                <span>Exact fictional products</span>
                <strong>Your boots stay. They never enter the cart.</strong>
              </figcaption>
            </figure>

            <div className="shopping-canvas__side">
              <aside className="shopping-canvas__activity" aria-live="polite" aria-label="Shopping activity">
                <div className="shopping-canvas__activity-heading">
                  <div>
                    <p className="shopping-canvas__eyebrow">What is happening</p>
                    <h3>{mode === 'agent' ? 'Browser agent activity' : mode === 'guided' ? 'Guided demo activity' : 'Ready when you are'}</h3>
                  </div>
                  <span>{mode === 'agent' ? 'Live calls' : mode === 'guided' ? 'Demo' : 'Waiting'}</span>
                </div>
                {visibleActivity.length ? (
                  <ol>
                    {visibleActivity.slice(-6).map((entry) => (
                      <li className={`is-${entry.status}`} key={entry.id}>
                        <span>{entry.status === 'working' ? <Sparkle /> : entry.status === 'attention' ? <WarningCircle /> : <Check />}</span>
                        <div><small>{entry.source}</small><strong>{entry.title}</strong>{entry.detail ? <p>{entry.detail}</p> : null}</div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="shopping-canvas__activity-empty">
                    <Robot />
                    <strong>{nativeAvailable ? 'Waiting for your browser agent.' : 'The complete guided demo is ready.'}</strong>
                    <p>{nativeAvailable
                      ? 'When your agent calls a tool, the factual action and result will appear here.'
                      : 'Start the demo above. Nothing depends on the browser check.'}</p>
                  </div>
                )}
              </aside>

              <aside className="shopping-canvas__decision" aria-live="polite">
                {stage === 'brief' ? (
                  <>
                    <div className="shopping-canvas__decision-icon"><ArrowRight /></div>
                    <p className="shopping-canvas__eyebrow">One ordinary problem</p>
                    <h3>Find the complete look—not just one product.</h3>
                    <p>Size, stock, style, delivery and the total all have to work together.</p>
                  </>
                ) : isLate ? (
                  <>
                    <div className="shopping-canvas__decision-icon is-warning"><WarningCircle /></div>
                    <p className="shopping-canvas__eyebrow">The plan just broke</p>
                    <h3>Silver blazer arrives Monday.</h3>
                    <p>It reached Home by Friday. It misses the wedding when delivery changes to the hotel.</p>
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
                    <h3>Kept two. Replaced two. Fixed the plan.</h3>
                    <div className="shopping-canvas__repair-row">
                      <span>Jacket</span><strong>+$18</strong><small>Restores Friday delivery</small>
                    </div>
                    <div className="shopping-canvas__repair-row">
                      <span>{isTighterBudget ? 'Scarf' : 'Bag'}</span><strong>{isTighterBudget ? '−$6' : '−$16'}</strong><small>Keeps the total under budget</small>
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
                    <p className="shopping-canvas__eyebrow">First result</p>
                    <h3>Four exact products. One complete look.</h3>
                    <p>The boots stayed. The store resolved four categories, the right sizes and the current delivery promise.</p>
                    <dl>
                      <div><dt>Total</dt><dd>{money(snapshot.validation.subtotalCents)}</dd></div>
                      <div><dt>Delivery</dt><dd>Friday · Home</dd></div>
                      <div><dt>Cart</dt><dd>Empty</dd></div>
                    </dl>
                  </>
                )}
              </aside>
            </div>
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
                <div><strong>Cobalt-blue ankle boots</strong><span>Owned item · Size 8</span><small>Already yours</small></div>
                <div><span>$0</span><small>never carted</small></div>
              </li>
            </ol>
          ) : null}
        </section>

        {snapshot.review?.status === 'pending' ? (
          <div className="shopping-canvas__review-backdrop">
            <section className="shopping-canvas__review" role="dialog" aria-modal="true" aria-labelledby="cart-review-title">
              <div className="shopping-canvas__review-heading">
                <div>
                  <p className="shopping-canvas__eyebrow">Your decision</p>
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
                  <ShieldCheck /> {guidedDemo ? 'Add these 4 items to the demo cart' : 'Approve and let my agent add them'}
                </button>
                <button type="button" onClick={() => act(() => control.keepEditing(snapshot.review!.id))}>Keep editing</button>
                <button type="button" className="is-decline" onClick={() => act(() => control.declineCartReview(snapshot.review!.id))}><X /> Decline</button>
              </div>
            </section>
          </div>
        ) : null}

        {snapshot.activeGrant ? (
          <section className="shopping-canvas__authority" aria-live="polite">
            <div><ShieldCheck /><span><strong>Approved. Waiting for your browser agent.</strong><small>One exact cart action is available once. It cannot alter the reviewed items.</small></span></div>
            <button type="button" onClick={() => act(() => control.revokeCartGrant(snapshot.activeGrant!.id))}>Revoke</button>
          </section>
        ) : null}

        {snapshot.cart.lines.length ? (
          <section className="shopping-canvas__cart" aria-labelledby="cart-title">
            <ShoppingBagOpen aria-hidden="true" />
            <div className="shopping-canvas__cart-body">
              <p className="shopping-canvas__eyebrow">Shopping complete</p>
              <h2 id="cart-title" ref={cartHeadingRef} tabIndex={-1}>Your exact cart is ready.</h2>
              <p>{snapshot.cart.lines.length} items · {money(snapshot.cart.subtotalCents)} · Arrives Friday · $0 charged.</p>
              <div className="shopping-canvas__cart-proof" aria-label="What just happened">
                <div><small>Store work</small><strong>Searched, checked and repaired the look</strong></div>
                <div><small>Your decision</small><strong>Approved four exact items</strong></div>
                <div><small>Boundary</small><strong>No checkout, payment or order</strong></div>
              </div>
              <ul aria-label="Exact cart lines">
                {snapshot.cart.lines.map((line) => (
                  <li key={line.variantId}>
                    <span><strong>{line.name} · {line.size}</strong><small>{line.sku} · Arrives {shortDate(snapshot.review!.fulfilmentQuotes.find((quote) => quote.variantId === line.variantId)!.arrivesOn)}</small></span>
                    <strong>{money(line.unitPriceCents)}</strong>
                  </li>
                ))}
              </ul>
              <p className="shopping-canvas__order-boundary">No order has been placed. Checkout stays with you.</p>
            </div>
            <button type="button" disabled>Continue to checkout</button>
          </section>
        ) : null}

        <div className="shopping-canvas__reset-row">
          <button type="button" onClick={reset}>Reset experience</button>
          {actionError ? <p role="alert">{actionError}</p> : null}
        </div>

        <details className="shopping-canvas__technical">
          <summary>See how WebMCP powers the agent version</summary>
          <div>
            <p>Seven permanent tools expose exact retailer facts and the shared revisioned canvas. The activity panel reports observable tool actions and results—not private model reasoning.</p>
            <p>Human approval adds one temporary <code>{APPLY_APPROVED_CART_TOOL_NAME}</code> tool. It closes over the exact reviewed patch, works once, then disappears. There is no checkout, payment or order tool.</p>
            <p>Catalogue fixture: 12 styles, 30 canonical variants and two delivery destinations. The imagery is a fictional product styling preview, not a virtual try-on.</p>
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
