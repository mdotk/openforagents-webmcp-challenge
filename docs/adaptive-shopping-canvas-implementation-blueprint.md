# Adaptive Shopping Canvas implementation blueprint

Status: implemented, deployed and Stage 3 qualified as the separate `?experience=shopping` candidate. Deterministic, responsive, native-tool, external-agent, one-use authority and unfilmed budget-variation gates pass. The root route remains unchanged and Stage 4 is not authorized.

Date: 1 September 2026.

This document is the build contract for deriving a new challenge candidate
from the qualified Shared Fitting Room patterns. The candidate must begin on a
separate route so it does not overwrite the existing prototype or reuse that
prototype's qualification by implication. This document does not make the new
experience live, replace the root route, establish external-agent compatibility
or authorize a Devpost submission, public video or challenge terms acceptance.

## Product thesis

> A retailer page turns a person's intent into a cart-ready visual plan,
> repairs that plan when delivery reality changes and applies only the exact
> cart change the person approves.

The five-second hook is not "AI recommends an outfit." It is:

> The purchasable look repairs itself when reality changes.

The page, the agent and the person share one revisioned shopping state:

- The person supplies taste, a deadline, a budget and one pinned item.
- The retailer supplies exact product, variant, price, stock and delivery
  facts.
- The external browser agent interprets the brief, coordinates the products
  and replans when a hard constraint fails.
- The page makes the result and every changed fact visible.
- The person approves one immutable cart proposal.
- A temporary WebMCP capability applies that approved proposal once.
- Checkout, payment and order placement remain human-only.

## Why this is an evolution, not a restart

The existing Shared Fitting Room already proves several difficult foundations:

- Browser-local revisioned state shared by the page and WebMCP tools.
- Structured retailer-authored product facts.
- A person-controlled pin the agent cannot override.
- Deterministic availability invalidation and repair.
- Exact review creation without an immediate commercial action.
- A temporary one-use tool registered only after human approval.
- A tested seven-to-eight-to-seven tool lifecycle.
- Replay, expiry, revocation and stale-revision protection.
- A manual fallback that does not claim native WebMCP support.

The new work changes the product story and visible outcome. It does not discard
those learned contracts. The smallest safe implementation should copy the
established external-store and registration patterns into a focused parallel
shopping slice. It should not rewrite the already-qualified fitting-room files
or extract a new generic framework merely to share a small amount of code.

The root experience, `?experience=fitting-room` and
`?experience=rack-rescue` remain unchanged until the new candidate passes its
own automated, native-browser and external-agent gates.

## Canonical experience

### Initial visible brief

The page starts with one readable request and no chat transcript:

> Wedding Saturday. Make it unforgettable, not costume. Under $350. Arrive by
> Friday. Keep my blue boots.

The page also shows only the confirmed facts the agent needs:

- Clothing size: M.
- Shoe size: 8.
- Delivery deadline: Friday.
- Budget: $350.
- Owned item: cobalt-blue ankle boots.
- Initial delivery destination: Home.

The blue boots are an owned item. They are pinned visual context, excluded from
the purchase subtotal and never represented as a product the retailer will
sell, reserve or add to the cart.

### 90-second demonstration

| Time | What the viewer sees | What happens |
| --- | --- | --- |
| 0–4 seconds | A cold open shows the actual completed state from this recorded run, labelled `Result from this run`. | This is a truthful preview of the exact SKU assets and cart state reached later in the recording, not an aspirational image. |
| 4–12 seconds | The demo resets to the brief, empty styling preview and pinned boots. | The person gives the browser agent one objective from the visible page. |
| 12–27 seconds | The product field narrows and exact product cutouts appear only after the real tool calls return. | The agent reads context, searches structured retailer facts, inspects variants and checks fulfilment. Idle waiting may be shortened without reordering calls. |
| 27–35 seconds | One coherent first look dominates the page. A persistent strip shows `Blue boots pinned`, `Arrives Friday` and `$344 / $350`. | The retailer validates the complete draft. Nothing has been added to the cart. |
| 35–43 seconds | The person changes the visible delivery destination from `Home` to `Event hotel`. | This is a human page action. It increments the shopper and fulfilment-context revisions and invalidates the old delivery quotes. |
| 43–50 seconds | Only the selected jacket turns unavailable: `Your size now arrives Monday. Needed Friday.` | The current destination-specific fulfilment check returns a structured failure. Other items and the pinned boots remain visible and unchanged. |
| 50–68 seconds | The failed jacket is replaced as the dominant visual change. A smaller accessory substitution appears in the budget strip because the first valid jacket replacement would otherwise exceed the budget. | The agent searches, inspects and verifies alternatives, then updates only the affected look-board lines. |
| 68–77 seconds | The revised look returns to green and an exact cart proposal appears. | The agent requests review for the current revisions. No cart change exists yet. |
| 77–82 seconds | The person approves the proposal. The page prioritizes the unchanged proposal and pending cart state; native-tool evidence may appear only in a compact supporting inset. | Human approval registers the exact one-use cart capability. |
| 82–90 seconds | The external agent invokes the approved capability. The exact four-item cart appears and the final look remains visible. | The result settles, the temporary capability disappears and checkout remains a normal human page control. |

