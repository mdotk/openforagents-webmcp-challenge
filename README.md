# WORLDLINE — One probe. One signal.

WORLDLINE is an interactive science story created by Enoki Limited for the
WebMCP Challenge. A browser agent investigates possible futures for a probe
near a black hole. It prepares the trade-off; the learner decides what
matters.

[Try WORLDLINE](https://openforagents-webmcp-challenge.vercel.app/) ·
[Read about the WebMCP Challenge](https://openai.com/webmcp-challenge/)

There is no real spacecraft, mission, account or external system behind the
demonstration. Its deterministic numbers support the interaction and do not
claim to be a precision black-hole simulation.

## Try it with a browser agent

Open the live page in a browser with WebMCP support. Choose what matters most,
then open your browser agent and say:

> Begin WORLDLINE.

The page gives the agent separate packet, propulsion, antenna and signal
evidence—not the burn values or answer. The first mission read returns the
current phase, permitted work and exact stopping point, so the person does not
have to paste operating instructions. After the agent establishes the two
extremes, the simulation pauses. The learner first calculates how long the
signal needs, then predicts why one burn cannot save both. After the learner
says **Test my prediction**, the agent reads both answers from shared page
state, tests a compromise and counterexample,
then explains what the learner got right. Five simulation calls is a hard
limit.

The agent can finish its tool calls faster than a person can follow them, so
the page replays the real shared state as a paced investigation. Each tested
future appears as a question, attempted maneuver, result, calculation and
lesson. Only after both investigation acts does the page present two viable
futures and a recommendation tied to the learner's stated priority.
The learner chooses whether to preserve the unique discoveries or save the
probe. That choice adds one exact execution tool. The learner says **Carry out
my choice.** The agent uses the approved action once and verifies the result.

The opening screen says whether WebMCP is available and does not claim that an
agent has started. It presents one short instruction rather than a copied
prompt. During an agent run, the page shows the attempt budget, confirmed and
revised hypotheses, and a control that unregisters its WebMCP tools. If WebMCP
is unavailable, the page says so and does not replace the agent's investigation
with a scripted demonstration.

Each tested worldline is drawn only after the corresponding simulation runs.
After the approved science burn, the page shows the antenna holding Earth,
each of the two packets leaving, the contact window closing, the signal
crossing 23 light-years and the verified final receipt. The 23-year wait is
the signal's travel time from a probe 23 light-years away; the experience does
not invent an unsupported probe-time comparison. Reduced-motion preferences
skip directly to the complete, causally equivalent outcome.

## Why WebMCP belongs here

This is not an agent clicking a prepared sequence of buttons. The three-part
investigation sets two deliberate stopping points, while the tools expose evidence
and a simulation surface rather than burn values or a recommended answer. The
agent must:

1. inspect separate mission, packet and maneuver evidence;
2. choose which facts matter for the learner's stated priority;
3. stop after the two extremes and ask the learner to calculate the signal time;
4. ask the learner to predict the cause, then read both answers from shared state;
5. test a compromise and counterexample, then assess the prediction;
6. recommend one viable future with an evidence-based reason;
7. stop at the irreversible decision that belongs to the learner.

The learner performs the central calculation on the shared page. Returning the probe
requires a burn by second 42 with at least 3,400 m/s of delta-v. Sending the
discoveries requires a burn between seconds 44 and 50 at 2,000–2,400 m/s. The
time and thrust regions never overlap. The page also shows that 30 MB at 1.2
MB/s takes 25 seconds to transmit.

The learner's priority, tested hypotheses, recommendation and execution all
share the same revisioned mission state. The agent may read the priority but
cannot rewrite it. Person approval adds one exact, argument-free action. The
action works once, removes itself after use and leaves a verifiable final
receipt.

## The 6 → 7 → 2 tool lifecycle

The document initially registers six closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_learning_checkpoint`
6. `present_worldline_choices`

The learner's choice adds only `execute_authorized_burn`. It accepts `{}` and
closes over the exact selected simulation, so the agent cannot replace its
timing, velocity, packets or consequence during execution.

After execution, every planning and execution tool disappears. Only
`read_final_state` and `verify_transmission_receipt` remain.

## WebMCP implementation

[`registerWorldlineTools()`](src/webmcp/register-worldline-tools.ts) reads the
page-level `document.modelContext` API. The production implementation builds
each tool from the same revisioned mission control. In direct form, one of the
initial registrations looks like this:

```ts
const control = createWorldlineControl()
const controller = new AbortController()

await document.modelContext.registerTool({
  name: 'read_mission_state',
  description: 'Start or resume WORLDLINE and read the current mission phase.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => {
    const snapshot = control.getSnapshot()
    return {
      content: [{
        type: 'text',
        text: `Mission revision ${snapshot.revision}; phase ${snapshot.phase}.`,
      }],
      structuredContent: {
        revision: snapshot.revision,
        phase: snapshot.phase,
        humanPriority: snapshot.humanPriority,
      },
    }
  },
}, { signal: controller.signal })
```

The shipped code adds phase-aware guidance and the remaining safe fields before
returning this result. The planning tools, temporary execution tool and final
verification tools use separate controllers. State changes reconcile the actual browser inventory by
aborting the old registration lifetime and registering only the tools valid
for the new phase.

The schemas reject additional properties. Mutations require the current
revision. The initial mission read does not reveal the packet evidence, and it
never returns the temporary authority identity. The one-use execution tool is
registered only after the learner selects one of the two exact simulations on
the page.

The state machine is implemented in
[`src/domain/worldline.ts`](src/domain/worldline.ts). The visible page and
native WebMCP tools use that same state machine.

## Other challenge experiments

Earlier experiments remain available for comparison, but WORLDLINE is the
root experience:

- [Adaptive Shopping Canvas](https://openforagents-webmcp-challenge.vercel.app/?experience=shopping)
- [Launch Window A-01](https://openforagents-webmcp-challenge.vercel.app/?experience=launch-window)
- [Shared Fitting Room](https://openforagents-webmcp-challenge.vercel.app/?experience=fitting-room)
- [Rack Rescue](https://openforagents-webmcp-challenge.vercel.app/?experience=rack-rescue)

Their design and qualification records remain in `docs/`.

## Run locally

The project requires a current Node.js release with `npm`.

```sh
npm ci
npm run dev
```

Vite prints the local URL. Open it in a browser to use the experience.

Run lint, all automated tests and the production build together:

```sh
npm run check
```

## Browser support and evidence

The experience requires a browser that exposes the page-level WebMCP API used
by this project. Other browsers receive a clear compatibility message and do
not pretend to run the investigation.

Qualification in one supporting browser establishes only the behaviour
observed in that browser and version. It does not establish compatibility with
every browser, agent or future WebMCP implementation.

WORLDLINE's observed tool lifecycle, responsive checks and limitations are
recorded in
[`docs/worldline-qualification-2026-09-03.md`](docs/worldline-qualification-2026-09-03.md).
The visual source and transformations are recorded in
[`docs/worldline-asset-provenance.md`](docs/worldline-asset-provenance.md).

## Project status and provenance

This standalone project was created during the challenge period. It is not a
copy, release or renamed edition of another Open for Agents product. The
[`challenge chronology`](docs/challenge-chronology.md) records its provenance.

No final challenge submission or public entry video has been made.

## Licence

Copyright (C) 2026 Enoki Limited.

The source is available under the GNU General Public License, version 2 or, at
your option, any later version (`GPL-2.0-or-later`). See [`LICENSE`](LICENSE),
[`NOTICE.md`](NOTICE.md) and
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing a change and
[`SECURITY.md`](SECURITY.md) for private vulnerability reports.
