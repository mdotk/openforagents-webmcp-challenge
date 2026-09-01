# Proposed shared fitting-room WebMCP contract

Status: implemented as a separately addressed prototype and qualified in
Chrome; not the current challenge entry. Its evidence remains scoped to that
prototype. New implementation work follows the
[Adaptive Shopping Canvas blueprint](adaptive-shopping-canvas-implementation-blueprint.md).

This document records the minimum technical boundary for the shared
fitting-room prototype. It does not describe the current Launch Window A-01
application or establish compatibility with every browser or agent.

## Contract principles

1. The page owns the catalogue, inventory, fitting-room and authority state.
2. The agent interprets preferences but receives product facts from typed
   retailer fields.
3. Human and agent actions use the same domain functions and update the same
   visible fitting room.
4. Every state-changing call uses the current fitting-room revision.
5. Human approval binds one immutable review; it never grants a general
   reservation capability.
6. `reserve_approved_look` does not exist before approval and disappears after
   use, revocation, expiry or scope invalidation.
7. Checkout, payment and order placement are never registered as WebMCP tools.

## Minimum state model

The browser-local store must expose immutable snapshots containing:

- `session_id`: opaque identifier for the current fictional shopping session.
- `revision`: monotonically increasing state revision.
- `catalogue_revision`: immutable catalogue fixture identity.
- `availability_revision`: current fictional inventory revision.
- `shopper_profile_revision`: revision of the visible size, deadline and owned
  item context.
- `brief`: the person's original request, saved through the visible page.
- `hard_constraints`: person-confirmed deadline, fulfilment, size, budget,
  contact-zone, movement and excluded-category fields saved through the page.
- `style_preferences`: descriptive preferences interpreted from the brief and
  confirmed or amended by the person.
- `owned_items`: visible items to reuse and exclude from the purchase total.
- `board`: ordered retailer items, owned items, human locks and subtotal.
- `validation`: current results and structured failure reasons.
- `review`: the exact proposed hold, or `null`.
- `active_grant`: the approved one-use authority, or `null`.
- `reservation`: the completed simulated hold, or `null`.
- `activity`: ordered, human-readable state changes.

Currency values use integer cents and an explicit currency code. Product lines
use canonical item and variant identifiers. Names or addresses are not needed.

## Seven permanent tools

Every schema must set `additionalProperties: false`. Read-only annotations must
match actual behavior. Tool results must be bounded and must return current
revisions where a later action depends on them.

### 1. `read_shopper_context`

Purpose: return the visible saved brief, confirmed context, hard constraints,
style preferences, owned items and profile revision.

Input:

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

Behavior:

- Read-only.
- Returns no hidden customer information.
- Makes clear which fields are retailer facts, person-confirmed constraints and
  subjective preferences.
- Does not claim access to an external agent's private conversation.

### 2. `search_products`

Purpose: query retailer-authored attributes after the agent has interpreted the
person's request.

Input fields:

- `categories`: one or more approved product-category enums.
- `colors`: one or more retailer-authored color enums.
- `style_tags`: retailer-authored descriptive tags such as `tailored`,
  `dramatic`, `gothic`, `minimal` or `romantic`.
- `sizes`: approved variant-size enums.
- `pickup_on`: the required fixture date.
- `excluded_contact_zones`: approved body-zone enums.
- `minimum_movement`: an approved movement-rating enum.
- `exclude_categories`: categories already owned or not wanted.
- `max_item_price_cents`: optional integer ceiling.
- `limit`: integer from 1 to 12.

Behavior:

- Read-only.
- Does not accept an unrestricted natural-language shopping brief.
- Filters only structured fictional catalogue fields.
- Returns item identifiers, concise facts, total matches and the current
  catalogue and availability revisions.
- May update the visible search result view, but does not change catalogue,
  inventory, fitting-room or authority state.
- Does not claim that the deterministic search engine understands taste.

### 3. `inspect_products`

Purpose: inspect the facts required to compare a bounded set of products.

Input fields:

- `item_ids`: one to eight canonical product identifiers.

Behavior:

- Read-only.
- Returns price, variants, Friday quantity, pickup eligibility, contact zones,
  movement rating, categories, colors, style tags and short descriptions.