The final frame holds on the completed look, exact cart and the statement:

> Current look. Current store state. Your approval.

The implementation must not claim that the fictional catalogue or delivery
matrix is connected to a real retailer. Public challenge copy should describe
it as a deterministic fictional retailer demonstration.

The application itself begins empty and never renders a look before the agent
has selected exact products. Only the edited video may use the clearly labelled
cold open, and that preview must come from the same truthful recorded run.

The canvas carries a readable persistent label such as `Fictional retailer
demo`. The disclosure must remain visible in the silent recording and may not
be relegated to submission notes.

## Truthful visual model

The experience is a **styling preview**, not virtual try-on.

### Required presentation

- Keep the person's source photograph or neutral portrait unchanged.
- Assemble exact retailer product cutouts on a separate premium editorial look
  board, flat lay or neutral mannequin silhouette.
- Map every retailer cutout permanently to one exact product/color SKU.
- Treat size as a sellable variant of that SKU, not as a different generated
  garment image.
- Map the owned blue boots to one exact provenance-recorded owned-item asset,
  labelled `Owned item provided for this demo`. It is not a retailer SKU and
  must never be represented as one.
- When replanning, crossfade only the failed cutout and any deliberately
  coordinated substitution.
- Make an item inspection reveal the unmodified packshot, SKU, color, selected
  size, price, stock state and current delivery promise.
- Use generated imagery only for decorative backgrounds or clearly fictional
  editorial context, never as evidence of an exact sellable product.

### Prohibited presentation

- Do not composite products onto the person's body unless the source image
  genuinely depicts those exact products.
- Do not claim fit, drape, sizing accuracy, body scanning or virtual try-on.
- Do not morph one garment into another through invented intermediate product
  imagery.
- Do not use a model image that merely resembles the exact product cutout.
- Do not call a deterministic fixture "live external inventory."

The visual wow must come from coherent art direction, exact product state and
the synchronized failure-and-repair sequence, not an unsupported try-on claim.

## Minimum credible fictional catalogue

The existing six-product catalogue is too small for the adopted claim. The
smallest credible replacement contains:

- Four purchasable outfit slots: hero garment, layer, footwear or lower-body
  piece, and accessory. The owned blue boots may satisfy the footwear role
  without becoming a cart line.
- At least three plausible candidates per unfilled slot.
- Twelve product styles in total.
- At least three sizes for every sized style.
- Approximately 30–40 canonical variant records after one-size accessories.
- Two delivery destinations with materially different promises.
- One budget close enough to the preferred look that a valid replacement
  requires a coordinated second substitution.

The data chain must remain explicit:

```text
product style
  -> exact color SKU and product asset
  -> canonical size variant
  -> current quantity
  -> destination-specific delivery promise
  -> exact cart variant identifier
```

The catalogue must contain, at minimum:

- A visually preferred jacket in size M that arrives at Home by Friday but at
  the Event hotel on Monday.
- A similar size-M replacement that reaches the hotel by Friday but costs
  more.
- A cheaper accessory replacement that allows the revised complete look to
  remain under $350.
- An on-time jacket whose size M is unavailable.
- An in-size jacket that exceeds the budget even after the cheapest valid
  accessory substitution.

