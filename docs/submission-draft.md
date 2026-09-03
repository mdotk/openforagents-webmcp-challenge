# WORLDLINE submission draft

This is working copy for the Devpost form. It has not been submitted.

## Project title

WORLDLINE

## One-line description

A browser agent investigates possible futures for a probe beside a black hole;
the learner chooses whether the spacecraft or its unique discovery comes home.

## Description

WORLDLINE is an interactive science story about a decision with no perfect
answer. A probe has 71 seconds of contact remaining beside a black hole. It has
enough fuel to escape, or enough time to transmit two unique science packets,
but it cannot do both.

The page does not give the browser agent a prepared route or sequence. It
exposes separate packet, propulsion, antenna and signal evidence plus a
five-call simulation budget. Before each test, the agent must state a
hypothesis and expected outcome. The shared page shows whether the result
confirmed or revised that hypothesis, so the learner can see the investigation
change instead of receiving a polished answer after the fact.

Once the evidence supports a real decision, the agent challenges its leading
idea with a control test, presents the strongest materially different viable
futures and recommends one for the learner's stated priority. It must then
stop.

The learner makes the value judgment. Choosing one future adds a single
argument-free WebMCP tool that closes over the exact tested burn. The agent can
execute that burn once, after which the planning and execution tools disappear.
The final page shows either the recovered probe or the science signal arriving
on Earth 23 years later.

This is a deterministic, scientifically informed educational simulation. It
does not control a real spacecraft and does not claim to be a precision model
of a black-hole mission.

## Why WebMCP is a strong fit

The useful part of this experience is not an agent clicking the same buttons a
person would click. WebMCP gives the agent structured access to evidence,
constraints, simulation and shared state that would otherwise be scattered
across a visual interface. The agent can investigate several possible futures
and update the page as it learns without screen-scraping or inventing hidden
state.

WebMCP also makes the human boundary part of the product. The agent may gather
evidence, calculate, simulate and explain. It cannot decide which loss the
learner accepts. Only a choice on the page creates the exact one-use execution
capability.

## How it creates a better experience

A fixed animation can show relativity, but it cannot investigate with the
learner. WORLDLINE lets a browser agent turn mission evidence into two concrete,
visually different futures. Every tested route appears on the scene as it is
found. The person can compare consequences rather than decode raw telemetry,
then see the chosen burn, signal and clocks play out from the same shared state.

People without a compatible browser agent can run the complete guided version.
The opening says which mode is available and never claims that an agent has
started when none has.

## What people and agents can do together

The agent performs the evidence-heavy work: comparing three sources, deciding
what is worth saving, proposing competing explanations, predicting tests,
learning from a failed prediction and defending one recommendation within a
hard simulation budget. The person contributes the part the model cannot
derive from physics: whether preserving the probe or the irreplaceable
discovery matters more.

The result is a shared decision rather than a chat answer. The tested
worldlines, human choice, temporary capability, execution animation and final
receipt all live on the page.

## How WebMCP is implemented

The document initially registers five closed-schema tools with
`document.modelContext.registerTool()`:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_worldline_choices`

The domain model uses revisions to reject stale changes and limits the
investigation to five simulation calls. `simulate_worldline` requires a
hypothesis and expected outcome, and returns whether the evidence confirmed or
revised it. `present_worldline_choices` requires two materially different
tested futures, a recommendation and a concise rationale. The domain binds
that recommendation to the person's server-owned priority. The tool succeeds
only after the agent has also tested a total-loss control.

The learner's selection registers `execute_authorized_burn`, changing the live
inventory from five tools to six. That tool accepts `{}` and closes over the
selected simulation, so its timing, velocity, packets and consequence cannot
be replaced during execution. It works once. Afterward, only
`read_final_state` and `verify_transmission_receipt` remain, producing the
5 → 6 → 2 lifecycle visible in the browser.

The native agent path and the guided path use the same revisioned TypeScript
state machine. The priority chosen on the page is part of that state: the agent
can read it but cannot replace it when submitting its recommendation. Tool
registration lifetimes are controlled with abort signals, and all input
schemas reject additional properties.

## Testing instructions

1. Open https://openforagents-webmcp-challenge.vercel.app/ in ChatGPT's in-app
   browser or Chrome with WebMCP enabled.
2. Confirm the page reports **WebMCP ready · 5 tools**.
3. Select **Copy mission for my agent**, paste the request into the browser
   agent and send it.
4. Watch the page show each hypothesis, expected outcome and result. At least
   one prediction should be visibly revised by the evidence. The agent should
   present two materially different viable futures, recommend one for the
   selected priority and stop without choosing one.
5. Choose either future on the page. Confirm the inventory changes to six and
   includes `execute_authorized_burn`.
6. Ask the agent to execute the authorized burn. Confirm the inventory becomes
   two read-only verification tools and the cinematic outcome completes.
7. Reload and select **Run guided mission** to exercise the same state and both
   possible endings without an agent.

No credentials are required.

## Links

- Live experience: https://openforagents-webmcp-challenge.vercel.app/
- Public source: https://github.com/mdotk/openforagents-webmcp-challenge
- Licence: GPL-2.0-or-later