- Rejects unknown or duplicate identifiers.

### 4. `read_fitting_room`

Purpose: read the outfit currently shared by the person, page and agent.

Input: closed empty object.

Behavior:

- Read-only.
- Returns the current revision, ordered items, owned items, human locks,
  subtotal, current constraints, validation summary, review status and
  reservation status.
- Never returns an active grant secret; the browser tool lifecycle itself is
  the available capability signal.

### 5. `update_fitting_room`

Purpose: make a reversible change to the visible outfit board.

Input fields:

- `expected_revision`: current non-negative integer revision.
- `add_item_ids`: zero to four canonical product identifiers.
- `remove_item_ids`: zero to four canonical product identifiers.

Behavior:

- State-changing but reversible.
- Rejects stale revisions, duplicate operations, unknown variants, attempts to
  remove human-locked items and updates that exceed the board limit.
- Recomputes the subtotal from canonical catalogue prices.
- Invalidates any review or grant when a bound field changes.
- Updates the same board displayed to the person.

Human UI changes must call the same domain store. A person may pin, unpin or
remove an item without using an agent. Human pinning is not exposed as a tool;
the agent must observe and respect those locks.

### 6. `validate_fitting_room`

Purpose: validate the current revision against the person's hard constraints
and current fictional availability.

Input fields:

- `expected_revision`: current non-negative integer revision.

Behavior:

- Read-only with respect to the outfit and authority state.
- Returns `valid`, current revisions and structured reasons such as
  `BUDGET_EXCEEDED`, `SIZE_UNAVAILABLE`, `PICKUP_UNAVAILABLE`,
  `CONTACT_ZONE_CONFLICT`, `MOVEMENT_REQUIREMENT_FAILED`,
  `EXCLUDED_CATEGORY_PRESENT` or `REQUIRED_CATEGORY_MISSING`.
- Does not silently modify the board or relax a rule.
- Blocks a reservation review while any hard rule fails.

The deterministic demo inventory event is a separate application fixture, not
a hidden consequence of validation. When it occurs, the page increments
`availability_revision`, labels it **Demo inventory update** and invalidates
reviews based on the previous availability revision.

### 7. `request_reservation_review`

Purpose: prepare an exact review for the current valid look without holding
stock.

Input fields:

- `expected_revision`: current non-negative integer revision.
- `hold_minutes`: the single allowed fixture value, `15`.
- `pickup_slot`: the approved Friday fixture slot.

Behavior:

- State-changing because it creates a visible review proposal.
- Requires the current fitting-room revision to pass validation against the
  current availability revision.
- Records exact item and variant identifiers, sizes, prices, currency, subtotal,
  pickup slot, hold duration, profile revision, fitting-room revision and
  availability revision.
- Returns `hold_created: false`, `charged_cents: 0` and
  `requires_human_approval: true`.
- Does not register or execute a reservation.

## Temporary tool: `reserve_approved_look`

### Registration

The page registers this tool only after the person approves the current review
through the visible interface.

Its input schema is a closed empty object:

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

The tool closes over the immutable approved review. The caller cannot alter
items, variants, sizes, prices, pickup time, duration or total.

Registration must use its own abort signal so use, revocation, expiry or scope
invalidation removes the tool independently of the seven permanent tools.

### Execution

Before the commit point, execution must verify:

- The signal has not been cancelled.
- The grant is still active and unused.
- The profile, fitting-room and availability revisions still match.
- Every item and variant is still present at its approved price.
- Every fictional quantity is sufficient.
- The approved pickup slot and subtotal still match.

On success it:

1. Creates one browser-session simulated hold.
2. Decrements only the fictional session quantities.
3. Returns a hold reference, expiry time, pickup date, exact items,
   `charged_cents: 0` and `authority_consumed: true`.
4. Consumes the grant.
5. Settles the result before removing the temporary registration.
6. Returns the tool inventory to seven.

A second execution, stale invocation or replay must fail without creating a
second hold.

Cancellation before the commit point must make no change. Cancellation after
the commit point must not create an ambiguous result: the reservation outcome
must settle and remain visible before registration is removed.

## Authority lifecycle

The required visible and browser-observable sequence is:

