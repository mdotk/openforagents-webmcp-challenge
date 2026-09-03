# WORLDLINE qualification

Updated 4 September 2026.

## Current experience

WORLDLINE now uses a three-part investigation with three genuine learner-agent exchanges:

1. The agent reads the evidence, tests one probe-return extreme and one
   science-transmission extreme, opens the learning checkpoint and stops.
2. The learner calculates the signal time and predicts why one burn cannot save
   both. The agent reads both answers from shared page state, tests a compromise
   and counterexample, assesses the prediction, teaches the result and stops at
   the value choice.
3. The learner chooses the future. The agent uses the resulting one-use burn
   and verifies the final receipt.

The state machine prevents the agent from collapsing those exchanges. It will
not accept compromise tests before the learner calculation and prediction,
final choices before both second-act test roles, or execution before the
learner selects one of the exact tested futures.

## Automated acceptance

The current local candidate passes:

- lint;
- TypeScript;
- the production build; and
- 103 tests across 17 files.

The tests cover the five-attempt simulation budget, two mutually exclusive
viable outcomes, the mandatory learning checkpoint, learner calculation with
corrective feedback, four learner predictions,
the post-prediction compromise and counterexample, prediction assessment,
recommendation integrity, one-use execution, replay rejection and the
6 → 7 → 2 WebMCP tool lifecycle.

Page tests cover the three short handoffs without copied prompts, correct and
incorrect calculation feedback, learner teaching before the value choice,
agent-only execution, tool removal and the final verification surface. Existing
shopping, fitting-room, rack-rescue and launch-window tests remain part of the
same passing suite.

## Native browser-agent acceptance

The exact local candidate was loaded in an attached Chrome profile and run
through the WebMCP Model Context Tool Inspector as a browser agent. The
observed journey used the exact short instructions **Begin WORLDLINE.**, **Test
my prediction.** and **Carry out my choice.**, and completed all three
exchanges:

1. Chrome exposed exactly six planning tools. The agent inspected the evidence,
   tested the probe-return and science-transmission extremes, opened the
   learning checkpoint and stopped.
2. The learner correctly calculated **25 seconds**, then selected **All three
   conflict** on the page. In a second prompt, the same agent read both shared
   answers, tested one compromise and one
   counterexample, assessed the prediction as correct, explained the physical
   conflict, recommended the science route for the selected priority and
   stopped.
3. The learner chose the science route. Chrome immediately exposed seven tools,
   including the argument-free `execute_authorized_burn`. The agent executed it
   once, verified the receipt and left exactly `read_final_state` and
   `verify_transmission_receipt` registered.

The final page reported that both discoveries reached Earth, that this run's
30 MB transmission completed at probe time t+69 seconds, two seconds before
contact ended, that the signal crossed 23 light-years and that the probe did
not return. This was one successful run of the exact local candidate in the
observed Chrome profile; it is not a claim about every agent or browser.

## Responsive inspection

The same candidate's calculation, prediction and completed receipt were
inspected at the normal desktop viewport, and the completed receipt was
inspected at 390 px. They remained in document flow without clipping or
overlapping the story, controls, status or footer. The 320 px recheck remains
pending because the host screen locked while the responsive inspector was
being changed. No browser console warnings or errors were observed during the
completed run.

The complete native-agent journey must be repeated against the deployed build
before the final entry claims the public URL is ready. The local run does not
prove deployment identity.

## Historical evidence

Earlier 6 → 7 → 2 and 5 → 6 → 2 runs qualified previous WORLDLINE contracts.
They remain historical evidence only and are not presented as proof of the
current three-part investigation.

## Scope

WORLDLINE is a deterministic, scientifically informed educational simulation.
There is no real spacecraft, burn, account or external mission behind it. A
pass in one supporting browser establishes only the behavior observed in that
browser and version; it does not establish compatibility with every browser,
agent or future WebMCP implementation.

No Devpost terms were accepted, no video was published and no final challenge
submission was made as part of this change.
