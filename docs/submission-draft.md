# WORLDLINE submission draft

This is a working copy for the Devpost form. It has not been submitted.

## Project title

WORLDLINE

## One-line description

WORLDLINE is an interactive science lesson where you and a browser agent
explore black holes, light-years and paths through space and time by testing whether a
stranded probe can both escape and send its two files to Earth. If it cannot,
you choose what to save.

## Description

Space is difficult to understand because its distances, timescales and physical
limits are far outside ordinary experience. WORLDLINE turns those ideas into an
interactive mission. A probe has flown close enough to a black hole to measure
how it bends space and changes light. Those measurements are stored in two files,
and Earth has no copies.
The lesson asks whether one burn can both let the probe escape and send those
two files. A browser agent investigates the different paths the probe could take
through space and time. These paths are called worldlines. It explains the science behind each outcome
and tests whether both goals can be met. If they cannot, it explains the
consequences before you decide what to save.

The probe is 23 light-years from Earth, and its last radio link closes in 71
seconds. An early, powerful burn can let it escape. A later, gentler burn can
keep its antenna pointed at Earth long enough to send the gravity map and light
spectrum. The permitted burn times and speed changes do not overlap. In this
fictional mission, those two files exist only on the probe, so Earth will not
receive them unless they are sent before the radio link closes.

The experience is a three-part investigation. First, the browser agent reads separate
file, engine, antenna and radio-link information, then tests the two clear options:
an early escape burn and a later transmission burn. It cannot continue to the
recommendation. The page stops without revealing the sending-time answer and
asks you to add the two file sizes and divide by the radio speed. After you
choose a result, it explains that 30 MB at 1.2 MB/s takes 25 seconds. You then predict what might prevent one burn from
both saving the probe and sending the files.

That calculation and prediction become shared page state. You say **Test my
prediction.** In the next agent turn, the agent
reads your prediction, tests a middle option and a different option that
challenges the prediction, and explains
which parts of the prediction the evidence supports. Only then can it present
the two possible outcomes and recommend one for the starting preference you chose.
You therefore participate in the investigation rather than watching
one autonomous run finish.

The central proof is visible rather than hidden in the agent's reasoning.
Helping the probe escape requires a burn by second 42 that changes its speed by
at least 3,400 m/s. Sending the files requires a burn between seconds 44 and 50
that changes its speed by 2,000 to 2,400 m/s. The two requirements happen at
different times and need different changes in speed. You also see that
30 MB at 1.2 MB/s takes 25 seconds to send.

You make the value judgment. Choosing one future adds a single
argument-free WebMCP tool that closes over the exact tested burn. In a third
exchange, you say **Carry out my choice.** The agent executes the
approved action and verifies the receipt.
The agent can execute that burn once, after which the planning and execution
tools disappear.
The final page shows either the escaped probe or both files arriving
on Earth after crossing 23 light-years. The outcome is derived from the exact
selected simulation; the page does not claim that the probe travelled home or
invent an elapsed-time comparison that the model does not calculate.

This is a science learning experience, not a real spacecraft controller or a
precision model of a black-hole mission.

## What people learn

WORLDLINE makes difficult ideas easier to see and understand. A light-year
measures distance, not time. A light-speed signal from 23 light-years away
takes 23 years to reach Earth. The amount of data and the radio speed determine
how long the antenna must stay connected. Changing when and how strongly the
probe burns creates different possible futures. The mission also shows that
physical requirements can conflict: science can establish the consequences,
but it cannot decide which loss a person should accept.

## Why WebMCP is a strong fit

The useful part of this experience is not an agent clicking the same buttons a
person would click. WebMCP gives the agent structured access to mission facts,
simulation and shared state that would otherwise be scattered
across a visual interface. The agent can investigate several possible futures
and update the page as it learns without screen-scraping or inventing hidden
state.

Before the investigation starts, you choose which outcome the agent
should recommend if both goals prove impossible. That starting preference does
not authorize a burn and does not make the final choice.

WebMCP also makes the human boundary part of the product. The agent may gather
evidence, calculate, simulate and explain. It cannot decide which loss the
person accepts. Only a choice on the page creates the exact one-use execution
capability.

## How it creates a better experience

