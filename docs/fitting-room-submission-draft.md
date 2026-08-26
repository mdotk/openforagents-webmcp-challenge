# Shared Fitting Room submission draft

This document prepares the project description and testing instructions. It is
not a submitted challenge entry.

## Project title

Shared Fitting Room

## One-line description

A person describes one complete occasion look, a browser agent shops the
retailer's live structured facts and both work in the same visible fitting
room before one exact, human-approved hold.

## Why shopping needs a shared browser surface

Ordinary shopping asks a person to repeat the same constraints across filters,
product pages, stock checks, comparisons and a cart. A chat can suggest an
outfit, but it does not automatically share the retailer's current quantities,
the person's visible fitting room or a narrowly approved reservation.

Shared Fitting Room keeps those responsibilities separate:

- The person states the occasion, taste, comfort, budget, deadline and item to
  reuse.
- The agent interprets that request and coordinates several products.
- The retailer remains authoritative for product fields, price, size,
  movement, contact zones and Friday availability.
- The person pins the vest they want to keep.
- A stock change forces the agent to re-check and revise the look.
- The retailer validates the final combination.
- The person reviews the exact four products and $242 total before approving a
  simulated hold.

The result is not a recommendation pasted into chat. It is one revisioned
shopping state that the person and agent can both read and change.

## Why WebMCP is essential

WebMCP gives the browser agent typed access to the same retailer state the page
shows. The agent can search structured product facts, inspect candidates,
update the fitting room and receive exact validation failures without scraping
cards or guessing what a disabled button means.

Seven permanent tools are available:

1. `read_shopper_context`
2. `search_products`
3. `inspect_products`
4. `read_fitting_room`
5. `update_fitting_room`
6. `validate_fitting_room`
7. `request_reservation_review`

Every schema is closed with `additionalProperties: false`. State-changing
tools require the current revision, and the agent cannot remove a product the
person has pinned.

The consequential action is not permanently exposed. Requesting review creates
no hold. After the person approves the exact look on the page, the site
registers `reserve_approved_look` as an eighth tool with an empty closed input
schema. Its product identifiers, variants, prices, pickup slot and 15-minute
duration are already fixed by the approval. One successful invocation creates
the fictional hold `FF-DEMO-001`, consumes the authority and removes the tool,
returning the inventory to seven.

Checkout, payment and order placement are never WebMCP tools.

## What the person and agent do together

The demonstration starts with this saved brief:

> Build me a couture vampire look for Saturday. Nothing tight around my neck,
> I need to dance, reuse my black boots, keep it under $250 and use only things
> I can pick up Friday. Make it fashion, not costume shop. Show me before
> reserving anything.

The agent must interpret the subjective direction while obeying six hard
constraints. It searches the fictional retailer's fields, assembles a first
look and explains its choice. The person pins the tailored vest and asks for an
all-black revision. When the organza sleeves lose Friday availability, the
agent must re-read the current state and substitute the available bell-sleeve
shrug without removing the pinned vest or exceeding the budget.

The final taste decision stays human. The agent may request review, but only the
person can approve the exact hold. The hold is simulated, browser-local and
charges $0.

## Implementation

The project is a standalone React and TypeScript application created during the
challenge period. Its deterministic browser-local state machine owns the
catalogue, revisions, visible fitting room, validation, review, grant and hold.

The page registers its tools through
`document.modelContext.registerTool()`. Permanent tools share one registration
lifetime. The approved hold uses a separate `AbortController`; use, revocation,
expiry or a scope change removes that temporary registration. Tool execution
accepts the browser's cancellation signal and checks it before state-changing
commits.

Three original fictional fashion images show the first look, all-black revision
and final substitute. No retailer, customer or third-party product imagery is
used.

## Current evidence and limit

The deployed prototype has passed 33 deterministic tests, lint, TypeScript and
the production build. In Chrome it registered seven native tools, added the
eighth after approval and returned to seven after one use. The inventory update
correctly blocked review until the unavailable layer was replaced. Desktop,
390 px and 320 px checks produced no horizontal overflow or console errors.

That evidence establishes the page and native capability lifecycle in the
tested Chrome session. The final submission should not claim model-driven
shopping until the complete external-agent journey has been recorded.

## Testing instructions

1. Open the fitting-room URL in a compatible browser agent.
2. Ask: “Use this page's tools to build the strongest complete look from my
   saved brief. Explain the choices and stop before requesting a hold.”
3. Confirm that the agent uses retailer facts and builds a complete first look.
4. On the page, pin **Nocturne Tailored Vest**, then ask the agent to make the
   look all black while preserving the pin.
5. Apply the demonstration inventory update. Confirm that the page removes the
   review action and identifies the unavailable organza sleeves.
6. Ask the agent to re-check the retailer state and repair the look without
   relaxing the saved constraints.
7. Ask the agent to validate the final look and request review, but not to hold
   anything.
8. Review the four items, $242 total, Friday pickup and 15-minute duration on
   the page. Approve the exact simulated hold.
9. Confirm that `reserve_approved_look` appears as the eighth tool. Ask the
   agent to use it once.
10. Confirm `FF-DEMO-001`, $0 charged and a return to seven tools. Confirm there
    is no checkout, payment or order tool.

## Links

- Prototype: https://openforagents-webmcp-challenge.vercel.app/?experience=fitting-room
- Source: https://github.com/mdotk/openforagents-webmcp-challenge
- Challenge: https://openai.com/webmcp-challenge/
