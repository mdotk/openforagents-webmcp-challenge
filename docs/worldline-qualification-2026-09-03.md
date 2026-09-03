# WORLDLINE qualification

Date: 3 September 2026.

Status: **qualified and promoted to the public root.**

## Automated contract

- Lint passed.
- TypeScript production build passed.
- All 87 tests passed across 16 files.
- Dedicated domain tests cover mutually exclusive outcomes, revision checks,
  explicit person approval, one-use execution and replay rejection.
- Dedicated WebMCP tests cover closed schemas and exact 6 → 7 → 2 inventory.
- Dedicated page tests cover the guided and WebMCP-ready openings, explicit
  agent handoff, complete guided mission, live tool counter and the rule that
  only actually tested worldlines are drawn.
- Existing shopping, fitting-room, rack-rescue and launch-window tests remain
  green.

## Real browser WebMCP pass

The Codex in-app browser discovered the six native tools from the local
WORLDLINE document and invoked them against the real page.

The agent-side investigation:

1. Read mission revision 0 and the 71-second contact window once.
2. Inspected all three packets.
3. Read the 1.2 MB/s signal window.
4. Simulated an early 3,500 m/s burn that saved the probe but lost the unique
   science.
5. Simulated a late 2,600 m/s burn that lost both outcomes.
6. Simulated a 2,200 m/s burn at probe second 46 that transmitted the 18 MB
   gravity map and 12 MB horizon spectrum in 25 seconds, completing exactly at
   the end of the 71-second contact window, but could not save the probe.
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

- Desktop opening, agent handoff, person decision, authorized state, burn,
  signal flight, Earth-arrival clock and final receipt were inspected in main
  Chrome against the local candidate and public deployment.
- Each worldline appeared only after its corresponding simulation. The visible
  heading and outcome changed from one future, to two, to three as the shared
  mission state changed.
- The approved execution showed a burn at the probe, two packets moving toward
  Earth, a 23-year clock roll and the final received signal. The live tool
  count changed from six to seven to two with the same state transitions.
- At 390 × 844, the opening is legible, the probe remains visible above the
  story card and both the browser-agent and guided actions are clear.
- At 320 × 760, the opening remains legible and the page reports no horizontal
  overflow (`scrollWidth 305` within a `320`-pixel viewport after the browser
  scrollbar); the probe is also inside the visible viewport.
- Reduced-motion rules are present and the page skips the timed payoff when
  the browser requests reduced motion or does not expose motion preferences.
- The browser recorded no warning or error console entries during the complete
  local and public journeys.

## Public release result

[WORLDLINE](https://openforagents-webmcp-challenge.vercel.app/) is live at the
public root. The complete browser journey was repeated after the transmission
arithmetic was corrected, and the visible page remained consistent with the
tool results.

Public acceptance confirmed:

1. The opening distinguishes `WebMCP ready` from an agent that is actually
   running, and the browser-agent action reveals the exact next step.
2. The root document exposes exactly six initial tools.
3. Three different futures were simulated before a plan was shared, with each
   path drawn from the resulting shared state.
4. Person review showed the exact 30 MB, 23-year and probe-loss consequence.
5. Person approval alone added the argument-free execution tool.
6. Execution consumed the authority and produced the burn–signal–23-years
   visual sequence and a verified receipt.
7. Replay through the stale tool inventory was rejected.
8. Exactly two final read-only tools remained.
9. The 320-pixel layout had no horizontal overflow.
10. The previous shopping experience remained available at
   `?experience=shopping` with its seven initial tools.

No Devpost terms were accepted, no video was published and no final challenge
submission was made in this qualification or promotion.
