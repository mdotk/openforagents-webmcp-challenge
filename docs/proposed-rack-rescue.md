# Proposed Rack Rescue

Status: implemented candidate at `?experience=rack-rescue`. It is not the
current challenge entry and has not been submitted. Its deterministic domain,
five WebMCP tools, visible fallback journey and responsive presentation pass
local automated and rendered-browser checks. The complete thirteen- and
fourteen-dish journey now also passes through the registered WebMCP tool
implementations. A real external-agent reasoning journey remains required
before it can replace the current entry. See the
[qualification record](rack-rescue-qualification.md),
[submission draft](rack-rescue-submission-draft.md) and
[video storyboard](rack-rescue-video-storyboard.md).

## The experience

A person and their browser agent load one dishwasher rack together. The person
places and pins a favourite red mug, keeps a child's cup on the top rack and
asks the agent to fit everything else while leaving room for a roasting tray.
The agent reads the exact current rack, proposes bounded moves and adapts when
the person reveals another large item.

The opening frame should explain the challenge immediately: a chaotic pile of
dishes on one side, an organized rack on the other and a visibly pinned red
mug that the agent must not move.

## Why an agent is useful

The person gives priorities rather than coordinates. The agent must combine:

- differently shaped items and allowed rotations;
- rack zones and blocked spray areas;
- fragile or top-rack-only items;
- a human-pinned placement;
- a request to reserve space for an item that is not initially loaded;
- validator feedback from a failed first arrangement;
- a new large tray introduced after the first valid plan.

The application does not expose a `solve_rack` tool. The model composes and
revises a plan. The website supplies authoritative geometry and rejects illegal
moves.

## Why WebMCP belongs here

A screenshot or prose description becomes stale as soon as the person drags or
pins a dish. WebMCP gives the agent structured access to the same changing rack
the person is manipulating. The agent can preview an exact set of moves,
receive machine-readable conflicts and apply only the validated plan against
the expected current revision.

This is not an agent clicking a human `Arrange` button. No such button or
single-call solver exists.

## Seventy-five-second demonstration

### 0:00-0:05: Ask the visual question

Open on the messy dishes and empty rack:

> Can all of this fit in one load?

### 0:05-0:16: Let the person set the rules

The person drags the red mug into place and pins it. The child's cup is marked
top-rack only. The person says:

> Fit everything, keep this mug here and leave room for the roasting tray.

### 0:16-0:30: Let the agent investigate

The agent reads the exact rack, dish footprints, rotations, locks and spray
zones. It proposes a complete list of moves.

### 0:30-0:40: Show reasoning through failure

The first preview fails because one plate blocks the spray arm. The page
returns the conflicting item and cells. The agent rotates the pan and moves two
bowls rather than restarting from a hidden solved state.

### 0:40-0:53: Apply the valid plan

The validated dishes animate into place around the pinned red mug. The visible
result reports fourteen dishes and zero conflicts.

### 0:53-1:04: Let the human change reality

The person adds a forgotten oversized roasting tray. The rack revision changes
and the earlier plan becomes stale.

### 1:04-1:15: Adapt without erasing the person

The agent reads the new revision, keeps the mug and child's cup, moves only the
minimum number of unlocked dishes and fits the tray. End on a before-and-after
wipe with the human constraints still visible.

## State owned by the website

The application state needs:

- a monotonically increasing `revision`;
- rack zones, discrete cells, blocked cells and spray-clearance rules;
- dish identifiers, finite footprints, permitted zones and permitted
  orientations;
- current placements and human locks;
- person-authored goals and their priorities;
- the latest preview, structured conflicts and preview digest;
- one bounded undo record;
- concise activity describing human and agent changes.

The implementation should use discrete slot identifiers and enumerated
orientations. It must not ask a language model to produce arbitrary pixel
coordinates.

## Permanent WebMCP tools

Every input schema must be closed with `additionalProperties: false`. Every
state-changing call must use the expected current revision.

### `get_rack_state`

Input: a closed empty object.

Returns the rack zones, available cells, blocked cells, concise dish geometry,
current placements, human locks, goals, validation state and revision. This is
read-only.

### `inspect_dishes`

Input:

- `dish_ids`: one to fourteen canonical identifiers.

Returns the selected dishes' discrete footprints, permitted orientations,
allowed zones and current lock and placement state. This is read-only.

### `preview_load_plan`

Input:

- `expected_revision`;
- `moves`: dish identifier, target slot and approved orientation for each
  moved item.

The website validates bounds, overlaps, spray clearance, zone rules, locks and
the person's goals. It returns structured conflicts or a preview identifier,
score and changed-dish count. It does not move a dish.

There is no unrestricted natural-language input and no automatic packing
operation inside this tool.

### `apply_load_plan`

Input:

- `expected_revision`;
- `preview_id`.

Applies only the exact moves from the current valid preview. It rejects stale
revisions, changed locks, missing dishes, altered geometry and unpreviewed
moves. On success it returns the new revision, moved dish identifiers and one
undo token.

### `undo_load_plan`

Input:

- `expected_revision`;
- `undo_token`.

Restores only the immediately preceding agent-applied plan when no later human
or agent change has occurred. The token is one-use and expires when the state
changes.

## Human controls

The person can drag, rotate, pin, unpin and add a forgotten item through the
visible page. Human actions use the same domain state as WebMCP calls and
advance the same revision. The agent cannot remove or move a human-pinned
dish.

The person can also load the rack manually without an agent. The WebMCP value
is the agent's ability to coordinate many live constraints and revise a plan
without replacing the human interface.

## Acceptance before selection as the entry

- A compatible external browser agent constructs a valid plan from the
  structured rack state; the application does not supply the solution. This
  remains pending.
- At least one first preview fails for a clear, current constraint and the
  agent repairs its plan from the returned conflict. The site-controlled
  fallback proves this contract; external-agent proof remains pending.
- The human pin remains unchanged through both plans.
- Introducing the roasting tray invalidates the earlier revision.
- The second plan fits the tray while minimizing changes to unlocked dishes.
- Stale, overlapping, locked-item and replay calls fail without changing the
  rack.
- Undo restores one eligible plan and refuses replay.
- The arrangement and movement are understandable without reading a technical
  log.
- The page works at desktop, 390 px and 320 px widths. Passed.
