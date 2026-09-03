# Proposed shared fitting-room experience

Status: implemented as a separate prototype, not the current live experience.
It is now the technical predecessor to the
[Adaptive Shopping Canvas](adaptive-shopping-canvas-implementation-blueprint.md),
not the active product direction to promote unchanged.

The live challenge application at the root URL remains Launch Window A-01. The
fitting-room implementation is available on a separate query-parameter path
for evaluation and does not yet replace the entry's public experience.

## Decision

Replace the linear mission-control story with a fictional retailer where a
person and their browser agent assemble one complete occasion look together.

The concept is not an AI stylist that returns a recommendation. It is a shared,
revision-controlled fitting room:

- The person describes the occasion, practical limits and desired style.
- The agent translates that request into explicit constraints.
- The retailer supplies current, structured product and pickup facts.
- The agent searches, compares, assembles and revises a visible outfit.
- The person remains responsible for taste and approves the exact final look.
- Approval creates one temporary WebMCP reservation capability for that
  revision only.
- The capability works once and then disappears.
- Checkout and payment remain human-only.

This preserves the strongest technical idea in Launch Window A-01 while giving
the agent a task that requires interpretation, coordination and replanning.

## Adopted entry thesis

Proceed with the fitting-room concept as the preferred replacement candidate,
but do not promote it to the root URL or describe it as the challenge entry
until the independent browser-agent gate passes.

The entry is not:

- An AI stylist that returns an outfit suggestion.
- A Halloween-costume search page.
- A model pretending to know live prices, sizes or stock.
- A single `build_best_outfit` shortcut that hides the agent's work.
- A shared cart with a decorative approval step.

The entry is:

> A shared, revision-controlled fitting room where a person directs the taste,
> an external browser agent solves the changing shopping constraints, and the
> retailer exposes one exact commercial capability only after approval.

That positioning must remain consistent across the root experience, README,
submission copy, screenshots and video if the prototype is promoted.

## Competitive distinction

Fashion search alone is not a novel WebMCP contribution. The official WebMCP
material already describes tailored shopping, and other public demonstrations
already show agent-assisted product browsing and cart building.

The prototype therefore earns its place through the complete collaboration:

- The agent interprets subjective language but queries only structured,
  retailer-authored facts.
- The person and agent work in one visible, revisioned fitting room.
- A human pin changes what the agent may revise.
- A transparent inventory update invalidates a previously viable look.
- The agent must recover without silently relaxing a hard constraint.
- Human approval changes the browser's actual capability inventory from seven
  tools to eight for one exact action, then back to seven.
- The simulated hold visibly changes quantity, produces a reference and expiry,
  charges nothing and rejects replay.

If the recorded journey does not make those differences obvious, it is not
ready to replace Launch Window A-01, however polished the interface looks.

## Naming

`FableFit` is an internal codename only and must not be used as the public name.
A similar commercial name is already in use.

Use **Shared Fitting Room** as the descriptive working name until a final name
has been checked. `Friday Fitting` is a possible direction, not an approved
brand. Avoid technical names such as `The Agentic Fitting Room` in customer
copy unless research shows that the audience understands them.

## The customer request

The proposed demonstration begins with this request:

> Build me a couture vampire look for Saturday. Nothing tight around my neck,
> I need to dance, reuse my black boots, keep it under $250 and use only things
> I can pick up Friday. Make it fashion, not costume shop. Show me before
> reserving anything.

The person saves this request in the visible fitting-room brief alongside
explicit size, pickup, budget, contact-zone, movement and owned-item fields.
They then ask a compatible browser agent to build the look from the brief on
the page. There is no hidden embedded Assistant: the page exposes its saved
context through WebMCP and the external agent interprets it.

The request deliberately combines:

- A subjective aesthetic goal.
- A fixed size and pickup deadline.
- Comfort and movement requirements.
- A strict budget.
- An owned item that should not be purchased again.
- An instruction that prevents reservation before human review.

A deterministic product filter cannot decide what “couture vampire” or “make
it fashion” means. A language model can interpret those preferences, but it
must use the retailer's facts for price, size, movement, contact zones and
availability.

## Responsibilities

### The person decides

- Whether the proposed look expresses their taste.
- Which items must remain in the outfit.
- Whether a revised look is acceptable.
- Whether the exact final revision may be held.
- Whether to continue to checkout and payment.

### The agent handles

- Translating the request into hard constraints and style preferences.
- Searching and inspecting the retailer's structured product facts.
- Coordinating several items within one budget and deadline.
- Explaining why the proposed combination fits the request.
- Replanning when the person changes direction or availability changes.
- Requesting review only after the current look passes the retailer's checks.

