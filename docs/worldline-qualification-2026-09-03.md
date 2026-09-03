# WORLDLINE qualification

Updated 4 September 2026.

## Current experience

WORLDLINE now uses a three-part investigation with three genuine interactions between the person and agent:

1. The agent reads the mission facts, tests one burn that lets the probe escape
   and one that sends both files, opens the calculation screen and stops.
2. The person calculates the sending time and predicts what might stop one
   burn from doing both. The agent reads the calculation and prediction from
   shared page state, tests a middle option and a second option that challenges
   the prediction, explains the result and stops at
   the value choice.
3. The person chooses the future. The agent uses the resulting one-use burn
   and verifies the final receipt.

The state machine prevents the agent from collapsing those exchanges. It will
not accept second-stage tests before the person's calculation and prediction,
final choices before both second-act test roles, or execution before the
person selects one of the tested outcomes.

## Automated acceptance

The current candidate passes:

- lint;
- TypeScript;
- the production build; and
- 116 tests across 18 files.

The tests cover the five-attempt simulation budget, two mutually exclusive
possible outcomes, the mandatory calculation screen, the person's calculation with
corrective feedback, four predictions,
the post-prediction middle test and different challenge test, prediction assessment,
recommendation integrity, one-use execution, replay rejection and the
6 → 7 → 2 WebMCP tool lifecycle.

The investigation no longer advances through results on a timer. The first
completed test appears automatically, then the page waits for the person to
choose **Show next test**. Separate controls continue to the calculation and
final results. Automated page tests confirm that later results and checkpoints
remain hidden until those controls are used.

The previously unlabelled route curves now identify the active result as an
escape path, a signal path or a failed path. The active line has an arrow and a
moving marker while earlier results fade. During investigation, the two top
readings update to the viewed test's burn time and remaining radio-link time.
During execution, they show probe time and the signal's progress to Earth.

The opening no longer asks the person to set a recommendation before seeing the
evidence. The state machine requires the agent to recommend sending the two
files because Earth has no copies, while leaving the final choice to the person.

Page tests cover the three short handoffs without copied prompts, correct and
incorrect calculation feedback, teaching before the value choice,
agent-only execution, tool removal and the final verification surface. Existing
shopping, fitting-room, rack-rescue and launch-window tests remain part of the
same passing suite.

A site-wide copy contract checks the opening, evidence-based recommendation,
calculation, prediction, both possible outcomes, both endings, metadata,
WebMCP explanations and submission materials together. It requires the final
choice to remain conditional until testing rules out achieving both goals. It
also prevents the copy from saying that escaping the black hole means
travelling back to Earth or using earlier vague and contradictory phrases.

## Native browser-agent acceptance

An earlier local candidate with the same three-part state and tool lifecycle was loaded in an attached Chrome profile and run
through the WebMCP Model Context Tool Inspector as a browser agent. The
observed journey used the exact short instructions **Begin WORLDLINE.**, **Test
my prediction.** and **Carry out my choice.**, and completed all three
exchanges:

1. Chrome exposed exactly six planning tools. The agent inspected the evidence,
   tested one escape burn and one send-files burn, opened the
   calculation screen and stopped.
2. The person correctly calculated **25 seconds**, then selected the option about
   conflicting burn times, speed changes and antenna direction. In a second prompt, the same agent read both shared
   answers, tested one middle option and one test that challenged the prediction,
   assessed the prediction as correct, explained the physical
   conflict, recommended sending the files under the earlier opening contract and
   stopped.
3. The person chose the send-files route. Chrome immediately exposed seven tools,
   including the argument-free `execute_authorized_burn`. The agent executed it
   once, verified the receipt and left exactly `read_final_state` and
   `verify_transmission_receipt` registered.

The final page reported that the gravity map and light spectrum reached Earth, that this run's
30 MB of compressed files completed transmission at probe time t+69 seconds, two seconds before
the radio link closed, that the signal crossed 23 light-years and that the probe did
not escape. This was one successful run of the exact local candidate in the
observed Chrome profile; it is not a claim about every agent or browser.

## Responsive inspection

The revised opening was inspected in attached Chrome at the normal desktop
viewport, 390 px and 320 px. The mission, definition of an engine burn,
browser-agent instruction and footer remained readable without horizontal
overflow or overlap. The opening contains no selector, and **Begin WORLDLINE**
is its only browser-agent instruction. An earlier candidate's calculation,
prediction and completed receipt were also inspected at desktop and 390 px
without clipping or overlap.

The simplified opening was also checked on the deployed page at desktop,
390 px and 320 px. It exposed six WebMCP tools, contained no recommendation
selector, showed **Begin WORLDLINE** as the only opening instruction and had no
horizontal overflow or browser console warnings. The complete native-agent
journey must still be repeated against this deployed revision before that
specific end-to-end claim is refreshed. The earlier local agent run does not
prove the revised opening or deployment identity.

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
