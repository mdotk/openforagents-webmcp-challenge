# WebMCP Challenge project chronology

Launch Window A-01 is a new, standalone challenge-period project created by
Enoki Limited in 2026 for the WebMCP Challenge.

Enoki Limited is the entrant and Matt Gibbs is its representative.

## Before this challenge

Enoki Limited had already developed other Open for Agents software, websites,
demos, documentation and research. Those products established the broader
Open for Agents work, but they are not the source code for this entry.

## Work created for the challenge

This repository began as a separate React, TypeScript and Vite application for
the WebMCP challenge. The simulated mission-control experience and its WebMCP
interface are new work in this repository. They are not a release, edition or
renamed version of the existing Open for Agents plugin, hosted Assistant, demo
or website.

Launch Window A-01 comes from the same publisher and explores the same subject
as Open for Agents: websites that expose understandable, limited tools to
user-chosen agents. Shared subject matter and authorship do not make this
repository a continuation of an existing product's code.

## Reproducing the entry

The source, locked dependency versions and local build commands are kept in
this repository so the challenge-period work can be inspected and reproduced
on its own. The README describes the current experience and its limits.

## Proposed experience revision

After qualifying Launch Window A-01, the entrant documented and implemented a
possible replacement experience based on a fictional shared fitting room. The
prototype keeps the same challenge-period repository and the limited, one-use
authority idea, but uses a separate domain model, tool set and interface.

The proposal is recorded in
[proposed-shared-fitting-room.md](proposed-shared-fitting-room.md) and its
[WebMCP contract](proposed-shared-fitting-room-contract.md). It is exposed only
through a separate query-parameter path, is not the root application and does
not alter the existing Launch Window evidence. The README will change only if
the replacement becomes the real public experience.

The first implemented slice uses six fictional products, seven permanent
tools and one temporary reservation tool. Human approval makes the temporary
tool available for one exact look; successful use removes it again. The local
Chrome qualification is recorded separately in
[fitting-room-prototype-qualification.md](fitting-room-prototype-qualification.md).

The entrant subsequently adopted the fitting-room concept as the preferred
replacement candidate, subject to one unresolved gate: a supported external
browser agent must complete the real reasoning and dynamic-tool journey. The
manual page journey and Chrome Inspector evidence do not satisfy that gate.
Until it passes, Launch Window remains the root experience and the fitting room
must not be described as the submitted challenge entry.

## Submission status

On 1 September 2026, the qualified Adaptive Shopping Canvas was promoted to the
root route. Launch Window A-01 remains available at
`?experience=launch-window`; the fitting-room and Rack Rescue prototypes remain
on their existing routes.

On 3 September 2026, the entrant qualified WORLDLINE as a separate
reasoning-first WebMCP experience and promoted it to the root route. The
Adaptive Shopping Canvas remains available at `?experience=shopping`.
WORLDLINE's observed browser lifecycle changes from five investigative tools to
six after person approval, then to two read-only verification tools after the
one-use action is consumed.

Later that day, the candidate moved from a bounded prescribed journey to an
open investigation contract. The agent now receives the person's priority and
raw evidence, must state a hypothesis before each of at most five simulations,
and places a recommendation plus its rejected alternative on the shared page.
Local automated and responsive acceptance passed. A fresh external-agent run
remains pending for this replacement contract. The public deployment and
attached-Chrome readback passed; earlier agent traces are not reused as current
external-agent qualification.

Matt Gibbs has joined the challenge on Devpost. No entry video has been
published to YouTube and no final challenge submission has been made. This
chronology does not claim a challenge result.
