# WORLDLINE implementation blueprint

Date: 3 September 2026. Updated 4 September 2026.

WORLDLINE is a separate WebMCP candidate. It does not replace the qualified
shopping root unless its own release gate passes.

## The experience

A fictional probe approaches a black hole with three data packets, a short
contact window and one remaining burn. There is enough fuel to save the probe
or enough time to transmit the unique discovery, but not both.

The agent must inspect the packets and bounded maneuver window, compare
multiple burns and distinguish a replicated engineering archive from the two
unique observations. The three-part investigation begins when the learner says
**Begin WORLDLINE.** The agent establishes the two extreme futures, then stops
for the learner to calculate the signal time and predict why no burn can
achieve both. The learner says **Test my prediction.** The agent reads both
shared answers, tests a
compromise and counterexample, teaches
what the evidence supports and puts both viable futures on the page. It cannot
decide which outcome matters to the person.

The person chooses which consequence to accept. That choice creates a one-use
tool for the exact selected burn. The learner says **Carry out my choice.**
Execution bends the visible worldline and
either returns the probe or sends the signal. The science path advances
Earth's clock by the signal's 23-year travel time while the probe's recorded
mission clock stops when its transmission completes.

This is a deterministic, scientifically informed educational simulation. Its
numbers support the interaction contract; they are not a precision model of a
real black hole, spacecraft or mission.

## WebMCP lifecycle

The initial document registers six closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_learning_checkpoint`
6. `present_worldline_choices`

The mission read provides phase-aware guidance: the current objective,
permitted next work and exact stopping condition. The maneuver tool provides the two safe corridors, signal rate, contact
deadline and completion rule. Simulation accepts the exact probe-second,
delta-v and packet IDs to test. It returns structured outcomes and failure
reasons. The document permits at most five simulation calls. The first act
accepts only `extreme` tests and pauses once both opposite viable outcomes have
been found. `present_learning_checkpoint` moves the page to the learner's
calculation and prediction and prevents further simulation until the learner
completes both. The
second act accepts one `compromise` and one `counterexample`. Exact duplicate
calls consume an attempt but do not create duplicate mission state. Revision
checks reject stale planning.

`present_worldline_choices` accepts the IDs of the exact opposite viable
simulations. It is unavailable until the learner has made a prediction and the
agent has tested both second-act roles, including a total-loss result. The tool
must assess the learner's prediction and explain what the tests taught. The
state machine creates the factual two-option review; the agent cannot choose,
approve or execute either future.

Person approval alone registers:

7. `execute_authorized_burn`

That tool has an empty input schema. It closes over the selected simulation,
works once and cannot change timing, delta-v, packets or consequence. After
use, the six planning tools and temporary execution tool disappear. The
document then
registers only:

1. `read_final_state`
2. `verify_transmission_receipt`

The visible and browser-discovered lifecycle is therefore exactly 6 → 7 → 2.
The learner uses three short instructions across that lifecycle: **Begin
WORLDLINE**, **Test my prediction**, and **Carry out my choice**.

## Human-first presentation

The route uses one large space scene rather than a control dashboard. The
opening states the dilemma in one sentence. Earth and probe clocks, three
possible worldlines, one probe and one signal carry the state change.

Detailed packet facts and exact tool names stay collapsed. If no compatible
WebMCP browser agent is available, the page explains what is required rather
than silently running a scripted replacement. Tool availability is reported
without claiming that an agent is connected. Each browser-agent handoff shows
one short natural instruction. The phase-aware tool result carries the
investigation rules, shows the five-call budget and tells the agent where to
stop. A visible control can unregister the page tools during an investigation.

## Promotion gate

WORLDLINE may replace the root only after all of the following are true:

- A person can understand the dilemma from the first screen.
- A supported browser discovers exactly six initial tools.
- The agent finds both extreme futures, opens the learning checkpoint and
  stops for the learner.
- The learner's transmission calculation and prediction become shared page state.
- In a second turn, the agent tests a compromise and counterexample, explains
  the evidence and stops at the value decision.
- The page and structured tool results remain consistent.
- The agent stops with both viable futures visible and does not choose one.
- The person's choice alone creates the seventh, argument-free tool.
- The burn executes once and replay fails.
- Exactly two final verification tools remain.
- Desktop, 390-pixel and 320-pixel layouts remain legible without horizontal
  overflow.
- Lint, TypeScript, automated tests and production build pass.
- The deployed route works without console errors.

## Promotion outcome

The original WORLDLINE promotion gate passed on 3 September 2026. WORLDLINE
became the public root, while the qualified Adaptive Shopping Canvas remained
available at `?experience=shopping`. The later three-part learning contract passed
local automated, responsive and native-agent acceptance. It still requires a
fresh deployed readback before that newer contract is described as live.

Devpost terms, video publication and final submission remain outside this
implementation authority.