This prevents the journey from reducing to one authored outfit and one obvious
backup.

## Canonical example arithmetic

The final seeded data may change during asset production, but the reasoning
shape must remain:

```text
First valid look                         $344
Friday replacement jacket               +$18
Cheaper compatible accessory            -$16
Revised valid look                       $346
Budget                                   $350
```

Every displayed price, subtotal, delivery date and proposed cart line must be
derived from the same canonical fixture. No text-only total may be maintained
separately from the domain calculation.

## State model

The immutable public snapshot should contain:

- `session_id`: opaque browser-session identifier.
- `revision`: monotonically increasing overall revision.
- `catalogue_revision`: immutable catalogue fixture identity.
- `availability_revision`: current quantity revision.
- `delivery_matrix_revision`: stable identity of the fictional destination and
  delivery fixture.
- `fulfilment_context_revision`: current destination/deadline context revision.
- `shopper_context_revision`: brief, sizes, deadline, budget, owned items and
  delivery destination revision.
- `look_revision`: selected retailer variants and human locks.
- `cart_revision`: current browser-local cart revision.
- `brief`: the visible natural-language request.
- `hard_constraints`: confirmed sizes, deadline, budget, destination and
  exclusions.
- `style_preferences`: person-confirmed or agent-interpreted descriptive
  preferences, visibly distinguishable from retailer facts.
- `owned_items`: visible context excluded from cart totals.
- `look`: ordered product variants and rationale summaries.
- `validation`: current structured results and failures.
- `cart`: current exact browser-local cart.
- `review`: immutable proposed cart patch or `null`.
- `active_grant`: approved one-use authority or `null`.
- `activity`: bounded, human-readable state transitions.

Money uses integer cents and an explicit currency. Dates use ISO strings.
Product and variant identifiers are canonical. Names, addresses, payment
details and external accounts are unnecessary.

Every fulfilment quote records `quote_id`, `variant_id`, `destination_id`,
`needed_by`, `arrives_on`, `quoted_at_revision`, `availability_revision`,
`delivery_matrix_revision` and `fulfilment_context_revision`. A quote is fresh
only while every bound revision still matches. Quote identifiers are derived
deterministically from those fields; the read-only fulfilment tool does not
mutate application state merely to remember a check. No wall-clock freshness
claim is required.

The one-use grant has an `expires_at` produced through an injected deterministic
clock. Tests use a fake clock. The page also offers explicit revocation. Any
change to the brief, destination, deadline, size, look, availability, delivery
matrix or cart invalidates a pending review or active grant bound to the
previous revision. Product prices remain immutable fixture facts in this
challenge build; there is no unsupported `PRICE_CHANGED` path.

## WebMCP contract

Every schema sets `additionalProperties: false`. Results remain bounded and
return the revisions required by subsequent calls. The external model reasons
over facts; the page must not expose `recommend_outfit`, `choose_best`,
`repair_look` or another tool that encodes the solution.

The read-only annotation is true only for `read_shopper_context`,
`search_products`, `inspect_products`, `check_fulfilment` and
`read_shared_look`. It is false for `update_shared_look`,
`request_cart_review` and the temporary `apply_approved_cart` tool.

Expected business conflicts return typed structured results such as
`DELIVERY_CHANGED`, `OUT_OF_STOCK`, `SIZE_UNAVAILABLE`, `BUDGET_EXCEEDED`,
`MISSING_FULFILMENT_QUOTE`, `STALE_REVISION`, `GRANT_INVALID`,
`GRANT_EXPIRED` and `REVIEW_INVALIDATED`. They do not become ambiguous generic
success text.

Expected conflicts are normal structured results rather than thrown errors:

```ts
type ShoppingToolResult<T> =
  | { ok: true; data: T; revisions: ShoppingRevisions }
  | {
      ok: false
      error: { code: ShoppingConflictCode; message: string; details?: unknown }
      state_changed: false
      revisions: ShoppingRevisions
    }
```

Malformed inputs, unavailable browser APIs and unexpected runtime faults remain
execution errors. Every successful mutation and recoverable conflict returns
the current overall revision plus the relevant scoped revisions.

### Seven permanent tools

#### 1. `read_shopper_context`

Input: closed empty object.

