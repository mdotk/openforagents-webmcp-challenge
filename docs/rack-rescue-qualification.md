# Rack Rescue qualification

This page records evidence for the separate Rack Rescue candidate. It does not
replace the qualification record for Launch Window A-01 or claim that Rack
Rescue has been submitted.

## Implemented candidate

Rack Rescue is available at
<https://openforagents-webmcp-challenge.vercel.app/?experience=rack-rescue>.
The root URL still opens Launch Window A-01.

The browser-local candidate contains:

- An eight-column by six-row rack with a defined spray-clearance area and a
  reserved roasting-tray zone.
- Thirteen initially visible dishes with finite footprints and orientations.
- One genuinely hidden tray that is absent from the WebMCP state until the
  person reveals it.
- Three qualified rack positions the person can choose for the red mug by
  dragging it or selecting a spot directly. The agent cannot move that choice.
- Separate safe-zone and basket-zone rules for the child's cup and cutlery.
- Five permanent closed-schema WebMCP tools with revision checks.
- Preview without movement, structured conflicts, exact apply and one-use
  Undo.
- A guided demo for browsers without WebMCP.

There is no hidden solver, appliance control, checkout, payment, order or
model credential.

## Automated checks

At behavior commit `99a12afada3b8e7c95b7ad718763ba9b4fb503b9`, the full
`npm run check` command passes lint, 47 deterministic tests and the production
TypeScript/Vite build.

The Rack Rescue tests cover:

- The exact five-tool inventory and closed schemas.
- Bounded agent-facing state grouped by dish type.
- A tray identifier and geometry that remain undiscoverable before the human
  reveal.
- Exact dish inspection and rejection of hidden or foreign identifiers.
- Preview conflicts that do not move committed dishes.
- Complete zero-conflict thirteen-dish and fourteen-dish plans through the
  registered WebMCP tool implementations.
- Preservation of the human-pinned red mug across both plans.
- Pointer dragging, direct spot selection, cancelled-drag recovery and
  keyboard focus transfer.
- Stale revisions, overlaps, blocked spray cells, invalid zones and locked
  movement.
- Exact preview application, one-use Undo and replay rejection.
- Cancellation before a state-changing commit.
- Registration disposal and removal of all five tools.
- Visible fallback behavior and responsive interface state.

## Rendered browser checks

The corrected interaction was inspected in the user's existing Chrome session
at desktop, 390 px and 320 px. The page remained legible and produced no
horizontal overflow, console warning or console error at the tested widths.

Vercel production deployment `dpl_2PAD3mGCzYfjB7XFXQxCEuu26dcd` is bound to
behavior commit `99a12afada3b8e7c95b7ad718763ba9b4fb503b9`. On the canonical
URL, a real pointer drag placed the mug at the non-default lower position. The
guided flow then rejected a spray-blocking layout, applied a safe thirteen-dish
layout, revealed the tray and applied a safe fourteen-dish layout. The final
mug remained at the selected position and the tray was present.

The deployed page completed its own native registration and reported five
native tools. Chrome automation's isolated execution world did not expose the
page's main-world `document.modelContext`, so that automation layer was not
used as an independent native-inventory readback. The final model-driven
journey remains the authoritative native qualification gate.

## Adversarial local-model checks

Two small locally installed models were given the real registered tool
definitions and structured results without network access or paid calls.

The first model read the rack, stopped making tool calls and emitted a proposed
layout as ordinary text. It also invented out-of-range rows. The second model
used the tools but repeatedly submitted an empty preview call despite the
schema and rack result providing the required revision and moves.

In both cases the website rejected the invalid behavior. The committed state
remained at the pinned red mug, with no preview, no conflict and no other dish
moved. These checks establish fail-closed behavior against weak tool callers.
They do not qualify useful external-agent reasoning.

## Pending external-agent gate

Rack Rescue must not replace the current root entry until a compatible
external browser agent completes this deployed journey:

1. Read the thirteen-dish state once.
2. Construct and preview a complete arrangement without a hidden solver.
3. Repair any returned conflict rather than bypassing validation.
4. Apply a valid preview while preserving the pinned mug.
5. Re-read after the person reveals the forgotten tray.
6. Construct and apply a fourteen-dish arrangement with zero conflicts.
7. Leave the mug unchanged and the tray present.

If the external agent cannot complete that journey with the current truthful
contract, the candidate remains a validator demonstration rather than a proven
reasoning experience and must not be promoted on presentation alone.
