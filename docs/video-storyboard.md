# WORLDLINE demo video

This is a recording plan only. No video has been published.

Target runtime: 2 minutes 15 seconds. The finished public YouTube video must be
under three minutes and include audio.

## Recording rules

- Show the project working in the first ten seconds.
- Record the deployed page with a real WebMCP-enabled browser agent.
- Keep the page and agent visible together during the investigation.
- Show one continuous 5 → 6 → 2 native tool lifecycle.
- Do not type the long mission live; paste it or begin immediately after Send.
- Cut waiting, setup, account details and unrelated browser chrome.
- Do not call the simulation scientifically exact or imply that it controls a
  real mission.

## 0:00–0:10 — The impossible choice

Open on a failed prediction changing from **Expected: probe returns** to
**Found: nothing returns**, while the page draws that worldline. Cut
immediately to the agent's recommendation and the two choice cards.

On-screen text: **The evidence changed its mind. You choose the loss.**

Narration:

> A probe beside a black hole can save itself or send home a discovery—but not
> both. My browser agent has ten seconds to show me why.

## 0:10–0:35 — Show the agent reasoning

Jump back to the five-tool opening. Paste the prepared mission and press Send.
Show the native calls to the mission, packet and maneuver tools, then the three
simulation calls. Keep the animated paths visible.

Narration:

> WORLDLINE gives the agent an objective and my priority—not a route. WebMCP
> exposes separate evidence and a five-test simulator. Before every test the
> agent predicts what will happen. Here its compromise fails, so the evidence
> changes the next hypothesis and the recommendation shown on the page.

## 0:35–0:55 — Stop at the human decision

Hold the recommendation and both choice cards on screen. Show that the
recommendation answers the priority selected at the start, five tools remain
and the agent has stopped.

Narration:

> It recommends sending the discovery because I said irreplaceable evidence
> matters most. But it cannot accept that loss for me. Do I bring the
> spacecraft home, or preserve the observation no one else has?

## 0:55–1:15 — Create one exact capability

Choose **Send the science**. Show the inventory change from five tools to six
and identify `execute_authorized_burn`.

On-screen text: **5 investigation tools → 6 after my choice**

Narration:

> My choice creates one temporary WebMCP tool. It has no arguments and is bound
> to the exact route the agent already tested, so the burn cannot be changed at
> execution time.

## 1:15–1:43 — The cinematic payoff

Ask the agent to execute the authorized burn. Show the burn flash, two packet
signals leaving, the probe fading and Earth's clock advancing to 23 years.
Finish on **23 years later, Earth sees what it saw.**

Narration:

> The approved burn runs once. Thirty megabytes leave the probe. Nine minutes
> pass there; 23 years pass on Earth. The spacecraft is gone. The discovery is
> not.

## 1:43–2:02 — Prove the WebMCP lifecycle

Show that only `read_final_state` and `verify_transmission_receipt` remain, then
invoke or display the verified receipt.

On-screen text: **5 → 6 → 2 tools · one shared state**

Narration:

> Execution removes every planning and action tool. Only two read-only
> verification tools remain. The page, the agent and the final receipt all use
> the same revisioned mission state.

## 2:02–2:15 — Close

Return to the opening and briefly show **Run guided mission**.

Narration:

> Without WebMCP, it is a guided science story. With WebMCP, the agent can
> investigate possible futures with you. WORLDLINE is live, open source and
> built for the WebMCP Challenge.

## Prepared YouTube metadata

Title:

> WORLDLINE — The evidence changes an AI agent's mind. You decide.

Description:

> WORLDLINE is an interactive WebMCP science story. A browser agent receives an
> open objective and a learner's priority, forms competing hypotheses, predicts
> and tests possible worldlines for a probe beside a black hole, then visibly
> revises its plan when evidence disagrees. It recommends one viable future;
> the learner chooses whether the probe or its unique discovery comes home.
> That choice creates one exact, one-use WebMCP tool; after execution, only
> verification remains.
>
> This is a deterministic educational simulation, not a precision model or a
> real spacecraft interface.
>
> Live: https://openforagents-webmcp-challenge.vercel.app/
>
> Source: https://github.com/mdotk/openforagents-webmcp-challenge
