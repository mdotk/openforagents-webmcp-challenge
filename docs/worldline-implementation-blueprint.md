# WORLDLINE implementation blueprint

Date: 3 September 2026.

WORLDLINE is a separate WebMCP candidate. It does not replace the qualified
shopping root unless its own release gate passes.

## The experience

A fictional probe approaches a black hole with three data packets, a short
contact window and one remaining burn. There is enough fuel to save the probe
or enough time to transmit the unique discovery, but not both.

The agent must inspect the packets and the bounded maneuver window, compare
multiple burns, distinguish a replicated engineering archive from the two
unique observations and put both viable futures on the shared page. It cannot
decide which outcome matters to the person.

The person chooses which consequence to accept. That choice creates a one-use
tool for the exact selected burn. Execution bends the visible worldline and
either returns the probe or sends the signal. The science path advances
Earth's clock by 23 years while the probe's clock reaches 9 minutes 17
seconds.

This is a deterministic, scientifically informed educational simulation. Its
numbers support the interaction contract; they are not a precision model of a
real black hole, spacecraft or mission.

## WebMCP lifecycle

The initial document registers five closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_worldline_choices`

The maneuver tool provides the two safe corridors, signal rate, contact
deadline and completion rule. Simulation accepts the exact probe-second,
delta-v and packet IDs to test. It returns structured outcomes and failure
reasons. The document permits at most five simulation calls and closes
simulation as soon as a probe-return route, science-transmission route and
total-loss control have all been found. Exact duplicate calls consume an
attempt but do not create duplicate mission state. Revision checks reject
stale planning.

`present_worldline_choices` accepts the IDs of the exact opposite viable
simulations. It is unavailable until the agent has also tested a total-loss
control. The server creates the factual two-option review; the agent cannot
choose, approve or execute either future.

Person approval alone registers:

6. `execute_authorized_burn`

That tool has an empty input schema. It closes over the selected simulation,
works once and cannot change timing, delta-v, packets or consequence. After
use, the five planning tools and temporary execution tool disappear. The
document then
registers only:

1. `read_final_state`
2. `verify_transmission_receipt`

The visible and browser-discovered lifecycle is therefore exactly 5 → 6 → 2.

## Human-first presentation

The route uses one large space scene rather than a control dashboard. The
opening states the dilemma in one sentence. Earth and probe clocks, three
possible worldlines, one probe and one signal carry the state change.

Detailed packet facts and exact tool names stay collapsed. A guided path runs
the same deterministic mission when no compatible WebMCP browser agent is
available. Tool availability is reported without claiming that an agent is
connected. The browser-agent handoff explains that pressing Send starts
automatic tool calls, shows the five-call budget and offers a visible control
that unregisters the page tools during an investigation.

## Promotion gate

WORLDLINE may replace the root only after all of the following are true:

- A person can understand the dilemma from the first screen.
- A supported browser discovers exactly five initial tools.
- The agent can find both viable futures and a failed control without an
  unbounded search or recommendation shortcut.
- The page and structured tool results remain consistent.
- The agent stops with both viable futures visible and does not choose one.
- The person's choice alone creates the sixth, argument-free tool.
- The burn executes once and replay fails.
- Exactly two final verification tools remain.
- The guided path completes the same visible mission.
- Desktop, 390-pixel and 320-pixel layouts remain legible without horizontal
  overflow.
- Lint, TypeScript, automated tests and production build pass.
- The deployed route works without console errors.

## Promotion outcome

The gate passed on 3 September 2026. WORLDLINE became the public root, while
the qualified Adaptive Shopping Canvas remained available at
`?experience=shopping`. The promotion changed neither experience's WebMCP
contract.

Devpost terms, video publication and final submission remain outside this
implementation authority.
