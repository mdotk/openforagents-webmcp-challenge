# WORLDLINE demo video

This is a recording plan only. No video has been published.

Target runtime: 2 minutes 20 seconds. The finished public YouTube video must be
under three minutes and include audio.

## Recording rules

- Show the project working in the first ten seconds.
- Record the deployed page with a real WebMCP-enabled browser agent.
- Keep the page and agent visible together during the investigation.
- Show one continuous 6 → 7 → 2 native tool lifecycle.
- Start each agent exchange with the short visible instruction; do not show setup or typing.
- Cut waiting, setup, account details and unrelated browser chrome.
- Do not call the simulation scientifically exact or imply that it controls a
  real mission.

## 0:00–0:10 — The impossible choice

Open on the large investigation chapter asking **Can one compromise save
both?** The result changes to **No** and the page explains that the compromise
loses both the probe and the science. Cut immediately to the recommendation
and the two choice cards.

On-screen text: **You calculate. You predict. The agent tests it.**

Narration:

> WORLDLINE is an interactive science lesson about a probe beside a black hole.
> Each path it could take is a possible future—a worldline. Instead of watching
> a fixed animation, I work with a browser agent to investigate which futures
> are physically possible.

## 0:10–0:42 — Investigate, predict, investigate again

Jump back to the six-tool opening. Say **Begin WORLDLINE.** Show the agent test
the probe-return and science-transmission extremes. When it stops, solve
**18 MB + 12 MB, divided by 1.2 MB/s** by choosing **25 seconds**. Then choose
**All three conflict** at **Why can't one burn save both?** Say **Test my prediction**
to the same agent. Show it read the learner prediction, test a compromise and
counterexample, and assess the answer.

Narration:

> WORLDLINE gives the agent the learning goal and my priority—not the burn
> values or answer. WebMCP exposes separate evidence and a five-test simulator. It finds the extremes,
> then I work out that the antenna must stay on Earth for 25 seconds. WebMCP
> turns my calculation and prediction into shared state. The agent must challenge
> my idea with a compromise and counterexample before it can teach the result.

Hold briefly on the visible proof: returning the probe requires `t ≤ 42s` and
`Δv ≥ 3,400 m/s`; transmitting requires `44s ≤ t ≤ 50s` and
`2,000–2,400 m/s`. The regions do not overlap.

## 0:42–1:02 — Stop at the human decision

Hold the recommendation and both choice cards on screen. Show that the
recommendation answers the priority selected at the start, six tools remain
and the agent has stopped.

Narration:

> It recommends sending the discovery because I said irreplaceable evidence
> matters most. But it cannot accept that loss for me. Do I bring the
> spacecraft home, or preserve the observation no one else has?

## 1:02–1:20 — Create one exact capability

Choose **Send both discoveries — lose the probe**. Show the inventory change from six tools to seven
and identify `execute_authorized_burn`.

On-screen text: **6 investigation tools → 7 after my choice**

Narration:

> My choice creates one temporary WebMCP tool. It has no arguments and is bound
> to the exact route the agent already tested, so the burn cannot be changed at
> execution time.

## 1:20–1:48 — The cinematic payoff

Say **Carry out my choice.** Show the burn flash, the antenna
holding Earth, the gravity map and horizon spectrum leaving separately, the
contact window closing, the probe falling silent and the signal crossing 23
light-years. Finish on **Both discoveries reached Earth.**

Narration:

> The approved burn runs once. Thirty megabytes finish leaving before contact
> closes. The probe is 23 light-years away, so the signal takes 23 years to
> reach Earth. The spacecraft is gone. Both irreplaceable observations survive.

## 1:48–2:07 — Prove the WebMCP lifecycle

Show that only `read_final_state` and `verify_transmission_receipt` remain, then
invoke or display the verified receipt.

On-screen text: **6 → 7 → 2 tools · one shared state**

Narration:

> Execution removes every planning and action tool. Only two read-only
> verification tools remain. The page, the agent and the final receipt all use
> the same revisioned mission state.

## 2:07–2:20 — Close

Return to the opening and briefly show the clear WebMCP-ready state. Finish on
a simple two-second closing frame:

```
WORLDLINE
An Open for Agents experiment
openforagents.com
```

Narration:

> WORLDLINE turns black holes, light-years and spacecraft constraints into a
> science story you can investigate—not merely watch. It is an Open for Agents
> experiment in making browser agents useful without taking the human decision
> away.

## Prepared YouTube metadata

Title:

> WORLDLINE — Explore a black hole rescue with an AI agent

Description:

> WORLDLINE is an interactive science lesson where you and a browser agent
> explore black holes, light-years and possible futures. The agent tests the two
> extreme outcomes for a stranded probe, then pauses while you calculate how
> long its signal needs and predict why it cannot save everything. In a second
> investigation, it tests your answer with a compromise and a counterexample.
> It explains the results and recommends one possible future; you choose whether
> the probe or its unique discoveries come home.
> That choice creates one exact, one-use WebMCP tool; after execution, only
> verification remains.
>
> This is a made-up mission built to teach the ideas, not an exact black-hole
> model or a real spacecraft interface.
>
> WORLDLINE is an experiment from Open for Agents:
> https://www.openforagents.com/
>
> Live: https://openforagents-webmcp-challenge.vercel.app/
>
> Source: https://github.com/mdotk/openforagents-webmcp-challenge
