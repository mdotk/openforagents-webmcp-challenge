# Adaptive Shopping Canvas design QA

**Comparison target**

- Source visual truth: `/Users/matt/.codex/generated_images/01a045b9-2bb4-7873-ba73-1323fd9382fb/exec-a06397a6-4f37-42d2-8d11-6ab880a75dba.png`
- Implementation route: `/?experience=shopping`
- Primary implementation evidence: `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/desktop-review-delivery-evidence-1440.png`
- Additional implementation evidence: `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/desktop-cart-1440.png`, `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/mobile-initial-390.png`, `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/mobile-review-390.png`, `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/local-review-delivery-evidence-320.png`
- Unfilmed judge-variation evidence: the local `?experience=shopping&scenario=tighter-budget` route produced a distinct valid Event hotel look at exactly `$325` using Ink Satin Jumpsuit, Ink Sculpted Jacket, Ink Slim Clutch and Oxblood Silk Scarf. The default repaired bundle was not replayed.
- Full-view comparison: `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/comparisons/source-vs-implementation-postfix.png`
- Focused human-decision comparison: `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/comparisons/decision-source-vs-implementation.png`
- State: repaired hotel-ready look with the exact cart review visible. The source is a six-frame storyboard rather than one continuous browser page, so the comparison judges hierarchy, story beats, product truth and human-control emphasis rather than literal panel geometry.

**Viewport and normalization**

- Desktop CSS viewport: `1440 x 1050`, device scale factor `1`. The full-page capture is `1425 x 2699` pixels after the browser scrollbar occupies 15 CSS pixels.
- Mobile CSS viewports: `390 x 844` and `320 x 760`, device scale factor `1`. The 320 px review capture is `305 x 4066` pixels after the browser scrollbar occupies 15 CSS pixels.
- Source pixels: `1536 x 1024`.
- Full-view comparison normalizes the source to `768 x 1024`; the implementation's relevant review region was cropped from the full-page capture, scaled to fit `768 x 1024`, and placed beside it in a single `1536 x 1024` image.
- Focused comparison normalizes the source and implementation decision regions to `768 x 768` each and places them in one `1536 x 768` image.

**Findings**

- No actionable P0, P1 or P2 visual finding remains.
- [P3] The mobile four-step journey intentionally scrolls horizontally, so the fourth step is not fully visible in the initial 390 px capture. The partial next step provides an affordance and no primary action is hidden. A later polish pass could shorten labels or add a subtle edge fade.
- [P3] The source visual includes a model/lifestyle reveal and a claim that 1,284 live variants were checked. The implementation intentionally replaces both with a truthful exact-asset styling canvas, 12 fictional styles and 30 variants. This is a product-truth improvement, not an implementation shortcut: the demo does not claim virtual try-on, real inventory or live retail scale.

**Required fidelity surfaces**

- Fonts and typography: Manrope provides the condensed editorial display hierarchy and DM Sans keeps body/UI copy legible. Headline wrapping remains deliberate at desktop and mobile. Product names now use a two-line clamp instead of premature single-line ellipsis. Small labels retain readable weight and contrast.
- Spacing and layout rhythm: the implementation preserves the source's brief → agent work → surprise → repair → human decision sequence while combining it into one continuous canvas. Desktop uses a clear primary canvas and supporting decision column; mobile stacks these without overlap or page-level horizontal overflow. Borders, radii and gaps form a consistent restrained retail system.
- Colors and visual tokens: warm paper, black type and saturated blue preserve the source's editorial retail direction. Green, red and blue are reserved for success, conflict and governed action. The black review panel creates the strongest boundary immediately before human approval.
- Image quality and asset fidelity: all visible garments, bag, belt and owned boots use purpose-generated transparent 900 x 900 WebP assets. Crops are sharp, proportional and free of visible transparency halos at desktop and mobile. Phosphor icons are used for controls and states; no emoji, CSS art or handcrafted SVG substitutes are present.
- Copy and content: the page stands alone as a fictional retailer demo. It uses the canonical wedding/deadline/budget brief, explains why an agent is useful, distinguishes styling preview from cart mutation, keeps the owned boots out of the cart, says exactly what changed, shows each reviewed SKU and delivery date, and keeps checkout and payment with the person.
- Accessibility and interaction: semantic headings, labels, native select/details/button controls, visible focus rings, alt text, live tool status and reduced-motion support are present. Approval, keep-editing, decline, destination change, disabled checkout and manual fallback states were exercised. Desktop and mobile had no document overflow. Browser console warnings/errors: none.

**Comparison history**

1. Initial full-view pass found two P2 presentation issues: desktop product names truncated to one unreadable line, and the mobile native-tool status touched the right edge and appeared clipped.
2. Fixes: product names now clamp to two lines; the mobile tool-status width, gap, font size and right padding were tightened; a 320 px compact status prevents edge clipping; the shopping route now sets the correct page title; the final review now shows exact SKU and delivery evidence.
3. Post-fix evidence: `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/desktop-review-delivery-evidence-1440.png`, `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/mobile-header-390.png`, `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/local-review-delivery-evidence-320.png`, and `/Volumes/Dev/CodexScratch/openforagents-shopping-qa/comparisons/source-vs-implementation-postfix.png`. Product names and tool status are readable, all four reviewed lines show current delivery, the title is `Morrow — Adaptive Shopping Canvas`, and no P0/P1/P2 difference remains.

**Primary interactions tested**

- Native seven-tool inventory discovered.
- Agent-built first look rendered without changing the cart.
- Destination changed from Home to Event hotel.
- Late silver blazer detected and the coordinated jacket/bag repair rendered.
- Immutable four-line cart review opened with the cart still empty.
- Human approval created the temporary eighth tool.
- `apply_approved_cart` applied the exact patch once, returned the inventory to seven tools and rejected replay because the temporary tool no longer existed.
- Manual fallback completed the same visible journey; decline left the cart unchanged.
- The unfilmed `$325` constraint variation produced a different `$313` Home look and a different `$325` hotel-ready replan from the same catalogue, with the cart still empty.

**Implementation checklist**

- [x] Preserve the six intended story beats in one readable browser journey.
- [x] Use exact product assets rather than invented try-on imagery.
- [x] Keep the human decision visually and functionally separate from agent planning.
- [x] Verify desktop and mobile empty, conflict, repair, review, approval and cart states.
- [x] Verify console, overflow, title and responsive behavior.

**Follow-up polish**

- Optionally add a gentle mobile edge fade to the horizontally scrollable journey strip.

final result: passed
