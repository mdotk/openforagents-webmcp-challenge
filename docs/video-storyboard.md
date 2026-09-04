# WORLDLINE video storyboard

This plan reflects the current deployed WORLDLINE journey. It is designed for
one real run in a WebMCP-enabled browser, edited to about 2 minutes 22 seconds.
The finished video must remain under three minutes.

## The story in one sentence

WORLDLINE is an interactive science lesson in which a browser agent tests
possible futures for a probe near a black hole, a learner works out the key
calculation, and the learner decides whether to save the probe or send two
files that Earth does not have.

## What the film must prove

The viewer should understand five things without reading the submission page:

1. The probe has one engine burn and 71 seconds of radio contact left.
2. The agent receives evidence and a test budget, not a scripted answer.
3. The learner calculates the sending time and makes a prediction that changes
   what the agent investigates next.
4. The agent explains the physical conflict, but the learner chooses which
   loss to accept.
5. WebMCP changes the available tools from six investigation tools, to seven
   after the learner chooses, to two read-only verification tools after the
   burn runs.

## Recording format

- Record at 1920 by 1080, 30 frames per second.
- Keep the WORLDLINE page large enough to read. During tool calls, use roughly
  70 percent of the frame for the page and 30 percent for the browser agent.
- Use the full page width for the calculation, decision and final animation.
- Record one truthful mission from a fresh page load. Edits may remove waiting,
  but must not rearrange events or combine different outcomes.
- Keep the page's own pacing. Open each test with the visible controls and hold
  each result long enough to understand it before cutting.
- Do not show browser profile names, bookmarks, email addresses, API keys,
  notifications, unrelated tabs, local paths or developer tools.
- Crop unrelated browser and extension branding. Keep the tool name, arguments
  and result visible when showing a WebMCP call.
- Use no copyrighted music. A quiet original ambience is optional, but the
  narration must remain clear.
- Put subtitles in a dedicated dark strip at the bottom of the frame so they do
  not cover WORLDLINE controls or calculations. Use white sentence-case text,
  no more than two lines at once.

## Competition requirements checked

