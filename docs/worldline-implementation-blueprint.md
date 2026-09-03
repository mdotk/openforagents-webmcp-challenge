# WORLDLINE implementation blueprint

Date: 3 September 2026.

WORLDLINE is a separate WebMCP candidate. It does not replace the qualified
shopping root unless its own release gate passes.

## The experience

A fictional probe approaches a black hole with three data packets, a short
contact window and one remaining burn. There is enough fuel to save the probe
or enough time to transmit the unique discovery, but not both.

The agent must inspect the packets, compare multiple burns, distinguish a
replicated engineering archive from the two unique observations, explain the
trade-off and place one exact viable plan on the shared page. It cannot decide
which outcome matters to the person.

The person reviews the consequence and approves one immutable burn. Approval
creates a one-use tool. Execution bends the visible worldline, sends the signal
and advances Earth's clock by 23 years while the probe's clock reaches 9
minutes 17 seconds.

This is a deterministic, scientifically informed educational simulation. Its
numbers support the interaction contract; they are not a precision model of a
real black hole, spacecraft or mission.

## WebMCP lifecycle

The initial document registers six closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `read_signal_window`
4. `simulate_worldline`
5. `update_shared_plan`
6. `request_burn_review`

No tool recommends a pre-authored answer, approves a burn or executes one.
Simulation accepts the exact probe-second, delta-v and packet IDs to test.
Revision checks reject stale planning.

Person approval alone registers:

7. `execute_authorized_burn`

That tool has an empty input schema. It closes over the approved plan, works
once and cannot change timing, delta-v, packets or consequence. After use, the
six planning tools and temporary execution tool disappear. The document then
registers only:

1. `read_final_state`
2. `verify_transmission_receipt`

The visible and browser-discovered lifecycle is therefore exactly 6 → 7 → 2.

## Human-first presentation

The route uses one large space scene rather than a control dashboard. The
opening states the dilemma in one sentence. Earth and probe clocks, three
possible worldlines, one probe and one signal carry the state change.

Detailed packet facts and exact tool names stay collapsed. A guided path runs
the same deterministic mission when no compatible WebMCP browser agent is
available. Tool availability is reported without claiming that an agent is
connected.

## Promotion gate

WORLDLINE may replace the root only after all of the following are true:

- A person can understand the dilemma from the first screen.
- A supported browser discovers exactly six initial tools.
- The agent can reach a viable plan without a recommendation shortcut.
- The page and structured tool results remain consistent.
- Approval alone creates the seventh, argument-free tool.
- The burn executes once and replay fails.
- Exactly two final verification tools remain.
- The guided path completes the same visible mission.
- Desktop, 390-pixel and 320-pixel layouts remain legible without horizontal
  overflow.
- Lint, TypeScript, automated tests and production build pass.
- The deployed route works without console errors.

Promotion is a separate decision. Devpost terms, video publication and final
submission remain outside this implementation authority.