There is deliberately no general natural-language product-search tool and no
`build_best_outfit` tool. The model must translate the person's language into
the retailer's bounded categories, colors, sizes, style tags, movement rating,
contact zones, pickup date and price constraints. The application must not
simulate that interpretation inside a deterministic search function.

### The retailer remains authoritative for

- Product names, categories and prices.
- Sizes and pickup quantities.
- Garment contact zones and movement ratings.
- The current fitting-room revision.
- Validation and availability results.
- The exact approved reservation scope.
- Grant expiry, consumption and replay rejection.

The agent must not invent those facts or silently relax a hard constraint.

## Why WebMCP belongs in this experience

An ordinary website remains usable through its product grid, filters, fitting
room, review panel and checkout link. WebMCP gives a compatible browser agent
typed access to the same changing retailer state.

The agent needs to:

- Query facts that would otherwise require brittle visual interpretation of
  many product cards.
- Read and update the same outfit the person sees.
- Observe the current fitting-room and inventory revisions.
- Receive deterministic validation reasons when a combination fails.
- Request approval without creating a hold.
- Discover a new capability only after the person approves one exact revision.

Uploading product descriptions into a chat would not reproduce the live
inventory, shared fitting-room state, revision checks or temporary authority.

The differentiating feature is therefore not clothing recommendation. It is
the interaction among agent reasoning, retailer facts, shared visible state,
human taste and one-use authority.

## Challenge fit

The challenge's [published criteria](https://webmcp.devpost.com/rules) evaluate
WebMCP leverage, execution, potential impact and creativity. Those criteria,
rather than assumptions about individual judges, are the design target.

- **WebMCP leverage:** live product facts, shared state, revision checks and
  temporary authority are exposed as typed page capabilities.
- **Execution:** the complete journey is visible, deterministic, resettable and
  independently testable in a supporting browser.
- **Potential impact:** delegated shopping is an ordinary task involving many
  constraints, comparisons and changing facts.
- **Creativity:** human taste changes the plan, an inventory event forces
  replanning, and approval changes the tool inventory for one exact action.