```text
Initial state
  7 permanent tools
  no review
  no grant
  no hold

Agent requests review
  7 permanent tools
  exact review visible
  no grant
  no hold

Person approves exact review
  8 tools
  one immutable active grant
  no hold

Agent uses reserve_approved_look once
  simulated hold created
  grant consumed
  temporary registration removed
  7 permanent tools

Person continues through visible checkout control
  no checkout or payment WebMCP tool
```

Decline, edit, inventory change, expiry and explicit revocation must leave or
return the inventory to seven without creating a hold.

## Deterministic demonstration data

The experience uses a frozen local catalogue and one explicit scripted fixture
event:

1. `FV-408` initially has one Friday unit.
2. After it has been added to the revised all-black look, the application
   applies the labelled demo inventory update.
3. Its Friday quantity becomes zero and `availability_revision` increments.
4. Any review based on the previous revision is invalidated.
5. `FV-409` remains an eligible substitute with one Friday unit.

Resetting the demo restores the original fixtures, clears the board, review,
grant and hold, disposes all registrations, then registers one clean set of
seven permanent tools.

## First implementation gate

Before substantial visual work, a plain vertical slice must prove the complete
capability lifecycle on the deployed application:

1. A supporting challenge browser lists exactly seven permanent tools.
2. The agent or inspector reads the brief and catalogue.
3. A visible fitting-room revision can be created and validated.
4. A review request creates no hold and no eighth tool.
5. Human approval registers exactly `reserve_approved_look`.
6. The supporting browser can rediscover the tool after approval.
7. One invocation produces the expected simulated hold.
8. The invocation settles before the tool disappears.
9. The inventory returns to seven.
10. Replay, revocation, expiry and stale-revision paths create no hold.

If dynamic rediscovery is unreliable, stop before the visual build. Diagnose
whether an explicit supported rediscovery step solves the problem. Do not
weaken scope validation, add a general reservation tool or introduce new
infrastructure merely to preserve the dynamic animation.

The page must not register a `build_best_outfit`, free-form shopping or other
model-like convenience tool. The external model supplies interpretation and
planning. The site supplies bounded facts, shared state, validation and exact
authority. Keeping that boundary visible is part of the contract, not merely a
presentation choice.

## Product acceptance

The proposed replacement is ready for entry-level qualification only when:

- The permanent inventory contains exactly the documented seven tools with
  closed schemas and correct annotations.
- Search and inspection use only retailer-authored structured facts.
- The person can see and edit the same fitting room the tools read and change.
- Human locks and revisions are respected during replanning.
- The deterministic inventory update is visibly labelled.
- Invalid looks cannot reach approval.
- The review states the exact scope, $0 charge and absence of a current hold.
- Approval produces only the exact temporary reservation capability.
- Use, revocation, expiry and scope changes all remove it.
- Successful use creates one simulated hold and rejects replay.
- Checkout and payment remain human-only.
- Unsupported browsers have an honest manual fallback.
- Automated tests cover domain, UI and registration behavior.
- Lint, tests, TypeScript and the production build pass.
- Desktop, 390 px and 320 px layouts remain readable and operable.
- Native evidence names the tested browser and distinguishes tool discovery,
  execution and model-driven behavior.
- A complete external-agent run demonstrates interpretation, multi-step tool
  use, human-directed revision, stock-driven replanning and dynamic discovery
  of the temporary tool. Manual inspector calls alone do not satisfy this
  requirement.

Existing Launch Window A-01 qualification cannot be reused as evidence for
renamed tools, retailer state or the fitting-room authority lifecycle.

## Implementation order

1. Preserve the current Launch Window source history and qualification record.
2. Implement the plain domain and WebMCP vertical slice.
3. Pass the first implementation gate on the deployed challenge browser path.
4. Replace the mission interface with the shared fitting-room experience.
5. Add original, provenance-checked static garment assets.
6. Rewrite automated tests and public documentation for the implemented app.
7. Qualify discovery, reasoning journey, state synchronization, 7 → 8 → 7
   lifecycle, replay rejection and responsive presentation.
8. Prepare one coherent submission and video for the final implemented
   experience.

Do not describe the proposal as implemented, deployed, compatible or submitted
until the corresponding work and evidence exist.