Returns the visible brief, confirmed constraints, style preferences, owned
items, current destination and `shopper_context_revision`.

Read-only. It exposes no hidden customer data and does not claim access to the
agent's private conversation.

#### 2. `search_products`

Input fields:

- `categories`: one or more retailer category enums.
- `colors`: optional retailer color enums.
- `style_tags`: optional retailer-authored style enums.
- `sizes`: required canonical size enums where relevant.
- `max_item_price_cents`: optional non-negative integer.
- `exclude_variant_ids`: zero to twelve canonical variant identifiers.
- `limit`: integer from 1 to 12.

Returns bounded product summaries, total matches and catalogue, availability
and delivery-matrix revisions. It filters only retailer-authored fields and
does not accept the unrestricted shopping brief.

#### 3. `inspect_products`

Input:

- `product_ids`: one to eight unique canonical product identifiers.

Returns exact color SKU assets, variants, sizes, prices, quantities, style
facts and product descriptions. Unknown or duplicate identifiers fail.

#### 4. `check_fulfilment`

Input:

- `variant_ids`: one to eight unique canonical variant identifiers.
- `destination_id`: current approved destination enum.
- `needed_by`: the confirmed deadline.

Returns quantity and delivery promise for every requested variant plus
one revision-bound quote record per variant, the applicable revisions and typed
failures. It does not choose substitutes.

The demo-critical conflict has this minimum shape:

```json
{
  "ok": false,
  "error": {
    "code": "DELIVERY_CHANGED",
    "variant_id": "variant-jacket-silver-m",
    "previous": { "destination_id": "home", "arrives_on": "2026-09-04" },
    "current": { "destination_id": "event-hotel", "arrives_on": "2026-09-07" },
    "needed_by": "2026-09-04"
  },
  "state_changed": false,
  "revisions": {
    "revision": 4,
    "availability_revision": 1,
    "delivery_matrix_revision": 1,
    "fulfilment_context_revision": 2
  }
}
```

#### 5. `read_shared_look`

Input: closed empty object.

Returns the current selected variants, owned items, human locks, look revision,
subtotal, validation, review state, cart summary and current overall and scoped
revisions. It never returns an active grant secret.

#### 6. `update_shared_look`

Input:

- `expected_revision`: current overall revision.
- `add_variant_ids`: zero to four unique canonical variant identifiers.
- `remove_variant_ids`: zero to four unique canonical variant identifiers.

Updates the visible styling preview, not the cart. It rejects stale revisions,
duplicate operations, unknown variants and incompatible duplicate slots. Owned
items are absent from this mutation schema, so the tool cannot remove them. It
recomputes validation, invalidates stale authority and returns the new overall
and scoped revisions.

#### 7. `request_cart_review`

Input:

- `expected_revision`: current overall revision.
- `look_revision`: exact current look revision.
- `cart_revision`: exact current cart revision.
- `quote_ids`: one current quote identifier for every proposed retailer
  variant.
- `summary`: plain-language explanation with a 240-character maximum.
- `rationales`: one to four closed objects containing the exact current
  `variant_id` and a reason with a 160-character maximum.

Requires a currently valid look and one verifiable revision-fresh fulfilment
quote identifier for every retailer variant. It creates one
visible immutable proposal containing the exact additions and removals, sizes,
prices, delivery promises, subtotal and revisions.

It returns:

```json
{
  "cart_changed": false,
  "charged_cents": 0,
  "requires_human_approval": true
}
```

No cart mutation or reservation occurs.

### Expected conflict ownership

| Tool | Recoverable structured conflicts |
| --- | --- |
| `read_shopper_context` | None. |
| `search_products` | `INVALID_FILTER`. |
| `inspect_products` | `UNKNOWN_PRODUCT`. |
| `check_fulfilment` | `UNKNOWN_VARIANT`, `DESTINATION_MISMATCH`, `DELIVERY_UNAVAILABLE`. |
| `read_shared_look` | None. |
| `update_shared_look` | `STALE_REVISION`, `UNKNOWN_VARIANT`, `SLOT_CONFLICT`. |
| `request_cart_review` | `STALE_REVISION`, `MISSING_FULFILMENT_QUOTE`, `OUT_OF_STOCK`, `SIZE_UNAVAILABLE`, `DELIVERY_CHANGED`, `BUDGET_EXCEEDED`, `REVIEW_INVALIDATED`. |
| `apply_approved_cart` | `GRANT_INVALID`, `GRANT_EXPIRED`, `STALE_REVISION`, `OUT_OF_STOCK`, `DELIVERY_CHANGED`, `REVIEW_INVALIDATED`. |

