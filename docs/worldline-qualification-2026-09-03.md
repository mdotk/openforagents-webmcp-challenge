# WORLDLINE qualification

Date: 3 September 2026.

Status: **qualified and promoted to the public root.**

## Automated contract

- Lint passed.
- TypeScript production build passed.
- All 83 tests passed across 16 files.
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

The same lifecycle subsequently passed against the public root in the Codex
in-app browser. This proves the observed browser composition. It does not claim
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

## Public release result

WORLDLINE was promoted to the root in commit
`ece86e397f5f218a2cc21f6b825e3911ae20261b`. Vercel production deployment
`dpl_8ruvtwx4bGFQoiDVWKe4yCtxsbgc` reached `Ready`, and the repository's Vercel
commit status passed for that exact revision. This repository does not define
a GitHub Actions workflow; the available automated gate is the local
`npm run check` contract plus the exact-commit Vercel deployment status.

Public acceptance confirmed:

1. The root document exposes exactly six initial tools.
2. Three different futures were simulated before a plan was shared.
3. Person review showed the exact 30 MB, 23-year and probe-loss consequence.
4. Person approval alone added the argument-free execution tool.
5. Execution consumed the authority and produced a verified receipt.
6. Replay through the stale tool inventory was rejected.
7. Exactly two final read-only tools remained.
8. The 390-pixel layout had no horizontal overflow.
9. The previous shopping experience remained available at
   `?experience=shopping` with its seven initial tools.

No Devpost terms were accepted, no video was published and no final challenge
submission was made in this qualification or promotion.
