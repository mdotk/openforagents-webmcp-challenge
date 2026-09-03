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

Open the live page in a browser with WebMCP support and give the agent this
request:

> Investigate this mission and recommend the best recoverable future. My
> priority is to preserve observations that cannot be recreated. Read the
> available evidence. You have at most five simulations. Before each test,
> state a concise hypothesis and expected outcome, then adapt to what the test
> reveals. Challenge your leading hypothesis with a control test. Place the
> strongest materially different viable alternatives on the shared page with
> one recommendation tied to my priority. Do not choose or execute a burn for
> me.

The page gives the agent separate packet, propulsion, antenna and signal
evidence—not a route or answer. The agent must decide which evidence matters,
form competing hypotheses, predict what each test will do and revise its plan
when a result disproves that prediction. Five simulation calls is a hard
limit. Repeating an exact worldline consumes an attempt but does not create
duplicate mission state.

The page shows every hypothesis, expected outcome and result as the agent
works. When it has enough evidence, it presents two viable futures, explains
the rejected control and recommends one for the learner's stated priority.
The learner chooses whether to preserve the unique discovery or save the
probe. That choice adds one exact execution tool. Ask the agent to use it once.

The opening screen says whether WebMCP is available and does not claim that an
agent has started. **Copy mission for my agent** explains that pressing Send
starts an investigation, that each hypothesis will appear on the page and that
no burn can happen before the learner chooses. During an agent run, the page
shows the attempt budget, confirmed and revised hypotheses, and a control that
unregisters its WebMCP tools. **Run guided mission** uses the same state machine
through visible page controls when no agent is available.

Each tested worldline is drawn only after the corresponding simulation runs.
After the approved burn, the page shows the burn, the two science packets
leaving the probe, the 23-year Earth clock and the verified final receipt.
Reduced-motion preferences skip directly to the completed outcome.

## Why WebMCP belongs here

This is not an agent clicking a prepared sequence of buttons. The initial
tools expose evidence and a simulation surface rather than a recommended
answer. The agent must:

1. inspect separate mission, packet and maneuver evidence;
2. choose which facts matter for the learner's stated priority;
3. state a hypothesis and expected outcome before each bounded simulation;
4. revise its search after a failed prediction and challenge its leading idea;
5. recommend one viable future with an evidence-based reason;
6. stop at the irreversible decision that belongs to the learner.

The learner's priority, tested hypotheses, recommendation and execution all
share the same revisioned mission state. The agent may read the priority but
cannot rewrite it. Person approval adds one exact, argument-free action. The
action works once, removes itself after use and leaves a verifiable final
receipt.

## The 5 → 6 → 2 tool lifecycle

The document initially registers five closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_worldline_choices`

The learner's choice adds only `execute_authorized_burn`. It accepts `{}` and
closes over the exact selected simulation, so the agent cannot replace its
timing, velocity, packets or consequence during execution.

After execution, every planning and execution tool disappears. Only
`read_final_state` and `verify_transmission_receipt` remain.

## WebMCP implementation

[`registerWorldlineTools()`](src/webmcp/register-worldline-tools.ts) reads the
page-level `document.modelContext` API and registers each tool with an
`AbortSignal`:

```ts
const modelContext = documentScope?.modelContext
await modelContext.registerTool(tool, { signal: controller.signal })
```

The planning tools, temporary execution tool and final verification tools use
separate controllers. State changes reconcile the actual browser inventory by
aborting the old registration lifetime and registering only the tools valid
for the new phase.

The schemas reject additional properties. Mutations require the current
revision. The initial mission read does not reveal the packet evidence, and it
never returns the temporary authority identity. The one-use execution tool is
registered only after the learner selects one of the two exact simulations on
the page.

The state machine is implemented in
[`src/domain/worldline.ts`](src/domain/worldline.ts). The visible page, guided
journey and native WebMCP tools all use that same state machine.

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

The native path requires a browser that exposes the page-level WebMCP API used
by this project. Other browsers receive the complete visible journey without
claiming that WebMCP tools are available.

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