### Temporary tool: `apply_approved_cart`

This tool does not exist until the person approves the exact visible review.
Its input is a closed empty object. It closes over the immutable approved cart
patch; the caller cannot alter variants, sizes, quantities, prices or delivery
scope.

Before its commit point it verifies:

- The execution signal has not been cancelled.
- The grant remains active, unexpired and unused.
- Shopper context, look, catalogue, availability, fulfilment and cart revisions
  still match.
- Every variant is still available at the approved price and delivery promise.
- The proposed patch still produces the displayed total.

On success it:

1. Applies the exact approved additions and removals atomically to the
   browser-local cart.
2. Returns the new cart revision, exact cart lines, total,
   `charged_cents: 0` and `authority_consumed: true`.
3. Settles the result before removing its own registration.
4. Returns the native tool inventory to seven.

Replay, stale execution, revocation, expiry and cancellation before commit
must leave the cart unchanged. Cancellation after commit must settle to an
unambiguous result visible on the page.

### Explicitly absent tools

The application never registers tools for:

- Human approval.
- Changing the person's pinned owned item.
- Checkout.
- Payment.
- Address entry.
- Order placement.
- General unrestricted browsing or recommendations.

## Authority lifecycle

```text
Initial
  7 permanent tools
  empty cart
  no review or grant

Agent builds and validates a shared look
  7 permanent tools
  visible styling preview
  empty cart

Agent requests cart review
  7 permanent tools
  exact proposal visible
  cart unchanged

Person approves exact proposal
  8 tools
  one immutable active grant
  cart unchanged

Agent invokes apply_approved_cart once
  exact cart patch applied
  result settled
  grant consumed
  temporary tool removed
  7 permanent tools

Person may continue through visible checkout
  no checkout, payment or order WebMCP tool
```

`Keep editing`, `Decline` and `Approve this cart` are page-only human
transitions:

- `Keep editing` dismisses the pending review, increments the overall revision,
  creates no grant and leaves the look and cart unchanged.
- `Decline` records a declined review, increments the overall revision, creates
  no grant and leaves the cart unchanged.
- `Approve this cart` binds a grant to the exact review and current revisions.
  If temporary-tool registration fails, the page reports that failure, keeps
  the cart unchanged and allows the approval to be revoked or retried only
  through an explicit human action.

## Deterministic replan trigger

Use a visible human change rather than pretending that an external retailer
changed unexpectedly:

1. The first look is validated for destination `home` and deadline Friday.
2. The person selects `Send to event hotel` through the page.
3. `shopper_context_revision` and `fulfilment_context_revision` increment. The
   stable `delivery_matrix_revision` does not change.
4. The original preferred jacket returns `DELIVERY_CHANGED`: Monday at the
   hotel rather than Friday at home.
5. The page invalidates any stale validation, review or grant.
6. The agent re-reads the context and fulfilment facts.
7. The first valid replacement jacket raises the outfit above the budget.
8. The agent changes one accessory as a coordinated second substitution.
9. It verifies the final variants for the hotel and requests review.

The delivery matrix is deterministic fictional store state. Reset restores the
initial destination, fixtures, revisions, look, cart, review, grant and clean
set of seven permanent tools.

## Page experience

The final interface is one continuous editorial shopping canvas, not six
storyboard cards.

### Persistent constraint strip

Always visible after the brief is accepted:

- `Blue boots pinned`.
- `Needed Friday`.
- `$350 maximum`.
- Current delivery destination.

### Main canvas

- Uses the majority of the viewport.
- Shows the styling preview and exact product cutouts together.
- Keeps every unchanged product visually stable during replanning.
- Shows failure in plain language and not through color alone.
- Makes the changed product and its replacement understandable without hover.

### Supporting evidence

- Exact product name, color SKU, selected size, price and delivery date.
- One compact line stating the actual catalogue/variant count; no inflated
  number.
