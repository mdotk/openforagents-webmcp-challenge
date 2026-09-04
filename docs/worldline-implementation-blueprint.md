# WORLDLINE implementation blueprint

Date: 3 September 2026. Updated 4 September 2026.

WORLDLINE is a separate WebMCP candidate. It does not replace the qualified
shopping root unless its own release gate passes.

## The experience

A fictional probe has flown close enough to a black hole to measure how it
bends space and changes light. Its computer has processed and compressed the
raw measurements into an 18 MB gravity-map file and a 12 MB light-spectrum file,
both ready to send. It also holds a navigation record. Earth already
has the navigation record, but it has no copy of the first two files. The probe
has one final radio link that closes in 71 seconds and one remaining burn. An early, powerful burn
can let the probe escape. A later, gentler burn can keep the antenna pointed at
Earth long enough to send the files. The permitted burn times and speed changes
do not overlap.

The agent must inspect the files and the engine, antenna and radio-link limits,
compare multiple burns and distinguish the navigation record Earth already has
from the gravity map and light spectrum it does not have. The opening has one
instruction: the person says **Begin WORLDLINE.** The agent shows the two
starting outcomes, then stops for the person to calculate the sending time and
predict what might stop one burn from achieving both goals. The person says
**Test my prediction.** The agent reads the calculation and prediction, tests a
middle option and a different option that challenges the prediction, explains what
the results support and puts both possible
outcomes on the page. It cannot
decide which outcome matters to the person. It recommends sending the two files
because Earth has no copies and explains that the probe will not escape.

The person chooses which consequence to accept. That choice creates a one-use
tool for the exact selected burn. The person says **Carry out my choice.**
Execution bends the visible worldline and
either lets the probe escape or sends the files. The send-files path advances
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
permitted next work and exact stopping condition. The maneuver tool provides the engine and antenna limits, radio speed, the time when the radio link closes
and the file-completion rule. Simulation accepts the exact probe-second,
speed change, also called delta-v, and file IDs to test. It returns structured outcomes and failure
reasons. The document permits at most five simulation calls. The first act
accepts only `extreme` tests and pauses once both clearly different outcomes have
been found. `present_learning_checkpoint` moves the page to the person's
calculation and prediction and prevents further simulation until the person
completes both. The
second act accepts one `compromise` and one `counterexample`. In the code, these
mean a middle option and a different option designed to challenge the person's prediction. Exact duplicate
calls consume an attempt but do not create duplicate mission state. Revision
checks reject stale planning.

`present_worldline_choices` accepts the IDs of the two possible
simulations. It is unavailable until the person has made a prediction and the
agent has tested both second-act roles, including a total-loss result. The tool
must assess the person's prediction, explain what the tests taught and
recommend sending the two files because Earth has no copies. The
state machine creates the factual two-option review; the agent cannot choose,
approve or execute either future.

Person approval alone registers:

7. `execute_authorized_burn`

That tool has an empty input schema. It closes over the selected simulation,
works once and cannot change timing, speed change, files or consequence. After
use, the six planning tools and temporary execution tool disappear. The
document then
registers only:

1. `read_final_state`
2. `verify_transmission_receipt`

The visible and browser-discovered lifecycle is therefore exactly 6 → 7 → 2.
The person uses three short instructions across that lifecycle: **Begin
WORLDLINE**, **Test my prediction**, and **Carry out my choice**.

## Human-first presentation

The route uses one large space scene rather than a control dashboard. The
opening asks the investigation question in one sentence and gives one short
browser-agent instruction. Earth and probe clocks, three
possible worldlines, one probe and one signal carry the state change.
During investigation, the active path is labelled and animated while older
paths fade. The top readings show the tested burn time and the radio-link time
remaining for the result currently on screen. During execution, they switch to
probe time and signal travel toward Earth.

Detailed file facts and exact tool names stay collapsed. If no compatible
WebMCP browser agent is available, the page explains what is required rather
than silently running a scripted replacement. Tool availability is reported
without claiming that an agent is connected. Each browser-agent handoff shows
one short natural instruction. The phase-aware tool result carries the
investigation rules, shows the five-call budget and tells the agent where to
stop. The agent may finish several simulations before the person has read them,
so the page holds one stable working view until the round is complete. The
person chooses **Review Test 1** or **Review Test 3** to open the first result,
then chooses **Show next test** for the other result. A separate control
continues to the calculation or final results. There is no timed narrative progression. A visible control
can unregister the page tools during an investigation.

## Promotion gate

WORLDLINE may replace the root only after all of the following are true:

- A person can understand the dilemma from the first screen.
- The opening asks for no choice before the evidence has been investigated.
- **Begin WORLDLINE** is the only opening instruction.
- A supported browser discovers exactly six initial tools.
- The agent finds both clear outcomes, opens the learning checkpoint and
  stops for the person.
- The person's transmission calculation and prediction become shared page state.
- In a second turn, the agent tests a middle option and a different option that challenges the person's prediction, explains
  the evidence and stops at the value decision.
- The page and structured tool results remain consistent.
- Every test remains visible until the person chooses to continue.
- The agent recommends sending the files because Earth has no copies, explains
  that the probe will not escape, and stops with both possible outcomes visible.
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