The [official WebMCP explainer](https://github.com/webmachinelearning/webmcp#e-commerce--tailored-shopping)
already uses tailored shopping as an example. A normal AI stylist or shared
cart would therefore be insufficient. The proposed contribution is the
revision-controlled collaboration and exact one-use reservation lifecycle.

## Ninety-second demonstration

### 0:00–0:08: One request with several constraints

Show a polished fictional storefront, the saved visible brief, an empty fitting
room and a visible profile summary:

`Size M · Friday pickup · Event Saturday · Black boots already owned`

The person asks the external browser agent to work from the saved brief. The
page shows the confirmed rules:

- Required: size M, Friday pickup, clear neckline, dance-ready, no footwear and
  total no more than $250.
- Style: couture vampire, fashion rather than novelty costume.
- Authority: show the complete look before creating any hold.

### 0:08–0:22: The agent investigates and assembles

The agent searches retailer-authored properties and inspects the matching
products. The ordinary product grid narrows from the complete fictional
catalogue to the eligible pieces.

The agent assembles a visible first look:

- Nocturne Tailored Vest: $108.
- Blood Moon Bias Skirt: $78.
- Raven Crystal Cuff: $24.
- The person's black boots: $0.

The page shows the subtotal and whether every hard rule passes. No reservation
exists.

### 0:22–0:35: Human taste changes the plan

The person keeps the vest and says:

> The red feels too Halloween. Make it all black with dramatic sleeves, but
> keep the vest.

The pinned vest and new preference become part of the visible fitting-room
revision. The agent replaces the skirt and adds sleeves while retaining the
hard requirements. The revised look totals $248.

### 0:35–0:48: A transparent inventory change forces replanning

The application applies a deterministic, clearly labelled **Demo inventory
update**. The selected organza sleeves lose Friday availability.

Validation fails with a specific structured reason. The page keeps approval
disabled. The agent explains that it will preserve the deadline rather than
silently relax it, searches for a substitute and updates the shared look.

The replacement keeps the intended silhouette, open neckline, movement rating
and Friday pickup. The new total is $242.

### 0:48–1:03: The exact look is reviewed

The agent validates the final revision and requests a reservation review. The
page shows:

- The exact four retailer items and sizes.
- The owned boots excluded from the purchase.
- Friday pickup.
- A 15-minute simulated hold.
- A $242 subtotal.
- $0 charged now.
- A statement that no hold exists yet.

The person can approve, decline or change the look.

### 1:03–1:17: Approval changes what the website exposes

The person selects **Approve exact demo hold**.

The browser's WebMCP inventory changes from seven permanent tools to eight.
The new `reserve_approved_look` tool is bound to the approved review and accepts
no editable product arguments.

The agent invokes it once. The application returns a simulated hold reference,
Friday pickup and an expiry time. The fictional quantities decrease for this
browser session. No payment is taken.

### 1:17–1:30: Authority is consumed

The temporary reservation capability is removed, returning the inventory to
seven tools. Replay and stale-revision attempts fail. The page offers a normal
human checkout control, but checkout and payment are never exposed through
WebMCP.

Close with:

> You chose the look. Your agent did the work you approved, and nothing more.

## Fictional catalogue facts used in the demonstration

| ID | Product | Price | Friday quantity | Neck contact | Movement |
| --- | --- | ---: | ---: | --- | --- |
| `FV-101` | Nocturne Tailored Vest | $108 | 2 | None, open V | High |
| `FV-206` | Blood Moon Bias Skirt | $78 | 2 | None | High |
| `FV-207` | Cathedral Black Satin Skirt | $72 | 3 | None | High |
| `FV-304` | Raven Crystal Cuff | $24 | 4 | None | Secure |
| `FV-408` | Opera Organza Sleeves | $44 | 1, then demo update to 0 | None | High |
| `FV-409` | Wraith Bell-Sleeve Shrug | $38 | 1 | None, open front | High |

These attributes are written by the fictional retailer and visible to the
person. The agent may combine and explain them, but it must not present them as
independent medical, safety or fit guarantees.

## Presentation principles

- Lead with the outfit and the changing customer problem, not tool diagrams.
- Keep the constraint summary readable at a glance.
- Show full tool payloads only in an optional technical view.
- Make human changes, validation failures and agent revisions visually obvious.
- Use original, locally bundled garment illustrations or flat-lay assets.
- Do not imply image generation or virtual try-on unless those features are
  actually implemented.
- Label the store, inventory event, reservation and quantities as fictional or
  simulated wherever a viewer could mistake them for real commerce.
- Preserve a clear manual path when native WebMCP is unavailable without
  claiming that an agent is connected.

## Scope boundaries

The proposed challenge experience is client-only and deterministic. It does
not require:

- A real retailer, stock service or reservation backend.
- Customer accounts or personal addresses.
- Payments, checkout automation or order placement.
- A model provider, API key or embedded chat service.
- Image generation or a photographic virtual try-on.
- General fashion advice or claims about physical comfort.
- A production authorization system.

The demonstration may prove browser tool lifecycle and interaction design. It
must not claim production inventory locking, cross-device authorization or a
real commercial transaction.

## Reasons to stop or simplify the pivot

Do not replace Launch Window A-01 unless the new experience can satisfy all of
these conditions:

- The story cannot be reduced to searching clothing and adding it to a cart.
- The fitting room is shared tool-visible state, not decorative artwork.
- Human taste changes the revision the agent must use.
- The inventory conflict is transparent, reproducible and not presented as a
  live external event.
- The agent preserves the customer's hard rules during replanning.
- A stale or unapproved revision cannot be reserved.
- The one-use reservation capability can be discovered and executed reliably
  in at least one supported challenge browser path.
- The visual result is clear and polished enough to communicate the story
  without a long explanation.

If those conditions cannot be met, preserve the qualified Launch Window entry
rather than publishing an ordinary shopping assistant under a new design.

## Promotion gate

The prototype may replace the root entry only after one truthful, recorded
external-agent journey proves all of the following on the deployed application:

1. The agent discovers the seven permanent tools without using a site-owned
   assistant or a manually reconstructed tool list.
2. It interprets the saved brief, searches structured retailer fields and
   builds a complete first look through multiple WebMCP calls.
3. It observes and preserves a person-pinned item during a requested revision.
4. It notices the labelled inventory update, explains the failed constraint and
   repairs the look without relaxing the saved rules.
5. It validates the final revision and requests review without creating a hold.
6. After the person approves, the same supported agent environment discovers
   `reserve_approved_look` as the eighth tool.
7. It invokes that tool once, receives the simulated reference and expiry, and
   observes that the inventory returns to seven.
8. Replay fails and no checkout, payment or order capability appears.

Inspector-driven calls and manual page controls remain useful technical
evidence, but they do not satisfy this model-driven gate. If a tested agent
cannot refresh the dynamic tool inventory reliably, diagnose that limitation
before changing the contract. Do not replace the exact temporary authority
with a permanently exposed general reservation tool merely to make the demo
easier to record.

After the gate passes, promote one coherent experience only. Preserve Launch
Window in repository history or at a clearly secondary route; do not present
two competing challenge entries through the live URL, README or submission.