- Optional product detail, not a permanent technical sidebar.
- No raw tool payloads, activity ledger or revision identifiers in the primary
  customer view.

### Review state

- Shows the complete final cart proposal, not only an abstract total.
- Highlights which look-board choices changed after the delivery failure.
- States that the cart is still unchanged.
- Offers `Keep editing`, `Decline` and `Approve this cart`.
- After approval, clearly states that the agent can apply only this proposal
  once.

### Final state

- Shows exact cart lines, current delivery promise and total.
- States `No order has been placed`.
- Offers an ordinary human `Continue to checkout` control.
- Does not expose checkout through WebMCP.

## Implementation mapping

The expected authoritative seams are:

- `src/types/shopping.ts`: canonical product, color SKU, variant, fulfilment,
  shared-look, cart, review, grant and snapshot types.
- `src/domain/shopping.ts`: immutable catalogue fixtures, delivery matrix,
  external-store state machine, validation, review and one-use cart commit.
- `src/webmcp/register-shopping-tools.ts`: seven permanent shopping tools,
  temporary `apply_approved_cart`, abort-signal lifecycle and unsupported-
  browser fallback.
- `src/ShoppingApp.tsx`: the continuous editorial shopping canvas and exact
  cart review, derived from the authoritative snapshot rather than a parallel
  React state machine.
- `src/ShoppingApp.css`: the new responsive visual system.
- `src/domain/shopping.test.ts`,
  `src/webmcp/register-shopping-tools.test.ts` and
  `src/ShoppingApp.test.tsx`: domain, registration and visible-journey proof.
- `src/main.tsx`: add a separately addressed `?experience=shopping` branch
  while leaving every existing route untouched until promotion.
- `src/domain/index.ts`, `src/types/index.ts` and `src/webmcp/index.ts`: export
  only the new focused slice required by the app and tests.
- `public/shopping/`: provenance-recorded exact product assets plus only the
  minimal decorative imagery required by the selected direction.

Reuse the existing external-store mechanics, immutable snapshot pattern,
registration/disposal shape, test doubles, schema parsing and typed-conflict
approach. Do not refactor the mission, fitting-room and Rack Rescue slices into
a shared framework during the challenge build.

Do not create a backend, account system, model proxy, product-management UI or
general commerce framework for this entry.

## Implementation sequence

### Stage 1: domain and contract

1. Freeze the current root experience and qualification evidence.
2. Create a parallel `?experience=shopping` vertical slice without changing
   the root, fitting-room or Rack Rescue journeys.
3. Add the 12-style, 30–40-variant canonical catalogue and two-destination
   delivery matrix.
4. Add the revisioned styling preview, cart and immutable cart-review model.
5. Implement the destination-change failure and coordinated substitution
   validation.
6. Implement the exact one-use cart patch using the proven temporary-tool
   lifecycle.
7. Register the seven permanent tools and temporary tool.
8. Pass domain and registration tests before substantial visual work.

### Stage 2: truthful visual system

1. Produce or source exact product cutouts with recorded provenance.
2. Bind every asset to one canonical color SKU.
3. Build the continuous editorial look board.
4. Implement the destination failure and in-place repair transition.
5. Implement the exact review and final cart states.
6. Preserve an honest manual fallback for browsers without WebMCP.

### Stage 3: qualification

1. Run lint, all deterministic tests, TypeScript and the production build.
2. Verify desktop, 390 px and 320 px layouts.
3. Verify native tool discovery and schemas in the supported challenge browser.
4. Run the complete model-driven journey with one supported external browser
   agent.
5. Prove the seven-to-eight-to-seven lifecycle, exact cart mutation, replay
   rejection and unchanged checkout boundary.
6. Run at least one unfilmed constraint variation to show the catalogue is not
   hard-coded to the recorded bundle.

### Stage 4: promotion

Only after Stage 3 is green:

1. Replace the root experience with this single coherent candidate.
2. Update the README, public description, screenshots and video plan to match
   the implemented facts.
3. Re-run the public live journey and repository checks.
4. Return to Matt before accepting Devpost terms, publishing the YouTube video
   or submitting the final entry.

## Acceptance gates

