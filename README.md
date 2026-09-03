# WORLDLINE

WORLDLINE is an interactive science lesson from
[Open for Agents](https://www.openforagents.com/), created by Enoki Limited for
the WebMCP Challenge. You and a browser agent explore black holes, light-years
and worldlines, the paths objects take through space and time. You test whether a stranded probe can both escape and
send its two files to Earth. If it cannot, you choose what to save.

[Try WORLDLINE](https://openforagents-webmcp-challenge.vercel.app/) ·
[Read about the WebMCP Challenge](https://openai.com/webmcp-challenge/)

This is a made-up mission built to teach the ideas. It does not control a real
spacecraft or claim to model a black hole exactly.

## What you learn

WORLDLINE turns difficult space ideas into one mission you can take part in:

- a light-year measures distance, not time;
- a signal from 23 light-years away takes 23 years to reach Earth;
- 30 MB of data takes 25 seconds to send at 1.2 MB per second;
- the timing and strength of a burn create different possible futures;
- some physical requirements cannot be met at the same time; and
- science can show the consequences, but a person must decide what matters.

## Try it with a browser agent

Open the live page in a browser with WebMCP support. Then open your browser
agent and say:

> Begin WORLDLINE.

The page gives the agent separate information about the files, engine, antenna
and closing radio link, not the tested burn values or a preselected conclusion. The first mission read returns the
current phase, permitted work and exact stopping point, so the person does not
have to paste operating instructions. After the agent establishes the two
starting outcomes, the simulation pauses. You first calculate how long
it takes to send the files, then predict what might prevent one burn from saving
the probe and sending the files. After you say **Test my prediction**,
the agent reads the calculation and prediction from shared page state, tests a
middle option and a different option that challenges the prediction, then explains
what the results support. The agent can run at most five simulations.

The agent can finish its tool calls faster than a person can follow them, so
the page replays the real shared state as a paced investigation. Each tested
future appears as a question, attempted maneuver, result and lesson. The page
keeps the exact sending-time answer hidden until you calculate it. Only after
both investigation acts does the page present two possible
outcomes. The agent recommends sending the files because Earth has no copies,
and clearly states that the probe will not escape.
You choose whether to send the two files Earth does not have or save the
probe. That choice adds one exact execution tool. You say **Carry out
my choice.** The agent uses the approved action once and verifies the result.

The opening screen says whether WebMCP is available and does not claim that an
agent has started. It presents one short instruction rather than a copied
prompt. During an agent run, the page shows the attempt budget, the ideas the
agent has confirmed or changed, and a control that unregisters its WebMCP
tools. If WebMCP
is unavailable, the page says so and does not replace the agent's investigation
with a scripted demonstration.

Each tested worldline is drawn only after the corresponding simulation runs.
After the approved send-files burn, the page shows the antenna holding Earth,
each of the two files leaving, the radio link closing, the signal
crossing 23 light-years and the verified final receipt. The 23-year wait is
the signal's travel time from a probe 23 light-years away; the experience does
not invent an unsupported probe-time comparison. Reduced-motion preferences
skip directly to the same completed outcome.

## Why WebMCP belongs here

This is not an agent clicking a prepared sequence of buttons. The three-part
investigation stops twice for the person to take part, while the tools expose
evidence and a simulation rather than burn values or a prepared recommendation. The
agent must:

1. inspect separate mission, file, engine and antenna information;
2. establish one tested escape outcome and one tested send-files outcome;
3. stop after the two clear outcomes and ask you to calculate the sending time;
4. ask what you think might prevent one burn from doing both, then read your calculation and prediction from shared state;
5. test a middle option and a different option that challenges your prediction;
6. recommend sending the files because Earth has no copies, while explaining that the probe will not escape;
7. stop at the irreversible decision that belongs to you.

You perform the central calculation on the shared page. Helping the probe escape
requires a burn by second 42 that changes the probe’s speed by at least 3,400 m/s. Sending the
files requires a burn between seconds 44 and 50 that changes the probe's speed
by 2,000 to 2,400 m/s. Those requirements happen at different times. The page
also shows that 30 MB at 1.2 MB/s takes 25 seconds to send.

Your calculation, prediction, tested ideas, recommendation and execution
all share the same revisioned mission state. The evidence-based mission goal
guides the recommendation, but the person still makes the final choice. That
choice adds one exact, argument-free action. The
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

The person's choice adds only `execute_authorized_burn`. It accepts `{}` and
closes over the exact selected simulation, so the agent cannot replace its
timing, speed change, files or consequence during execution.

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
        missionObjective: snapshot.missionObjective,
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
revision. The initial mission read does not reveal the file information, and it
never returns the internal approval identity. The one-use execution tool is
registered only after the person selects one of the two exact simulations on
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
