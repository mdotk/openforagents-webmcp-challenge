# WORLDLINE — One probe. One signal.

WORLDLINE is a deterministic educational mission created by Enoki Limited for
the WebMCP Challenge. A browser agent investigates possible futures for a
probe near a black hole. It prepares the trade-off; the person decides what
matters.

[Try WORLDLINE](https://openforagents-webmcp-challenge.vercel.app/) ·
[Try the preserved shopping experience](https://openforagents-webmcp-challenge.vercel.app/?experience=shopping) ·
[Read about the WebMCP Challenge](https://openai.com/webmcp-challenge/)

There is no real spacecraft, mission, account or external system behind the
demonstration. Its numbers support a browser-local interaction and do not claim
to be a precision black-hole simulation.

## The WORLDLINE journey

The probe has enough fuel to escape or enough contact time to send two unique
science packets to Earth, but not both. The agent must inspect the packet facts,
test multiple burns, reject a failed worldline and put one viable plan on the
shared page. It cannot choose which outcome matters to the person.

The person reviews the consequence and approves one immutable burn. Approval
alone adds the argument-free `execute_authorized_burn` tool. It works once and
then disappears with every planning tool, leaving only the final state and
verified receipt.

The actual WebMCP inventory therefore changes from six tools, to seven, to two.
Browsers without WebMCP receive the same complete guided mission instead of a
blank or disabled page.

## Preserved shopping experience

The person starts with a visible brief:

> Wedding Saturday. Make it unforgettable, not costume. Under $350. Arrive by
> Friday. Keep my blue boots.

The explicit `?experience=shopping` route opens as a small retailer workspace
rather than a presentation about the technology. The shopper's note, owned
boots, delivery destination and empty look are visible immediately.

- **Find me a look** runs the complete guided journey in an ordinary browser.
- **Use my browser agent** appears when the page-level WebMCP API is available.
  It copies one bounded request for the agent while the page continues to show
  the shared shopping state.

The page says that WebMCP tools are available; it never claims that an agent is
connected. Browsers without WebMCP receive the same complete guided journey
rather than a blank or disabled experience. Technical tool details and the
activity history are available on request, but stay out of the shopping flow by
default.

The agent must then:

1. Read the shopper's confirmed size, budget, deadline, destination and owned
   boots.
2. Search twelve fictional product styles and thirty exact variants.
3. Inspect candidate products and check current destination-specific delivery.
4. Assemble a complete look on the shared page without changing the cart.
5. Replan when the person changes delivery from Home to the Event hotel and the
   selected blazer no longer arrives in time.
6. Prepare an immutable cart proposal using fresh delivery quotes.
7. Stop while the person reviews the exact products, sizes, prices and arrival
   dates.

Approval creates one temporary `apply_approved_cart` capability. It contains no
editable product arguments, applies only the reviewed cart, works once and then
disappears. Checkout, payment and order placement are not exposed through
WebMCP.

The styling canvas uses exact fictional SKU cutouts. It is not a virtual try-on
and makes no claim about fit or appearance on a person's body.

## Shopping WebMCP implementation

[`registerShoppingTools()`](src/webmcp/register-shopping-tools.ts) resolves the
page API from `document.modelContext` and registers seven permanent tools:

1. `read_shopper_context`
2. `search_products`
3. `inspect_products`
4. `check_fulfilment`
5. `read_shared_look`
6. `update_shared_look`
7. `request_cart_review`

Each tool has a closed input schema. Read tools return exact structured facts;
write tools accept the browser's cancellation signal and check it before
committing a state change. The shared canvas uses revision numbers so stale
updates and stale delivery evidence are rejected.

Tool execution also emits a page-local factual activity event. This makes real
browser-agent work inspectable without exposing private model reasoning or
manufacturing an agent transcript. The history is collapsed by default so the
products, delivery failure, replacements and cart remain the main experience.

The permanent tools share one registration lifetime:

```ts
modelContext.registerTool(tool, { signal: permanentController.signal })
```

Human approval registers the temporary capability with a separate lifetime:

```ts
await modelContext.registerTool(createGrantTool(grant, controller), {
  signal: controller.signal,
})
```

Using, revoking or expiring that authority aborts its registration. The live
tool inventory therefore changes from seven tools to eight and back to seven.

## Other experiments

The earlier challenge prototypes remain available alongside the WORLDLINE root:

- [Launch Window A-01](https://openforagents-webmcp-challenge.vercel.app/?experience=launch-window)
- [Shared Fitting Room](https://openforagents-webmcp-challenge.vercel.app/?experience=fitting-room)
- [Rack Rescue](https://openforagents-webmcp-challenge.vercel.app/?experience=rack-rescue)

Their source and qualification records remain in this repository.

## Run locally

The project requires a current Node.js release with `npm`.

```sh
npm ci
npm run dev
```

Vite prints the local URL. Open that URL in a browser to use the experience.

## Test and build

Run the automated tests once:

```sh
npm run test:run
```

Run lint, the automated tests and the production build together:

```sh
npm run check
```

The individual lint and build commands are also available as `npm run lint`
and `npm run build`.

## Browser support and evidence

The WebMCP path requires a browser that exposes the page-level WebMCP API used
by this project. In other browsers, visible controls provide the same fictional
journey without claiming that tools were registered with the browser.

Qualification in one supporting browser establishes only the behavior observed
in that browser and version. It does not claim compatibility with every
browser, agent or future WebMCP specification. Automated tests do not by
themselves establish native browser compatibility.

WORLDLINE evidence is recorded in
[`docs/worldline-qualification-2026-09-03.md`](docs/worldline-qualification-2026-09-03.md).
The preserved shopping evidence is recorded in
[`docs/adaptive-shopping-canvas-qualification-2026-09-01.md`](docs/adaptive-shopping-canvas-qualification-2026-09-01.md).

## Project status and provenance

This is standalone code created during the challenge period. It is not a copy,
release or renamed edition of another Open for Agents product. The related
[`challenge chronology`](docs/challenge-chronology.md) records its provenance
and submission status.

No final challenge submission or public entry video has been made.

## Licence

The project source is copyright (C) 2026 Enoki Limited and is available under
the GNU General Public License, version 2 or (at your option) any later version
(`GPL-2.0-or-later`). See [`LICENSE`](LICENSE), [`NOTICE.md`](NOTICE.md) and
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing a change and
[`SECURITY.md`](SECURITY.md) for private vulnerability-reporting guidance.
