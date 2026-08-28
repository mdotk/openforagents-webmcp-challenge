# Rack Rescue demo video

This is a recording plan only. No video has been recorded or published.

Target runtime: 2 minutes 20 seconds. The finished video must stay below three
minutes and show the deployed page, a real compatible browser agent and the
actual WebMCP calls. Do not reconstruct the agent's response, stage a fake tool
list or substitute the visible fallback controls for agent execution.

## 0:00–0:09 — Show the payoff first

Open on the chaotic counter, snap to the organized thirteen-dish rack, reveal
the forgotten tray and end the opening montage on fourteen dishes with zero
conflicts. Keep the pinned red mug visible in the same place throughout.

On-screen words:

> One rack · fourteen dishes · one thing the agent cannot move

Narration:

> I pinned one mug. My browser agent fitted everything else, then rebuilt the
> plan when I found the tray we had forgotten.

## 0:09–0:27 — Make the problem instantly legible

Restart the experience. Show the dishes beside the empty rack and select
**Pin my red mug**.

Narration:

> Rack Rescue is a shared dishwasher puzzle. The page knows the exact dish
> shapes, safe zones and blocked spray area. I provide the priority that is
> mine: this mug stays here. The agent cannot move it.

## 0:27–0:54 — Let the agent investigate and plan

Give the external browser agent one instruction to fit the visible load. Show
its real calls to read the rack and inspect any dishes it needs. Keep the rack
and the agent activity visible together.

Narration:

> WebMCP gives the agent typed access to the same live rack I can see. There is
> no solve button. The model has to combine footprints, rotations, zones,
> human locks and the current revision into a complete arrangement.

## 0:54–1:14 — Show useful failure

Show the first invalid preview if the real agent produces one. Hold on the
specific conflict and its affected cells while the committed rack remains
unchanged. Then show the agent submit a corrected preview.

If the real agent's first preview is valid, do not manufacture a failure.
Instead, briefly use the clearly labelled visible prototype control after the
agent journey to demonstrate that an invalid spray-arm plan is rejected. Keep
that supplementary demonstration separate from the agent's result.

Narration:

> Preview is not movement. The website checks the proposal and returns exact
> conflicts. The agent can revise its reasoning, but only the website decides
> whether the arrangement is allowed.

## 1:14–1:31 — Apply the first valid load

Show the zero-conflict preview and the agent's real `apply_load_plan` call.
Let the dishes animate into the rack. Hold on thirteen dishes, zero conflicts
and the mug's lock.

Narration:

> Only the exact current preview can be applied. Thirteen dishes fit, nothing
> blocks the spray arm and my mug is still exactly where I left it.

## 1:31–1:55 — Let the human change reality

Select **Add forgotten tray**. Show the tray appear, the revision advance and
the earlier authority disappear. Ask the agent to adapt rather than start from
a prepared answer.

Narration:

> Then I change the problem. The forgotten roasting tray appears. The old plan
> is stale, so the agent reads the rack again and reorganizes only the dishes it
> is allowed to move.

## 1:55–2:10 — Show the adapted result

Show the second preview and real apply call. End on all fourteen dishes, zero
conflicts, the roasting tray in its reserved space and the red mug unmoved.

Narration:

> The tray fits. Fourteen dishes, zero conflicts, and the human decision has
> survived both plans.

## 2:10–2:20 — Explain why WebMCP matters

End on a split view of the visible rack and the five-tool inventory, followed
by the live URL and public repository.

Narration:

> This is why the agent needs the website, not just a screenshot or a chat. The
> model reasons over the live problem. The page supplies current facts,
> validates every move and keeps the person in control.

## Recording acceptance

- Record one truthful chronological journey against the deployed route.
- The external agent must construct and preview the arrangements through
  WebMCP. Do not use the source's prepared fallback plans as agent input.
- Show the five native tools at readable size at least once.
- Keep the red mug's human lock and the zero-conflict result visible.
- Do not claim the first preview failed unless the recorded agent actually
  produced that failure.
- Do not call local, fictional state a real appliance integration.
- Keep unrelated tabs, profiles, credentials and model settings outside the
  frame.
- Verify every caption and narration claim against the final deployed build
  before publication.

## Prepared video metadata

Title:

> Rack Rescue | A browser agent solves the dishwasher you changed

Description:

> Rack Rescue is a browser-local WebMCP experience created for the WebMCP
> Challenge. A person pins one dish, a browser agent fits the load from live
> structured rack state, and the website validates every proposed move. When a
> forgotten roasting tray changes the problem, the agent must replan without
> moving the person's mug.
>
> The experience is deterministic and fictional. It does not control a real
> appliance, access household data or make a purchase.
>
> Live candidate: https://openforagents-webmcp-challenge.vercel.app/?experience=rack-rescue
>
> Source: https://github.com/mdotk/openforagents-webmcp-challenge
