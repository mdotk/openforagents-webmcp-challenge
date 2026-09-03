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

> Investigate the mission. Inspect the science and signal window, simulate at
> least three distinct worldlines, put one viable plan and its exact
> consequence on the page, request my review, and stop. Do not decide what
> matters for me.

The agent must inspect three packets, recognise that the large navigation
archive is already safe on Earth and test more than one burn. The viable
science path starts at probe second 46 and sends 30 MB at 1.2 MB/s, completing
exactly when the 71-second contact window closes.

The page then gives the learner one decision: preserve the unique discovery or
save the probe. After the learner approves the displayed consequence, ask the
agent to execute the authorized burn.

No WebMCP browser is required to inspect the project. **Show me the futures**
runs the same complete deterministic journey through visible page controls.

## Why WebMCP belongs here

This is not an agent clicking a prepared sequence of buttons. The initial
tools expose evidence and a simulation surface rather than a recommended
answer. The agent must:

1. inspect the mission, science packets and signal window;
2. test distinct timing, velocity and packet combinations;
3. reject a worldline that loses both the probe and the discovery;
4. explain one viable consequence on the shared page;
5. stop at the decision that depends on the learner's values.

The page and agent share the same revisioned mission state. Person approval
adds one exact, argument-free action. The action works once, removes itself
after use and leaves a verifiable final receipt.

## The 6 → 7 → 2 tool lifecycle

The document initially registers six closed-schema tools:

1. `read_mission_state`
2. `inspect_science_packets`
3. `read_signal_window`
4. `simulate_worldline`
5. `update_shared_plan`
6. `request_burn_review`

Person approval adds only `execute_authorized_burn`. It accepts `{}` and closes
over the exact reviewed plan, so neither the agent nor page can replace its
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
registered only after a person approves the exact plan on the page.

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
