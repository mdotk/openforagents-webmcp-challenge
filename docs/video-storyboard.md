# WORLDLINE video storyboard

This storyboard matches the final chronological edit. The film runs for about
2 minutes 47 seconds and remains below the three-minute competition limit.

## The story in one sentence

WORLDLINE uses WebMCP to turn a fictional black-hole mission into a science
lesson that a learner and an AI agent investigate together.

## What the film must show

1. The probe has one engine burn and 71 seconds of radio contact left.
2. WebMCP gives the agent separate evidence and a simulator, not a prepared
   answer or fixed list of burn values.
3. The agent forms hypotheses, chooses tests and explains what each result
   teaches.
4. The learner calculates the sending time and contributes a prediction that
   changes the second investigation.
5. The agent tests both a compromise and a counterexample before making an
   evidence-based recommendation.
6. The learner makes the final value choice.
7. WebMCP changes the available tools from six investigation tools, to seven
   after the choice, to two read-only verification tools after execution.

## Recording and editing format

- 1920 by 1080 at 30 frames per second.
- One real, uninterrupted WebMCP mission is the source for every shot.
- The edit begins on the mission opening and remains chronological.
- The page fills the frame when the learner needs to read or decide.
- The page and browser-agent panel appear together when a WebMCP call matters.
- Subtitles sit in a dedicated dark strip below the interface.
- The narration is calm, conversational and specific.
- No browser tabs, bookmarks, profile details, email addresses, credentials,
  notifications, local paths or unrelated applications are shown.
- The soundtrack uses narration and quiet original interface effects only.

## Final shot list and narration

### 0:00 to 0:15 | Understand the mission

Show the untouched opening at full width: black hole, probe, 71-second radio
window, two compressed files and **Begin WORLDLINE**.

> This probe has just passed a black hole. It has one engine burn left,
> seventy-one seconds of radio contact, and two science files Earth has never
> received. Can it escape and still send both files?

### 0:15 to 0:29 | See what WebMCP gives the agent

Show **Begin WORLDLINE** in the browser agent. Show the first real WebMCP calls
and the page's stable working state. Keep enough of the tool names and results
visible to establish that the agent receives separate evidence.

> I give my browser agent one learning goal, not the answer. Through WebMCP it
> reads separate evidence about the science files, engine and antenna, then
> decides which burns are worth testing.

### 0:29 to 0:45 | Watch the AI form and test two ideas

Show Test 1 and Test 2 in order. Hold the gold escape path, then the purple
signal path. The viewer should see the attempted burn, result and lesson for
each.

> It forms two starting ideas and checks both in the simulator. An early,
> powerful burn saves the probe but turns its antenna away from Earth. A later,
> gentler burn sends both files, but leaves too little speed to escape.

### 0:45 to 0:58 | The learner does the maths

Show the calculation screen at full width. Select 25 seconds only after the
numbers have been visible long enough to read.

> Then the AI stops instead of solving the lesson for me. Using its evidence,
> I calculate that thirty megabytes at one point two megabytes per second needs
> twenty-five seconds of radio contact.

### 0:58 to 1:09 | The learner makes a testable prediction

Show the prediction question and the selected answer about conflicting
requirements. End on **Test my prediction**.

> My calculation becomes shared page state. I predict the escape and radio
> requirements conflict. That is a hypothesis the agent must now test.

### 1:09 to 1:20 | WebMCP carries the learner's work into the next turn

Show the agent reading the calculation and prediction from the page. Show the
two further simulation calls.

> Through WebMCP, the agent reads my work from the page. It chooses a middle
> burn, then a counterexample designed to prove my prediction wrong.

### 1:20 to 1:37 | The tests reveal the physical conflict

Show Test 3 and Test 4 in order. Keep the no-overlap explanation and the exact
time and speed ranges readable.

> Both fail. Escape must begin by second forty-two and add at least three
> thousand four hundred metres per second. Sending the files needs a later,
> gentler burn that keeps the antenna aimed at Earth. There is no overlap.

### 1:37 to 1:56 | The AI teaches and recommends, then stops

Show **What do you save?**, the no-overlap diagram, the recommendation and both
consequences. Hold before choosing.

> The tests support my prediction. The AI connects that evidence to a
> recommendation: send the files because Earth has no copies. It explains the
> cost, then stops. Science establishes the consequences. It does not choose
> which loss I should accept.

### 1:56 to 2:12 | The learner creates one exact action

Choose **Send both files, lose the probe**. Show the tool count change and the
argument-free `execute_authorized_burn` tool.

> I choose the files. WebMCP now exposes one temporary action, bound to the
> exact tested burn I approved. The agent cannot change the timing, the speed,
> or the files, and it can use that tool only once.

### 2:12 to 2:28 | Watch the scientific consequence unfold

Show **Carry out my choice**, the real execution call and the complete visual
sequence: burn, antenna lock, gravity map, light spectrum, closing radio link
and signal crossing 23 light-years.

> The burn begins. The antenna stays aimed at Earth while both files leave the
> probe. Contact closes two seconds later. The probe is lost, but the signal
> keeps travelling across twenty-three light-years.

### 2:28 to 2:47 | Verify the result and close the lesson

Show **Both files reached Earth**, the learning recap, the agent's two read-only
checks and the final two-tool inventory.

> Twenty-three years later, Earth receives both files. The agent verifies the
> result against the same mission state, then every action tool disappears.
> WORLDLINE makes the learner calculate, predict, test, decide, and see the
> physical consequences with an AI partner.

## Competition requirements

The [official rules](https://webmcp.devpost.com/rules) require a publicly
visible YouTube video shorter than three minutes. It must show the project
working and include audio that explains both the project and its use of WebMCP.
The final edit satisfies the duration and content requirements. It still needs
to be uploaded publicly to YouTube and added to the Devpost project.

The organizers' [video guidance](https://webmcp.devpost.com/updates/46161-2-days-left-and-what-judges-actually-look-for)
allows AI narration. The film truthfully shows one functioning browser-agent
run and does not claim that a real spacecraft or precision black-hole model is
involved.

## Suggested YouTube metadata

**Title**

> WORLDLINE: Learning space science with an AI agent and WebMCP

**Description**

> WORLDLINE is an interactive science lesson about a probe near a black hole.
> WebMCP gives a browser agent separate mission evidence, a limited simulator
> and the learner's own calculation and prediction. The agent chooses possible
> burns, tests competing hypotheses and explains what the results teach. The
> learner calculates, predicts and decides which physical consequence to
> accept.
>
> The live tool set changes from six investigation tools, to seven after the
> learner's decision, to two read-only checks after the approved burn runs.
>
> This is a fictional educational model, not a real spacecraft interface or an
> exact black-hole simulation.
>
> WORLDLINE is an Open for Agents experiment:
> https://www.openforagents.com/
>
> Live experience:
> https://openforagents-webmcp-challenge.vercel.app/
>
> Source code:
> https://github.com/mdotk/openforagents-webmcp-challenge

## Final submission checklist

1. Upload the final mastered video to YouTube as public.
2. Confirm YouTube reports a duration below three minutes and displays the
   subtitles correctly.
3. Create the Devpost project and add the live URL, public repository URL,
   YouTube URL, description, testing instructions and built-with list.
4. Add no credentials because the experience requires none.
5. Open every submitted URL in a signed-out browser before submitting.
