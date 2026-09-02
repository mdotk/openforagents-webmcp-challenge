# Adaptive Shopping Canvas qualification

Initial qualification: 1 September 2026

Current root-experience qualification: 2 September 2026

Retailer-first redesign qualification: 2 September 2026

Status: **The redesigned root experience is deployed and has passed local,
responsive and live WebMCP qualification.**

The shopping candidate was promoted to the root route in a separate reviewed
change. The retailer-first redesign removes the competition-presentation
scaffolding and opens directly inside a fictional shop: one shopper note, one
owned item, one shared look and one changing delivery problem. It remains
runnable both with and without WebMCP. It does not accept challenge terms,
publish a video or submit a Devpost entry.

## Exact candidate identity

- Repository: `mdotk/openforagents-webmcp-challenge`.
- Exact redesigned behavioural source revision:
  `12920d8f78bf90e1f14ea3072db8220b8149d68e`.
- Production deployment: `dpl_Cnqp6USj6UkETx1Tc6LxvDxUGtC8`.
- Deployment URL: `https://openforagents-webmcp-challenge-8ziaxjwxb-enokinz.vercel.app`.
- Production alias: `https://openforagents-webmcp-challenge.vercel.app/`.
- Deployment state: `Ready`; public response `HTTP 200` with
  `Permissions-Policy: tools=(self)`.
- The production HTML, JavaScript and CSS bytes matched the exact local
  production build. SHA-256: HTML
  `db7e34c5efc5aa4242d4bf69f1b22caaca357f96c3b498f69aba4da22e639a31`,
  JavaScript
  `34882fc13c9f24dd6a60e33c1887a3ea97b5fbbc8e03a3293b706455533561ce`
  and CSS
  `07ab26442f8bd6acbe7b06162bae021543a42251858bace99722493a10859ee6`.

The earlier Launch Window, fitting-room and Rack Rescue experiments remain at
their explicit query routes and are not presented as the current entry.

## Automated qualification

The exact source revision passed:

- `npm run lint`.
- 13 test files and 72 tests.
- TypeScript project build.
- Vite production build.
- `git diff --check` before the focused commit.

The tests cover the revisioned catalogue and shopping state, exact integer-cent
totals, destination-bound fulfilment quotes, immutable review creation, stale
state, expiry, revocation, stock and delivery invalidation, cancellation before
and after commit, temporary-tool registration failure, exact one-use cart
application, replay rejection, unsupported-browser fallback and the distinct
`$325` variation.

## Product and asset truth

- Twelve fictional styles produce 30 canonical variants.
- Each visible retailer product is permanently mapped to one exact product and
  colour SKU plus a transparent 900 x 900 WebP cutout.
- Size, quantity, price, destination-specific delivery and cart identity are
  bound to exact variants rather than inferred from the image.
- The cobalt-blue boots are a separately provenance-recorded owned item. They
  remain visual context, cost `$0` and never become a cart line.
- Source generation prompts, generated originals and SHA-256 mappings are
  recorded in `docs/adaptive-shopping-asset-provenance.md`.
- The interface calls the result a styling canvas and fictional retailer demo;
  it makes no try-on, fit or real-inventory claim.

## Responsive and visual qualification

- Desktop: 1680 x 1250 and 1440 x 1000.
- Mobile: 390 x 844 and 320 x 800.
- Empty, conflict, repaired, review, approved and final-cart states exercised.
- No page-level horizontal overflow at the tested widths.
- The 320 px opening keeps the shopper's note, owned boots and **Find me a
  look** action readable without overlap or horizontal overflow.
- The mobile product collage now sizes images from their displayed width rather
  than their 900 px source height, so the selected look remains visible instead
  of being cropped outside its frame.
- Exact SKU, size, colour, price and current delivery evidence remain readable
  at review.
- Browser console warnings and errors: none in the recorded responsive pass.
- A same-viewport comparison against the previous opening confirmed that the
  owned boots no longer sit behind the heading or obscure its supporting text.

## Human-first and agent-visible experience

- The first screen looks and behaves like a retailer workspace, not a challenge
  presentation. It shows the shopper's note, owned boots, empty look and
  delivery destination before introducing technical detail.
- **Find me a look** runs the guided journey. **Use my browser agent** appears
  only when the page has registered the seven WebMCP tools.
- The guided path remains enabled while WebMCP support is being checked and in
  browsers that do not expose the API.
- WebMCP support is reported as tool availability, never as a claim that an
  agent is connected.
- The permanent journey tracker, narrated activity panel and final proof strip
  are gone. A single changing status line and contextual action carry the flow.
- The activity history and exact WebMCP details are collapsed by default.
- The late blazer is marked directly in the product list with Friday crossed
  out and Monday shown as its actual arrival date. The repair marks the two
  kept pieces and two replacements in place.
- The exact review receives keyboard focus. The final cart explains the store's
  result and keeps checkout visibly unavailable without repeating the product
  thesis.

## Native WebMCP surface

The supported challenge browser discovered exactly seven permanent tools:

