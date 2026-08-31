# Rack Rescue submission draft

This document prepares the project description and testing instructions. It is
not a submitted challenge entry.

## Project title

Rack Rescue

## One-line description

A person chooses exactly where their red mug must stay, then a browser agent
fits the whole load, repairs an unsafe plan and adapts when a forgotten
roasting tray changes the problem.

## The problem

Loading a dishwasher is a small but surprisingly awkward coordination task.
The useful answer is not a paragraph explaining where plates usually go. It is
an arrangement that fits the exact dishes in front of you, respects the rack's
physical constraints and preserves the choices another person has already
made.

Rack Rescue begins with thirteen visible dishes beside an empty dishwasher
rack. The person drags their red mug into one of three qualified rack positions
or chooses the position directly. The child's cup must remain in its safe zone,
the cutlery must stay in its basket zone, two cells above the spray arm must
remain clear and a six-cell area is reserved for a roasting tray.

The agent must construct the arrangement itself. The website does not expose a
`solve_rack` tool or return a prepared answer. It exposes the current shared
state, finite dish geometry and a validator that rejects illegal plans.

## Why this is a strong fit for WebMCP

The page and agent need to collaborate over changing, structured state. A
screenshot becomes stale as soon as the person pins a dish or adds the tray.
Ordinary chat can discuss the problem, but it cannot reliably share the rack's
current revision, exact occupied cells, human locks and preview state.

WebMCP gives the browser agent five typed tools:

1. `get_rack_state` reads the rack, visible dishes, constraints, revision and
   current preview state.
2. `inspect_dishes` returns exact geometry and placement rules for selected
   dishes.
3. `preview_load_plan` validates a complete proposed arrangement without
   moving anything.
4. `apply_load_plan` applies only the exact current zero-conflict preview.
5. `undo_load_plan` reverses the immediately preceding agent plan once.

Every schema is closed with `additionalProperties: false`. State-changing
calls require the current revision. A stale call, overlap, blocked spray arm,
out-of-zone item or attempt to move the pinned mug is rejected without
changing the committed rack.

WebMCP is not being used as a remote-control layer for visible buttons. The
agent must translate a person's priorities into discrete placements, submit
the complete arrangement for validation, interpret structured conflicts and
revise the plan. The website remains authoritative for what is physically and
safely allowed.

## What the person and agent do together

The person starts by dragging the red mug into the rack or choosing one of the
three marked spots. That exact position becomes the boundary the agent cannot
move. They then ask the agent to fit every visible dish while preserving the
mug and the household rules.

The agent reads the live rack and dish geometry, constructs a plan and previews
it. Nothing moves during preview. If a plate blocks the spray arm or two dishes
overlap, the page identifies the affected dishes and cells so the agent can
repair the plan.

After a valid plan is applied, the person reveals the forgotten roasting tray.
That human action changes the rack revision and invalidates the old plan. The
agent must read the new state, preserve the red mug, move only unlocked dishes
and fit all fourteen items. The shared page makes the final result immediately
visible: fourteen dishes, zero conflicts and the person's pin still intact.

The person can use an immediate one-use Undo after an agent plan. The agent
cannot erase a later human change or replay an old Undo token.

## How WebMCP is implemented

Rack Rescue is a standalone React and TypeScript application with a
deterministic browser-local state machine. The same state drives the visible
rack and the WebMCP tools.

The page registers each tool with
`document.modelContext.registerTool()`. Read tools return bounded structured
results. Plan inputs use canonical dish identifiers, integer columns and rows,
and enumerated orientations rather than arbitrary pixels or prose. Executions
accept the browser-provided cancellation signal and check it before a
state-changing commit.

The preview tool performs the website's validation but does not choose a
layout. Applying a plan requires both the current revision and the identifier
of the exact current preview. This separates model reasoning from website
authority: the agent proposes; the page validates and commits.

All data is fictional and local to the browser. There is no account, upload,
camera, model credential, purchase, appliance control or external household
data behind the experience.

## Current evidence and limit

The candidate passes lint, TypeScript, the production build and 47
deterministic tests. Those tests cover the five registered tools, closed
schemas, hidden-tray boundary, structured conflicts, full thirteen- and
fourteen-dish plans, human-selected mug placement, pointer cancellation, human
locks, stale revisions, cancellation and one-use Undo.

The current interaction has been checked at desktop, 390 px and 320 px with no
horizontal overflow or console errors. On the canonical deployed route, a real
pointer drag selected a non-default mug position and the guided thirteen- then
fourteen-dish journey completed without moving it. In the tested Chrome session
the page completed registration and reported five native tools.

Two deliberately small local models were also given the real tool contract.
Their invalid calls were rejected without changing the rack or moving the red
mug. That establishes a useful safety property, not successful agent
reasoning.

The final entry must not claim that an external browser agent solved Rack
Rescue until one has completed both the initial load and forgotten-tray replan
through the deployed WebMCP tools. That qualification remains pending.

## Testing instructions

1. Open the Rack Rescue URL in a compatible browser agent.
2. Drag the red mug onto a marked rack spot, or choose one of the three spots
   directly.
3. Ask the agent to fit every visible dish, preserve the mug, keep the child's
   cup and cutlery in their required zones, keep the spray arm clear and leave
   room for the roasting tray.
4. Require the agent to preview the complete arrangement, repair any conflict
   and apply only a zero-conflict preview.
5. Confirm that thirteen dishes are placed, the page reports zero conflicts
   and the mug has not moved.
6. Select **Add the roasting tray**.
7. Ask the agent to read the changed rack and fit all fourteen dishes while
   preserving the mug and minimizing unnecessary movement.
8. Confirm that the tray is present, all fourteen dishes fit, the page reports
   zero conflicts and the prior plan's Undo is no longer available.
9. Use Undo once after the final applied plan and confirm that replay is
   rejected.

## Links

- Candidate experience: https://openforagents-webmcp-challenge.vercel.app/?experience=rack-rescue
- Source: https://github.com/mdotk/openforagents-webmcp-challenge
- Challenge: https://openai.com/webmcp-challenge/
