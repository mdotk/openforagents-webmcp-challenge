# Proposed School-Run Rescue Box

Status: finalist concept. It is not the current challenge entry and has not
been implemented or qualified.

## The experience

Near closing time, a bakery owner asks their browser agent to turn the food
still on the counter into one sensible rescue offer. The website provides the
current stock, reservations, dietary labels, minimum prices and closing time.
The owner adds local judgment that the website cannot know. After the owner
approves the exact offer, the agent may publish it once. A customer reservation
then updates both the public offer and a physical e-paper sign.

The opening image should explain the result without narration:

> SCHOOL-RUN RESCUE BOX
> $10 · 4 LEFT

The same offer appears on the customer reservation page behind the physical
display.

## Why an agent is useful

The task combines facts, rules and judgment:

- several products have different remaining quantities and sell-by times;
- gluten-free food must remain separate;
- every included item must stay above the owner's price floor;
- reservations may change while the offer is being prepared;
- the owner knows that school has just finished and can name the offer for the
  likely customers;
- publishing changes what customers can reserve and what the sign displays.

The agent interprets the owner's goal and composes an offer. The website does
not expose a `make_best_offer` tool or hide a deterministic offer generator.
It exposes current facts and validates the agent's proposed composition.

## Why WebMCP belongs here

A chat can write promotional copy. It cannot, by itself, work safely with the
bakery's current stock, reservations and store-authored rules or publish the
same versioned offer to the customer page and display.

WebMCP gives the browser agent typed access to the same state the owner sees.
It also makes human approval observable as a real change in the available tool
inventory: the publishing tool does not exist until the owner approves one
exact offer, and it disappears after use or invalidation.

## Seventy-five-second demonstration

### 0:00-0:05: Show the outcome first

Open on pastries beside the physical e-paper sign. The sign and laptop both
show `SCHOOL-RUN RESCUE BOX`, `$10` and `4 LEFT`.

### 0:05-0:17: Show the closing context

Rewind to the owner page. It shows eight croissants, four sandwiches, two
gluten-free muffins and forty minutes until closing.

The owner asks:

> Help me clear what's left. Keep the gluten-free muffins separate, and
> nothing below $2 an item.

### 0:17-0:30: Let the agent investigate

The agent reads the closing context and inspects the relevant products. It
proposes four boxes with two sandwiches and two croissants for $10. The muffins
remain separate.

### 0:30-0:40: Add human judgment

The owner says:

> School just finished. Call it the School-Run Rescue Box.

The agent previews the revised offer. The page shows the customer card and the
exact black-and-white display rendering.

### 0:40-0:53: Approve one exact publication

The agent requests review. The person sees the included products, quantities,
price, expiry and maximum number of boxes. Approval makes
`publish_approved_offer` appear. The agent uses it once and the tool
disappears.

### 0:53-1:05: Change the physical place

The e-paper display refreshes to the approved offer. The public reservation
page becomes available at the same time.

### 1:05-1:15: Close the loop

A customer reserves one box through the ordinary page. The remaining count
changes from four to three on both the customer page and the physical display.

## State owned by the website

The application state needs:

- a monotonically increasing `revision`;
- a fixed closing time for the demonstration;
- product identifiers, current quantities, unit prices, sell-by times,
  dietary tags and isolation requirements;
- active reservations;
- owner-authored price and composition rules;
- the current preview, review and approved publication scope;
- the active public offer and its remaining quantity;
- the current display version and, if supported by the device, its last
  acknowledged version.

Money uses integer cents and an explicit currency. The application must use
fictional inventory and reservations and say so clearly.

## Permanent WebMCP tools

Every input schema must be closed with `additionalProperties: false`. Every
state-changing call must use the expected current revision.

### `get_closing_context`

Input: a closed empty object.

Returns the closing time, store-authored rules, concise product facts,
available quantities, active reservation counts and current revision. This is
read-only.

### `inspect_rescue_products`

Input:

- `product_ids`: one to eight canonical identifiers.

Returns the exact price, available quantity, dietary tags, sell-by time and
composition restrictions for the selected products. This is read-only and
does not invent suitability.

### `preview_rescue_offer`

Input:

- `expected_revision`;
- `title`;
- `lines`: product identifier and quantity per box;
- `price_cents`;
- `maximum_boxes`;
- `expires_at`.

Validates stock, reservations, dietary separation, price floors, expiry and
display length. It returns structured conflicts or one exact preview. It may
update the visible reversible preview but does not publish anything.

### `get_offer_status`

Input: a closed empty object.

Returns the current preview, review state, public offer, remaining quantity,
display version and current revision. It is read-only.

### `request_offer_review`

Input:

- `expected_revision`;
- `preview_id`.

Creates a visible review of the current valid preview. It does not publish an
offer, reserve stock or change the display. Any relevant stock or rule change
invalidates the review.

## Temporary WebMCP tool

### `publish_approved_offer`

The page registers this tool only after the person approves the current review
through the visible interface. Its input is a closed empty object. The tool
closes over the approved title, products, quantities, price, maximum boxes and
expiry; the agent cannot replace those fields during execution.

Immediately before publication, the website revalidates the current revision,
stock, reservations and rules. A successful call activates one simulated
public offer, increments the display version and consumes the authority. The
tool then disappears. Replay, expiry, revocation or scope invalidation must not
publish a second offer.

## Customer action

Customers use an ordinary visible reservation form or a declarative form tool.
The agent-facing owner workflow does not include payment, checkout, refunds or
real food ordering. A successful simulated reservation atomically decrements
the public remaining count and advances the display version.

## Physical display boundary

The physical display must render the same versioned offer as the browser twin.
The transport cannot be selected until the exact e-paper hardware is known.
Two acceptable paths are:

1. a locally connected display receives the final monochrome bitmap from the
   browser after approval; or
2. a networked display polls a versioned image endpoint and acknowledges the
   version it rendered.

The display is a bonus output for the recording. Judges must be able to run the
complete website journey using the browser-based display twin without owning
hardware.

## Acceptance before selection as the entry

- The exact e-paper model and supported transport are identified.
- The display renders the approved offer and a subsequent count update
  reliably enough to film without hidden manual intervention.
- A compatible external browser agent completes the real WebMCP journey.
- The owner changes the proposal with local knowledge rather than merely
  approving an agent-generated discount.
- The website rejects stale previews and approval replays.
- The physical sign and browser twin show the same version.
- The experience remains fully usable without the physical display.
- The page works at desktop, 390 px and 320 px widths.
- No real customer, payment or food data is used.