### Product and visual

- A muted viewer describes the experience as "the purchasable look repaired
  itself when delivery failed," not merely "AI recommended clothes."
- The cold-open result is labelled as the result of the same recorded run; the
  application itself renders no look before exact agent-selected product data
  exists.
- The first transformation is understandable inside five seconds once the
  selected product facts have returned.
- The delivery failure, replacement asset, variant facts, total and cart
  proposal update together.
- Unchanged items and the owned boots remain visibly stable.
- The jacket repair is the dominant visual change; the accessory substitution
  appears as a smaller budget-preserving consequence rather than a competing
  hero animation.
- `Fictional retailer demo` remains readable on the customer canvas and in the
  silent recording.
- No visual or copy implies virtual try-on or guaranteed fit.

### Domain

- Every sellable variant uniquely references one canonical product/color SKU
  and exact asset. Several size variants may correctly share that SKU asset.
  Price, quantity, delivery quote and cart identifiers remain bound to the
  exact variant.
- The owned-boots asset has separate provenance and is never emitted as a
  retailer SKU or cart line.
- The exact first look is valid at Home and invalid at the Event hotel for one
  evidenced delivery reason.
- The final look requires two coordinated substitutions and passes every
  remaining constraint.
- All totals derive from canonical integer-cent values.
- Stale revisions fail without partial state changes.

### WebMCP and authority

- Exactly seven permanent closed-schema tools are registered initially.
- No tool encodes the outfit recommendation.
- Requesting review changes no cart state.
- Human approval alone creates `apply_approved_cart`.
- The temporary tool accepts no editable product arguments.
- One invocation applies the exact displayed proposal once and then disappears.
- Replay, stale scope, revocation, expiry, out-of-stock or delivery failure and
  cancellation before commit leave the entire cart unchanged, with no partial
  patch.
- Cancellation after commit settles to one unambiguous visible cart result
  before the temporary registration is removed.
- Temporary-tool registration failure is visibly reported while the cart stays
  unchanged and the approval remains revocable.
- `Keep editing` and `Decline` create no grant and leave the cart unchanged.
- Checkout, payment and order tools never appear.
- Unsupported browsers preserve the complete manual journey without claiming
  that native tools were registered or invoked.

### External-agent proof

- One supported external browser agent reads the visible brief and current
  retailer facts through native WebMCP.
- It builds the first look through several tool calls rather than a hidden
  solution tool.
- It observes the destination change and identifies the exact failed delivery
  constraint.
- It preserves the owned boots, deadline and budget while coordinating both
  substitutions.
- It requests review without changing the cart.
- After human approval it discovers and invokes the temporary tool.
- It observes the final cart revision and the inventory return to seven tools.
- Tool discovery, tool execution, model reasoning and page behavior are
  reported as separate evidence.

### Judge variation

Before promotion, change one unannounced input such as budget, size,
destination or deadline. The agent must produce a different valid outcome from
the same catalogue rather than replaying the recorded bundle.

## Scope exclusions

Do not add:

- A real retailer integration or production inventory claim.
- Accounts, authentication or saved personal addresses.
- Payments, checkout automation or order placement.
- An embedded Assistant, model API key or site-owned recommendation model.
- A body scan, photographic try-on or fit guarantee.
- A catalogue admin, telemetry dashboard or analytics project.
- Multi-tenant infrastructure, billing or a generalized commerce platform.
- A physical display or hardware dependency.
- More than one public challenge experience.

## Stop conditions

Do not promote this candidate if any of the following remains true:

- Product visuals cannot be mapped truthfully to exact SKUs.
- The filmed result requires a hard-coded outfit branch hidden from the agent.
- The model cannot complete the native multi-call replan reliably.
- The delivery conflict is communicated only through narration or developer
  tooling.
- The cart can change before approval or beyond the displayed proposal.
- The final experience needs a long explanation to distinguish it from an AI
  stylist.
- The video must show a result before the corresponding exact product facts
  exist or cannot identify that result as a truthful cold open from the same
  run.

If the external agent cannot refresh the temporary tool inventory reliably,
diagnose that browser/client limitation before changing the authority model.
Do not replace the bound temporary capability with a permanently available
general cart-mutation tool merely to simplify recording.