The [official rules](https://webmcp.devpost.com/rules) require a public YouTube
video shorter than three minutes. It must show the project working, and its
audio must explain what was built and how WebMCP is used. The video must not
use third-party trademarks, music or other copyrighted material without
permission.

The organizers' [video guidance](https://webmcp.devpost.com/updates/46161-2-days-left-and-what-judges-actually-look-for)
expressly permits AI narration. A separate organizer update also says that the
narration may use the entrant's voice or an AI text-to-speech voice. The final
film may therefore be recorded, edited, narrated and subtitled with AI
assistance, provided that it truthfully shows the functioning project and does
not overstate what ran.

## Complete shot list

### 0:00 to 0:06 | Open on the failed compromise

**Picture**

Start inside the second investigation round. Show the agent calling
`simulate_worldline`, then cut to Test 3 with the question **Can one middle
burn save the probe and send the files?** Hold on the result:
**The probe does not escape. Earth receives no complete files.** Let the red
failed path move once.

**Narration and subtitles**

> Trying to split the difference loses everything. The probe cannot escape,
> and Earth receives neither file.

**Small overlay**

> A real WebMCP simulation, not a fixed video

This is the opening proof that the project is already working. Do not begin
with a title card.

### 0:06 to 0:22 | Establish the mission

**Picture**

Jump to a fresh page. Show the probe, the 71-second radio limit, the two
compressed files and the instruction **Begin WORLDLINE.** Keep the six-tool
status visible.

**Narration and subtitles**

> WORLDLINE is a science lesson about a probe beside a black hole. It has fuel
> for one engine burn, 71 seconds of radio contact and two files that Earth does
> not have. Can one burn save the probe and send both files?

### 0:22 to 0:43 | First agent exchange

**Picture**

Show the short message **Begin WORLDLINE.** in the agent. Use quick cuts across
real WebMCP calls to:

- `read_mission_state`
- `inspect_science_packets`
- `inspect_maneuver_window`
- two calls to `simulate_worldline`
- `present_learning_checkpoint`

On the page, briefly show the black-hole working indicator and **Agent still
working. No action needed.** Then show **2 tests ready to review**. Choose
**Review Test 1**, hold on the gold escape path and explanation, choose **Show
next test**, then hold on the purple signal path and explanation.

**Narration and subtitles**

> I give the agent a goal, not burn values. WebMCP lets it read the mission and
> test possible futures. An early, powerful burn saves the probe but breaks the
> radio link. A later, gentler burn sends the files but cannot save the probe.

**Editing note**

Use the page's **Previous test** control once in the raw recording so the take
proves it works. It does not need to appear in the final cut unless the pacing
benefits from it.

### 0:43 to 0:56 | The learner calculates and predicts

**Picture**

Choose **Continue to my calculation**. Fill the frame with the calculation:

> 18 MB + 12 MB = 30 MB
>
> 30 MB divided by 1.2 MB/s = 25 seconds

Choose **25 seconds**. On the next screen choose **The requirements may
conflict**. End on **Now ask the agent to test your prediction.**

**Narration and subtitles**

> Now the lesson needs me. Thirty megabytes at 1.2 megabytes per second needs
> 25 seconds. I predict that the allowed burn times and speed changes conflict.
> The page saves both answers for the agent.

**Small overlay**

> The learner's answer becomes shared page state

### 0:56 to 1:20 | Second agent exchange

**Picture**

Show the short message **Test my prediction.** in the same agent. Show
`read_mission_state` returning the learner's calculation and prediction. Then
show two further `simulate_worldline` calls and
`present_worldline_choices`.

On the page, briefly show the working indicator, then **Review Test 3**. Hold
on the failed middle burn. Choose **Show next test** and show the different
burn that challenges the prediction. Choose **Continue to the results**.

**Narration and subtitles**

> The agent reads my answer from the page, tests a compromise, then tries to
> challenge my prediction. It finds no overlap. Escape needs an early speed
> change of at least 3,400 metres per second. Sending needs a later, gentler
> burn that keeps the antenna pointed at Earth.

**Small overlay**

> Four tests used, one still available

### 1:20 to 1:36 | The agent teaches, then the learner decides

**Picture**

Show **What do you save?**, the no-overlap diagram and the agent's
recommendation. Pause long enough to read the two outcome cards. Choose
**Send both files, lose the probe**.

**Narration and subtitles**

> The agent recommends sending the files because Earth has no copy of either
> one. It also states the cost: the probe cannot escape. The physics explains
> the outcomes, but I decide which loss to accept. I choose the files.

### 1:36 to 1:45 | The learner's choice creates one exact tool

**Picture**

Show the page change to **Your approved burn is ready** and the tool count
change from six to seven. In the tool list, highlight
`execute_authorized_burn`. Show that it accepts no arguments. End on the page
instruction **Carry out my choice.**

**Narration and subtitles**

> My choice creates one temporary WebMCP tool. It can run only the exact burn I
> selected, once.

**Small overlay**

> 6 investigation tools, then 7 after my choice

### 1:45 to 2:04 | Third agent exchange and cinematic result

**Picture**

Show **Carry out my choice.** in the agent, followed by the real
`execute_authorized_burn` call. Switch to the full-width page for the complete
animation:

1. Burn.
2. Antenna locked on Earth.
3. Gravity map sent.
4. Light spectrum sent.
5. Radio link closed.
6. Across 23 light-years.
7. Signal arriving.

Keep the changing probe time and Earth signal readings visible. Do not speed
up the 12-second sequence so much that its words cannot be read.

**Narration and subtitles**

> The burn runs once. The antenna stays pointed at Earth while both files leave
> the probe. A light-year measures distance, so their signal still takes 23
> years to cross 23 light-years and reach Earth.

### 2:04 to 2:17 | Verification and close

**Picture**

Hold on **Both files reached Earth** and the three-part learning recap. Show
the agent checking `read_final_state` and `verify_transmission_receipt`. End by
showing that only two read-only tools remain.

**Narration and subtitles**

> Earth receives both files. The probe does not escape. Planning and execution
> tools disappear, leaving two read-only checks. The agent, animation and final
> receipt all use the same mission state.

**Small overlay**

> 6 to 7 to 2 tools

### 2:17 to 2:22 | End frame

**Picture**

Use a simple five-second frame over the quiet star field:

```text
WORLDLINE
An interactive WebMCP science lesson

An Open for Agents experiment
openforagents.com
```

**Narration and subtitles**

> WORLDLINE turns space science into a mission that a learner and an agent can
> investigate together.

## Complete voiceover script

> Trying to split the difference loses everything. The probe cannot escape,
> and Earth receives neither file.
>
> WORLDLINE is a science lesson about a probe beside a black hole. It has fuel
> for one engine burn, 71 seconds of radio contact and two files that Earth does
> not have. Can one burn save the probe and send both files?
>
> I give the agent a goal, not burn values. WebMCP lets it read the mission and
> test possible futures. An early, powerful burn saves the probe but breaks the
> radio link. A later, gentler burn sends the files but cannot save the probe.
>
> Now the lesson needs me. Thirty megabytes at 1.2 megabytes per second needs
> 25 seconds. I predict that the allowed burn times and speed changes conflict.
> The page saves both answers for the agent.
>
> The agent reads my answer from the page, tests a compromise, then tries to
> challenge my prediction. It finds no overlap. Escape needs an early speed
> change of at least 3,400 metres per second. Sending needs a later, gentler
> burn that keeps the antenna pointed at Earth.
>
> The agent recommends sending the files because Earth has no copy of either
> one. It also states the cost: the probe cannot escape. The physics explains
> the outcomes, but I decide which loss to accept. I choose the files.
>
> My choice creates one temporary WebMCP tool. It can run only the exact burn I
> selected, once.
>
> The burn runs once. The antenna stays pointed at Earth while both files leave
> the probe. A light-year measures distance, so their signal still takes 23
> years to cross 23 light-years and reach Earth.
>
> Earth receives both files. The probe does not escape. Planning and execution
> tools disappear, leaving two read-only checks. The agent, animation and final
> receipt all use the same mission state.
>
> WORLDLINE turns space science into a mission that a learner and an agent can
> investigate together.

## Subtitle plan

Use the voiceover verbatim as the subtitle source. Split it at natural sentence
boundaries, not at fixed word counts. Each subtitle should remain visible for
at least 1.2 seconds and should not exceed two lines. Do not subtitle the small
overlays a second time.

The final recording task should produce:

- a clean master video without subtitles;
- a mastered video with burned-in English subtitles;
- an English `.srt` file;
- the voiceover audio as a separate file; and
- a thumbnail captured from the failed compromise or final signal-arrival
  scene.

## Final recording checklist

Before recording:

1. Open a fresh WORLDLINE run in a WebMCP-enabled browser.
2. Confirm **WebMCP ready · 6 tools**.
3. Confirm the agent panel exposes the six WORLDLINE tools.
4. Hide notifications, personal tabs, bookmarks and account details.
5. Close or crop anything containing secrets or local paths.

During recording:

1. Use **Begin WORLDLINE.** exactly.
2. Open Tests 1 and 2 yourself. Do not imply the agent controls the page's
   reading pace.
3. Choose **25 seconds** and **The requirements may conflict**.
4. Use **Test my prediction.** exactly.
5. Open Tests 3 and 4 yourself, then continue to the results.
6. Choose **Send both files, lose the probe**.
7. Use **Carry out my choice.** exactly.
8. Keep the complete final animation and verification result.

Before export:

1. Confirm the video is shorter than three minutes.
2. Confirm audio explains both the project and its WebMCP implementation.
3. Confirm the first ten seconds show the working product.
4. Confirm every tool call shown came from the recorded run.
5. Confirm there is no copyrighted music or unapproved third-party material.
6. Confirm all subtitles are readable and match the narration.
7. Confirm the final file contains no email addresses, keys, notifications,
   local paths or unrelated browser content.

## Suggested YouTube metadata

**Title**

> WORLDLINE: A WebMCP science lesson with a browser agent

**Description**

> WORLDLINE is an interactive science lesson about black holes, light-years,
> spacecraft communication and the possible futures created by one engine
> burn. A browser agent investigates two working extremes, a learner calculates
> the sending time and predicts what prevents one burn from achieving both
> goals, and the agent tests that prediction before the learner chooses what to
> save.
>
> WebMCP connects the agent to the mission's evidence, simulator, shared learner
> answers, temporary one-use action and final verification. The visible tool
> lifecycle changes from six investigation tools, to seven after the learner's
> decision, to two read-only checks after execution.
>
> This is a made-up educational model, not a real spacecraft interface or an
> exact black-hole simulation.
>
> WORLDLINE is an experiment from Open for Agents:
> https://www.openforagents.com/
>
> Live experience:
> https://openforagents-webmcp-challenge.vercel.app/
>
> Source code:
> https://github.com/mdotk/openforagents-webmcp-challenge
