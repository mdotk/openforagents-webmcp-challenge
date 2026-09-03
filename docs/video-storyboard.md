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

## 0:00–0:10: The impossible choice

Open on the large investigation chapter asking **Can one middle burn save the
probe and send the files?** The result changes to **No** and the page explains that trying to split
the difference loses the probe and both files. Cut immediately to the recommendation
and the two choice cards headed **What do you save?**

On-screen text: **You calculate. You predict. The agent tests it.**

Narration:

> WORLDLINE is an interactive science lesson about a probe beside a black hole.
> A worldline is the path an object takes through space and time. Instead of watching
> a fixed animation, I work with a browser agent to investigate which futures
> are physically possible.

## 0:10–0:42: Investigate, predict, investigate again

Jump back to the six-tool opening. The page has one instruction: say **Begin
WORLDLINE.** Show the agent test
one burn that lets the probe escape and one that sends the two files. When it stops, solve
the two compressed files, **18 MB + 12 MB, divided by 1.2 MB/s**, by choosing
**25 seconds**. Then choose
**The requirements may conflict** at **What might stop one burn from doing
both?** Say **Test my prediction**
to the same agent. Show it read your prediction, test a middle option and
a different option that challenges the prediction, then explain the result.

Narration:

> WORLDLINE gives the agent a learning goal, not the burn values or a prepared
> route. WebMCP exposes separate mission facts and a five-test simulator. It finds the two clear outcomes,
> then I work out that the antenna must stay pointed at Earth for 25 seconds. WebMCP
> turns my calculation and prediction into shared state. The agent must challenge
> my prediction with a middle option and a second test before it can teach the result.

Hold briefly on the visible proof: helping the probe escape requires a burn by
second 42 and a speed change of at least 3,400 m/s. Sending the files requires
a burn from second 44 to 50 and a speed change of 2,000 to 2,400 m/s. The
requirements do not overlap.

## 0:42–1:02: Stop at the human decision

Hold the recommendation and both choice cards on screen. Show that the agent
recommends sending the files because Earth has no copies, clearly states that
the probe will not escape, and stops with six tools still available.

Narration:

> It recommends sending the gravity map and light spectrum because Earth has no
> other copy. It also tells me the cost: the probe cannot escape. The agent
> cannot accept that loss for me. Do I save the probe, or send the only copies
> to Earth?

## 1:02–1:20: Your choice unlocks one exact burn

Choose **Send both files, lose the probe**. Show the inventory change from six tools to seven
and identify `execute_authorized_burn`.

On-screen text: **6 investigation tools → 7 after my choice**

Narration:

> My choice creates one temporary WebMCP tool. It has no arguments and is bound
> to the exact route the agent already tested, so the burn cannot be changed at
> execution time.

## 1:20–1:48: The cinematic payoff

Say **Carry out my choice.** Show the burn flash, the antenna
pointing at Earth, the gravity map and light spectrum sending separately, the
radio link closing, the probe falling silent and the signal crossing 23
light-years. Finish on **Both files reached Earth.**

Narration:

> The approved burn runs once. The two compressed files, thirty megabytes in
> total, finish sending before the
> radio link closes. The probe is 23 light-years away, so the signal takes 23 years to
> reach Earth. The probe cannot escape, but Earth receives both files it
> recorded near the black hole.

## 1:48–2:07: Prove the WebMCP lifecycle

Show that only `read_final_state` and `verify_transmission_receipt` remain, then
invoke or display the verified receipt.

On-screen text: **6 → 7 → 2 tools · one shared state**

Narration:

> Execution removes every planning and action tool. Only two read-only
> verification tools remain. The page, the agent and the final receipt all use
> the same revisioned mission state.

## 2:07–2:20: Close

Return to the opening and briefly show the clear WebMCP-ready state. Finish on
a simple two-second closing frame:

```
WORLDLINE
An Open for Agents experiment
openforagents.com
```

Narration:

> WORLDLINE turns black holes, light-years and spacecraft constraints into a
> science story you can investigate instead of merely watching. It is an Open for Agents
> experiment in making browser agents useful without taking the human decision
> away.

## Prepared YouTube metadata

Title:

> WORLDLINE: Investigate a black hole mission with a browser agent

Description:

> WORLDLINE is an interactive science lesson where you and a browser agent
> explore black holes, light-years and possible futures. The agent tests two
> clear outcomes for a stranded probe, then pauses while you calculate how long
> its files take to send and predict what might stop one burn from doing both. In a second
> investigation, it tests a middle option and challenges your prediction.
> It explains the results and recommends sending the files because Earth has no
> copies; you choose whether
> the probe escapes or Earth receives the gravity map and light spectrum.
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