Most people encounter space science through text, videos or fixed simulations.
WORLDLINE lets them participate. They calculate how long the two files take to send,
predict what might stop one burn from achieving both goals, watch an AI agent test
different maneuvers, and see the resulting worldlines unfold. WebMCP connects
the agent directly to the lesson's simulation, so the explanation develops from
the evidence and the person's choices rather than following one predetermined
presentation.

A fixed animation can show an outcome, but it cannot respond to a person's
work. WORLDLINE asks you to calculate the sending time and predict the cause, then gives the browser
agent structured access to that prediction so it can choose tests that challenge
it. Every tested route appears on the scene as it is found, with its
result and explanation. The person’s sending-time calculation appears at the
checkpoint between the two rounds of investigation. The person can compare consequences
rather than decode raw measurements, then see the chosen burn, antenna state,
files, radio link and signal journey play out from the same shared state.

People without a compatible browser agent see a clear WebMCP requirement and
setup direction. The page does not replace the agent's investigation with a
scripted sequence or claim that an agent has started when none has.

## What people and agents can do together

The agent performs the information-heavy work: comparing three sources,
distinguishing the two files Earth lacks from a navigation record it already
has, proposing and testing clear options, challenging your prediction
with a middle option and a second test, and explaining one
recommendation within a five-test limit. The person takes part four times: by
setting the agent’s recommendation preference, calculating the sending time,
predicting the physical cause, and making the final value judgment that physics
cannot settle.

The result is a shared decision rather than a chat response. The tested
worldlines, human choice, one-time burn tool, execution animation and final
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
predicted result and test role. The first act accepts only `extreme` tests. In
the code, this means the two clearly different outcomes.
`present_learning_checkpoint` succeeds only after both outcomes exist, then
pauses simulation until the person completes the
calculation and prediction on the page.
The second act accepts `compromise` and `counterexample` tests. These code values
mean a middle option and a different option designed to challenge the person's prediction.
`present_worldline_choices` succeeds only after both roles have been tested,
including a total-loss result. It also requires an explicit assessment of the
person's prediction, a teaching explanation and a recommendation tied to the
person's starting preference.

The person's selection registers `execute_authorized_burn`, changing the live
inventory from six tools to seven. That tool accepts `{}` and closes over the
selected simulation, so its timing, speed change, files and consequence cannot
be replaced during execution. It works once. Afterward, only
`read_final_state` and `verify_transmission_receipt` remain, producing the
6 → 7 → 2 lifecycle visible in the browser.

The native agent path and visible page use the same revisioned TypeScript state
machine. The starting preference chosen on the page is part of that state. The
agent can read it but cannot replace it when submitting its recommendation. It
guides the recommendation only; the person still makes the final choice. Tool
registration lifetimes are controlled with abort signals, and all input
schemas reject additional properties.

WORLDLINE was created by the team behind
[Open for Agents](https://www.openforagents.com/), which helps websites decide
what AI agents may see and do. This experiment explores the same principle in
a science lesson: the agent investigates, the person decides, and the page
controls the resulting action.

## Testing instructions

1. Open https://openforagents-webmcp-challenge.vercel.app/ in ChatGPT's in-app
   browser or Chrome with WebMCP enabled.
2. Confirm the page reports **WebMCP ready · 6 tools**.
3. Choose which outcome you want the agent to recommend if one burn cannot do
   both. This is not the final choice.
4. Open the browser agent and say **Begin WORLDLINE.**
5. Watch the agent test the two starting possibilities and stop at **How long
   do both files take to send?** Calculate the sending time, then predict what
   might prevent one burn from saving the probe and sending the files.
6. Return to the same agent and say **Test my prediction.** Watch it test a
   middle option and a different option that challenges your prediction, explain the
   result, recommend one possible outcome and stop.
7. Choose either future on the page. Confirm the inventory changes to seven and
   includes `execute_authorized_burn`.
8. Return to the same agent and say **Carry out my choice.** Confirm the
   agent executes the one-use burn, verifies the receipt, the inventory becomes
   two read-only tools and the cinematic outcome completes.
No credentials are required.

## Links

- Live experience: https://openforagents-webmcp-challenge.vercel.app/
- Public source: https://github.com/mdotk/openforagents-webmcp-challenge
- Licence: GPL-2.0-or-later
