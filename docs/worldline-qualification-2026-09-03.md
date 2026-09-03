# WORLDLINE qualification

Date: 3 September 2026.

Status: **local candidate passed; deployment and root-promotion decision
pending.**

## Automated contract

- Lint passed.
- TypeScript production build passed.
- All 82 tests passed across 16 files.
- Dedicated domain tests cover mutually exclusive outcomes, revision checks,
  explicit person approval, one-use execution and replay rejection.
- Dedicated WebMCP tests cover closed schemas and exact 6 → 7 → 2 inventory.
- Dedicated page tests cover the opening, honest fallback, complete guided
  mission and live tool counter.
- Existing shopping, fitting-room, rack-rescue and launch-window tests remain
  green.

## Real browser WebMCP pass

The Codex in-app browser discovered the six native tools from the local
WORLDLINE document and invoked them against the real page.

The agent-side investigation:

1. Read mission revision 0 and the 71-second contact window once.
2. Inspected all three packets.
3. Read the 0.5 MB/s signal window.
4. Simulated an early 3,500 m/s burn that saved the probe but lost the unique
   science.
5. Simulated a late 2,600 m/s burn that lost both outcomes.
6. Simulated a 2,200 m/s burn at probe second 46 that transmitted the 18 MB
   gravity map and 12 MB horizon spectrum but could not save the probe.
7. Put that exact plan and rationale on the page.
8. Requested person review and stopped.

The person-visible decision showed 30 MB, Earth arrival after 23 years and
`Probe returns: No`. Clicking **Approve this one burn** changed the browser's
actual native inventory from six to seven tools by adding only the
argument-free `execute_authorized_burn` capability.

The browser invoked that tool once. Its structured result identified both
packets, Earth arrival after 23 years, probe elapsed time 557 seconds and
`authorityConsumed: true`. A refreshed inventory contained only
`read_final_state` and `verify_transmission_receipt`. Replay of the old tool
name was rejected because it was no longer available.

This proves the observed local browser composition. It does not claim
compatibility with every browser, agent or future WebMCP implementation.

## Visual and responsive pass

- Desktop opening, person decision, authorized state and final receipt were
  inspected in the real page.
- The black-hole scene, probe, worldlines and Earth/probe clocks visibly update
  with the same state returned by the tools.
- At 390 × 844, the opening and complete decision card are legible and the
  primary action remains visible.
- At 320 × 760, the opening remains legible and the page reports no horizontal
  overflow (`scrollWidth 305` within a `320`-pixel viewport after the browser
  scrollbar).
- Reduced-motion rules are present.
- The browser recorded no warning or error console entries during the complete
  local journey.

## Remaining release gate

The candidate is not yet live. Before root promotion:

1. Commit and push the focused candidate.
2. Require exact-head CI.
3. Deploy the separate WORLDLINE route.
4. Repeat the native WebMCP lifecycle and responsive checks against the live
   URL.
5. Compare WORLDLINE with the shopping experience and make an explicit root
   promotion decision.

No Devpost terms were accepted, no video was published and no final challenge
submission was made in this qualification.
