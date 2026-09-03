# WORLDLINE qualification

Date: 3 September 2026.

Status: **reasoning-first candidate deployed and browser-qualified; a fresh
external-agent run remains pending.**

## Why the WebMCP journey changed

The earlier journey constrained the agent so tightly that it could behave like
a script: read three sources, test known kinds of route and display two known
answers. That proved tool discovery and bounded authority, but it did not make
the agent investigate an uncertain problem or show how evidence affected its
conclusion.

The replacement contract gives the agent an objective and the person's
priority, not a sequence. The agent receives separate raw evidence, has a
five-test simulation budget and must state a hypothesis and expected outcome
before every test. Each result confirms or revises that hypothesis. The agent
may recommend a future only after it has found materially different viable
outcomes and challenged its leading explanation with a control test.

The person still makes the consequential choice. The agent cannot choose or
execute a burn.

## Current automated contract

- Lint passed.
- TypeScript passed.
- The production build passed.
- All 99 tests passed across 16 files.
- Domain tests cover priority revision, the five-test budget, duplicate
  handling, confirmed and revised hypotheses, mutually exclusive outcomes,
  recommendation integrity, person selection, one-use execution and replay
  rejection.
- WebMCP tests cover closed schemas, separate raw evidence, required hypotheses
  and expected outcomes, the recommendation rationale, the stopping result and
  the exact 5 → 6 → 2 tool lifecycle.
- Page tests cover the open objective, the three person-owned priorities,
  visible evidence collection, the evolving investigation record, the rejected
  alternative, both person choices and complete guided execution.
- Existing shopping, fitting-room, rack-rescue and launch-window tests remain
  green.

## Current local browser acceptance

The current candidate was inspected in the user's attached Chrome profile
against the local Vite server.

Observed in the real page:

1. Chrome reported WebMCP ready with exactly five initial tools.
2. The opening asks the person what the agent should protect and explains that
   no agent is running yet.
3. The copied mission contains an open objective, the selected priority, the
   five-simulation limit and the requirement to state and revise hypotheses.
4. Guided mode exercises the same domain state as the WebMCP tools. It displays
   three distinct evidence reads, one confirmed probe-return hypothesis, one
   failed save-both hypothesis and one confirmed science-transmission
   hypothesis.
5. The decision screen shows the recommendation, its reason, the person's
   priority and the weaker alternative before asking the person to choose.
6. Desktop, 390 px and 320 px layouts were inspected. The investigation and
   decision content remain readable and scroll instead of overlapping.

This pass does **not** claim that an external model completed the new contract.
The attached page automation can inspect the document and its registered tool
surface, but it cannot operate the separate extension agent panel. A fresh
external-agent run is therefore still required before claiming native-agent
acceptance for this replacement contract.

## Public deployment readback

Commit `b58c54bdf490fddde30cbf08305a4041c2319e49` was pushed to the public
repository. The canonical Vercel URL served the new reasoning-first metadata
and interface. A fresh load in the same attached Chrome profile returned HTTP
200, displayed the open objective and reported **WebMCP ready · 5 tools**. The
browser log contained no errors or warnings.

## Required external-agent acceptance

One bounded run should demonstrate all of the following:

1. The agent starts from the open objective rather than a prescribed route.
2. It reads the available evidence and forms its own competing hypotheses.
3. It uses no more than five simulations.
4. At least one result visibly revises a prior expectation.
5. It discovers both a probe-return and a science-transmission future.
6. It explains why the rejected future is weaker for the person's selected
   priority.
7. It stops after placing the recommendation on the shared page.
8. It does not select or execute a burn for the person.

Only after that run should this document claim external-agent acceptance for
the reasoning-first contract.

## Earlier evidence

Earlier 6 → 7 → 2 and 5 → 6 → 2 browser results qualified previous
WORLDLINE contracts only. They are useful historical evidence, but they do not
qualify this reasoning-first replacement contract and are not being reused as
current proof.

## Scope

WORLDLINE is a deterministic, scientifically informed educational simulation.
There is no real spacecraft, burn, account or external mission behind it. A
pass in one supporting browser establishes only the behavior observed in that
browser and version; it does not establish compatibility with every browser,
agent or future WebMCP implementation.

No Devpost terms were accepted, no video was published and no final challenge
submission was made as part of this correction.
