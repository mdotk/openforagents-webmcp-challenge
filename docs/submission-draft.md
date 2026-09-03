# WORLDLINE submission draft

This is a working copy for the Devpost form. It has not been submitted.

## Project title

WORLDLINE

## One-line description

A browser agent investigates possible futures for a probe beside a black hole;
the learner chooses whether to save the spacecraft or its unique discoveries.

## Description

WORLDLINE is an interactive science story about a decision with no perfect
answer. A probe 23 light-years from Earth has 71 seconds of contact remaining
beside a black hole. It has
enough fuel to escape, or enough time to transmit two unique science packets,
but it cannot do both.

The experience is a three-part investigation. First, the browser agent reads separate
packet, propulsion, antenna and signal evidence, then tests the two extremes:
an early escape burn and a later transmission burn. It cannot continue to the
answer. The page stops and asks the learner to add the two packet sizes and
divide by the radio speed. It immediately explains that 30 MB at 1.2 MB/s
takes 25 seconds. The learner then predicts why one burn cannot save both the
probe and its discoveries.

That calculation and prediction become shared page state. The learner says **Test my
prediction.** In the next agent turn, the agent
reads the learner's idea, tests a compromise and a counterexample, and explains
which parts of the prediction the evidence supports. Only then can it present
the two viable futures and recommend one for the learner's stated priority.
The learner therefore participates in the investigation rather than watching
one autonomous run finish.

The central proof is visible rather than hidden in the agent's reasoning.
Returning the probe requires a burn by second 42 with at least 3,400 m/s of
delta-v. Sending the discoveries requires a burn between seconds 44 and 50 at
2,000–2,400 m/s. Those safe regions never overlap. The learner also sees that
30 MB at 1.2 MB/s needs 25 seconds of contact time.

The learner makes the value judgment. Choosing one future adds a single
argument-free WebMCP tool that closes over the exact tested burn. In a third
exchange, the learner says **Carry out my choice.** The agent executes the
approved action and verifies the receipt.
The agent can execute that burn once, after which the planning and execution
tools disappear.
The final page shows either the escaped probe or both science packets arriving
on Earth after crossing 23 light-years. The outcome is derived from the exact
selected simulation; the page does not claim that the probe travelled home or
invent an elapsed-time comparison that the model does not calculate.

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

A fixed animation can show relativity, but it cannot respond to a learner's
work. WORLDLINE makes the learner calculate the signal time and predict the cause, then gives the browser
agent structured access to that answer so it can choose tests that challenge
it. Every tested route appears on the scene as it is found, with its
calculation and the lesson it contributed. The person can compare consequences
rather than decode raw telemetry, then see the chosen burn, antenna state,
packets, contact window and signal journey play out from the same shared state.

People without a compatible browser agent see a clear WebMCP requirement and
setup direction. The page does not replace the agent's investigation with a
scripted sequence or claim that an agent has started when none has.

## What people and agents can do together

The agent performs the evidence-heavy work: comparing three sources,
distinguishing unique data from a replicated archive, proposing and testing
extremes, challenging the learner's
prediction with a compromise and counterexample, and defending one
recommendation within a hard simulation budget. The person contributes three times:
first by calculating the signal time, then by predicting the physical cause,
and finally by making the value judgment that
physics cannot settle.

The result is a shared decision rather than a chat answer. The tested
worldlines, human choice, temporary capability, execution animation and final
receipt all live on the page.

## How WebMCP is implemented

The document initially registers six closed-schema tools with
`document.modelContext.registerTool()`:

1. `read_mission_state`
2. `inspect_science_packets`
3. `inspect_maneuver_window`
4. `simulate_worldline`
5. `present_learning_checkpoint`
6. `present_worldline_choices`

The domain model uses revisions to reject stale changes and limits the whole
investigation to five simulation calls. `simulate_worldline` requires a
hypothesis, expected outcome and test role. The first act accepts only
`extreme` tests. `present_learning_checkpoint` succeeds only after both viable
extremes exist, then pauses simulation until the learner completes the
calculation and prediction on the page.
The second act accepts `compromise` and `counterexample` tests.
`present_worldline_choices` succeeds only after both roles have been tested,
including a total-loss result. It also requires an explicit assessment of the
learner's prediction, a teaching explanation and a recommendation tied to the
person's priority.

The learner's selection registers `execute_authorized_burn`, changing the live
inventory from six tools to seven. That tool accepts `{}` and closes over the
selected simulation, so its timing, velocity, packets and consequence cannot
be replaced during execution. It works once. Afterward, only
`read_final_state` and `verify_transmission_receipt` remain, producing the
6 → 7 → 2 lifecycle visible in the browser.

The native agent path and visible page use the same revisioned TypeScript state
machine. The priority chosen on the page is part of that state: the agent
can read it but cannot replace it when submitting its recommendation. Tool
registration lifetimes are controlled with abort signals, and all input
schemas reject additional properties.

WORLDLINE was created by the team behind
[Open for Agents](https://www.openforagents.com/), which helps websites decide
what AI agents may see and do. This experiment explores the same principle in
an educational setting: the agent investigates, the learner decides, and the
page controls the resulting action.

## Testing instructions

1. Open https://openforagents-webmcp-challenge.vercel.app/ in ChatGPT's in-app
   browser or Chrome with WebMCP enabled.
2. Confirm the page reports **WebMCP ready · 6 tools**.
3. Open the browser agent and say **Begin WORLDLINE.**
4. Watch the agent test the two extremes and stop at **Can both discoveries
   finish transmitting?** Calculate the signal time, then choose why one burn
   cannot save both.
5. Return to the same agent and say **Test my prediction.** Watch it test a
   compromise and counterexample, assess the prediction, teach the result,
   recommend one viable future and stop.
6. Choose either future on the page. Confirm the inventory changes to seven and
   includes `execute_authorized_burn`.
7. Return to the same agent and say **Carry out my choice.** Confirm the
   agent executes the one-use burn, verifies the receipt, the inventory becomes
   two read-only tools and the cinematic outcome completes.
No credentials are required.

## Links

- Live experience: https://openforagents-webmcp-challenge.vercel.app/
- Public source: https://github.com/mdotk/openforagents-webmcp-challenge
- Licence: GPL-2.0-or-later
