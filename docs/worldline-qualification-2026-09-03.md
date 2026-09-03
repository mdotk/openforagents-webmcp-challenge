# WORLDLINE qualification

Date: 3 September 2026.

Status: **bounded-contract candidate passes automated and local Chrome
qualification; public-deployment acceptance remains pending.**

## Why the WebMCP journey changed

The first public contract let an agent call the simulator without an explicit
search boundary. In one real extension trace, the agent made fourteen
simulation calls after its three evidence reads, found no science-transmission
future and never returned a decision to the person. The page could show
activity, but it did not tell the person that pressing Send would start several
automatic calls or give them a way to stop the page tools.

That was not an acceptable human-agent experience. The corrected contract
gives the agent the maneuver evidence it needs, permits at most five
simulations and requires it to place the exact probe-return and
science-transmission futures together before stopping. The person—not the
agent—then chooses which loss to accept.

## Current automated contract

- Lint passed.
- TypeScript production build passed.
- All 93 tests passed across 16 files.
- Dedicated domain tests cover the five-call simulation budget, exact
  duplicate handling, structured failure reasons, mutually exclusive outcomes,
  choice invariants, revision checks, person selection, one-use execution and
  replay rejection.
- Dedicated WebMCP tests cover closed schemas, evidence sufficient for a
  bounded investigation, the stopping result and exact 5 → 6 → 2 inventory.
- Dedicated page tests cover guided and WebMCP-ready openings, the explicit
  explanation of automatic agent calls, the stop-tools control, both person
  choices, complete guided execution, live tool counts and the rule that only
  actually tested worldlines are drawn.
- The page does not infer success merely because three simulations ran.
- Existing shopping, fitting-room, rack-rescue and launch-window tests remain
  green.

## Local Chrome WebMCP acceptance

The current candidate was exercised in the user's attached Chrome profile with
the WebMCP Model Context Tool Inspector open against the local Vite server.
Chrome discovered the exact five initial tools.

The supplied mission produced this bounded agent journey:

1. It read the mission, packets and maneuver window once each.
2. It tested one probe-return worldline, one total-loss control and one
   science-transmission worldline.
3. It called `present_worldline_choices` with the exact two viable IDs.
4. The page displayed both futures together and remained at five tools.
5. The agent stopped and asked the person to select a future directly on the
   page. It did not select a future or execute a burn.

The exact timings were chosen by the agent from the tool evidence rather than
hard-coded into its request. In the observed run it returned a 40-second,
3,600 m/s probe path and a 45-second, 2,200 m/s science path. The latter sends
the 30 MB unique packet set within the 71-second contact window.

The person-visible guided execution was then exercised from the same domain
state machine. Choosing the discovery changed the actual browser inventory
from five to six tools. Executing the selected burn changed it to two and
completed the burn, signal travel, 23-year Earth clock and verified receipt.

The emergency stop was tested separately against the real inspector. After a
tool call made agent activity visible, **Stop agent tools** changed the page to
`WebMCP paused`; the inspector immediately reported that no tools were
registered for the document. No burn or simulated mission-state change was
performed by that read-only stop test.

The first public execution probe exposed one registration-handoff defect: the
burn completed, but aborting the temporary tool in the same microtask made the
inspector display a transient failure instead of its successful result. The
registration reconciler now defers only the executed-state inventory swap to
the next task. A regression model fails if a tool disappears before its result
is delivered. The full suite remains green, and the repeated real Chrome call
returned the verified receipt before the inventory changed to the two final
tools.

Browser acceptance therefore confirmed:

1. The root document exposes exactly five initial tools.
2. The supplied mission causes one evidence-led investigation of no more than
   five simulations.
3. The agent finds a probe-return route, a total-loss control and a
   science-transmission route.
4. The page visibly updates from the same shared state and reports the actual
   call budget.
5. `present_worldline_choices` puts both viable futures on the page and tells
   the agent to stop.
6. No burn is selected or executed before the person acts.
7. The person's choice alone adds the argument-free
   `execute_authorized_burn` tool, changing inventory from five to six.
8. Execution consumes the exact authority and leaves only
   `read_final_state` and `verify_transmission_receipt`.
9. The stop control unregisters the page tools during an investigation.
10. The desktop and inspector-side-panel layouts remain legible. At the narrow
    page width created by the open inspector, the first outcome card and the
    activity status occupy separate regions with no overlap.

The previous 6 → 7 → 2 browser result qualified an earlier contract only. It
does not qualify this replacement contract and is not being reused as current
evidence.

## Scope

WORLDLINE is a deterministic, scientifically informed educational simulation.
There is no real spacecraft, burn, account or external mission behind it. A
pass in one supporting browser establishes only the behavior observed in that
browser and version; it does not establish compatibility with every browser,
agent or future WebMCP implementation.

No Devpost terms were accepted, no video was published and no final challenge
submission was made as part of this correction.