1. `read_shopper_context`
2. `search_products`
3. `inspect_products`
4. `check_fulfilment`
5. `read_shared_look`
6. `update_shared_look`
7. `request_cart_review`

All seven use closed schemas. No tool recommends a pre-authored outfit. No
approval, checkout, payment or order tool exists. Human approval alone may add
the argument-free temporary `apply_approved_cart` capability, which closes over
the immutable reviewed patch and is intended to disappear after one use.

## External-agent journey

The Codex in-app Browser WebMCP client acted as the supported external browser
agent against the production alias. Evidence is separated below.

### Tool discovery

- Initial inventory: seven native tools.
- Tool schemas, descriptions and annotations were read from the live document.
- Human-authorized approval changed the live inventory from seven to eight
  tools by adding only `apply_approved_cart`.
- One successful invocation consumed the authority and returned the live
  inventory to the same seven permanent tools.

### Tool execution

1. Read the `$350`, size M, Friday, owned-boots and Home context.
2. Searched all four product slots and received 12 of 12 fictional styles.
3. Inspected six exact product styles.
4. Checked the first four variants for Home fulfilment.
5. Updated the shared look at expected revision 0.
6. Read a valid four-line `$343` look with an empty cart.
7. After the visible destination change, received `DELIVERY_CHANGED`: Silver
   Cropped Blazer arrives 7 September, after the 4 September deadline.
8. Searched five replacement candidates and inspected four exact products,
   including the out-of-stock size-M Noir Longline Blazer.
9. Checked the coordinated replacement set for Event hotel fulfilment.
10. Replaced only the failed blazer and the budget-balancing bag at expected
    revision 2.
11. Read a valid four-line `$345` look with an empty cart.
12. Requested review using the four revision-bound delivery quote IDs.
13. After Matt explicitly authorized the fictional approval, invoked the
    argument-free temporary `apply_approved_cart` once.
14. Received a successful result: four cart lines, `$345.00`, `$0` charged,
    authority consumed and `cart_revision` 1.
15. Refreshed the live inventory and confirmed the temporary tool had
    disappeared.
16. Attempted replay from the refreshed inventory and received `tool is not
    available in this snapshot`.

### Model reasoning

- Chose a coherent first look from retailer-authored facts rather than a hidden
  recommendation tool.
- Preserved the owned boots, size, Friday deadline and budget.
- Rejected the late original blazer and the out-of-stock alternative.
- Chose the `$114` hotel-ready Ink Sculpted Jacket.
- Coordinated the `$43` Ink Slim Clutch substitution to restore the total to
  `$345`, while preserving the dress and silver accent.
- Stopped at the authority boundary until Matt explicitly authorized the
  fictional demo approval, then used only the resulting closed-over tool.

### Page behaviour

- The first selected exact assets appeared only after the tool update.
- The person-visible Home to Event hotel change incremented the context and
  invalidated the earlier delivery evidence.
- The repaired styling canvas, product cards, subtotal and decision explanation
  updated together.
- The immutable review displays four exact SKUs and Friday arrival dates.
- Immediately before approval the cart has zero lines, `$0` has been charged
  and the live inventory remains seven tools.
- The final page repeats the four exact cart lines, prices and Friday delivery
  promises; the owned boots are absent from the cart.
- The page states that checkout is not part of the demo and nothing has been
  charged, leaves the ordinary checkout button disabled and exposes no
  checkout, payment or order WebMCP tool.
- The live production pass had no warning or error console entry.

### Human action

- Matt explicitly authorized Codex to perform the simulated approval click in
  this browser-local fictional demo after confirming there was no account,
  payment, order or real-world consequence.
- That authorized click alone created the temporary eighth tool. The external
  agent could not create it through WebMCP.
- No separate authority was inferred for checkout, payment, ordering, root
  promotion, terms acceptance, video publication or submission.

## Unfilmed judge variation

The separate `?experience=shopping&scenario=tighter-budget` route changed the
budget to `$325` without changing the catalogue:

- Home result: Ink Satin Jumpsuit, Silver Cropped Blazer, Ink Slim Clutch and
  Architectural Earrings; valid total `$313`.
- Event hotel failure: the same Silver Cropped Blazer missed the deadline.
- Replanned result: Ink Satin Jumpsuit, Ink Sculpted Jacket, Ink Slim Clutch and
  Oxblood Silk Scarf; valid total exactly `$325`.
- The default `$343` / `$345` bundles were not replayed and the cart remained
  empty.

## Completion result

All six final gates passed on the exact production deployment:

1. Inventory changed from seven to eight tools after authorized approval.
2. The external agent invoked argument-free `apply_approved_cart` once.
3. The exact four-line `$345` cart appeared with the owned boots absent.
4. The authority was consumed and inventory returned to seven tools.
5. Replay was rejected because the temporary capability no longer existed.
6. Checkout remained a disabled person-visible control, with no checkout,
   payment or order WebMCP tool.

The retailer-first production rerun repeated the seven-to-eight-to-seven tool
lifecycle, exact four-line `$345` cart, `$0` charged result, replay rejection
and empty browser console on the redesigned root route. Challenge terms are
not accepted, no public video is published and no final entry is submitted.
