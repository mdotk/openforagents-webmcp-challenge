# WebMCP Challenge finalist decision

Status: historical finalist decision. The current public entry has not been
replaced. New implementation work follows the
[Adaptive Shopping Canvas blueprint](adaptive-shopping-canvas-implementation-blueprint.md).

## The two finalists

### School-Run Rescue Box

A bakery owner and their agent turn remaining closing-time stock into a
store-rule-compliant rescue offer. Human approval creates one exact publishing
capability. The offer appears on a customer reservation page and a physical
e-paper display, whose remaining count changes after a reservation.

This concept has the stronger impact story and the more distinctive connection
between a website, an agent, a person, customers and a physical place.

### Rack Rescue

A person pins one meaningful dish and sets household priorities. Their agent
fits the remaining dishes into a structured dishwasher rack, repairs a failed
plan from validator feedback and adapts when the person introduces a forgotten
roasting tray.

This concept is easier to understand in a silent three-second clip and has the
lower implementation risk.

## Decision criteria

The final selection should not be based on which description sounds more
ambitious. It should be based on observable evidence.

| Question | School-Run Rescue Box | Rack Rescue |
| --- | --- | --- |
| Can a silent opening frame explain the problem? | Yes: food, offer and remaining count | Yes: messy dishes, rack and pinned mug |
| Does the agent need current website state? | Yes: stock, reservations and rules | Yes: geometry, locks and live placements |
| Does the person contribute something the agent cannot decide alone? | Yes: local customer context and publication authority | Yes: priorities, pinned objects and changed reality |
| Is the result visibly different from chat output? | Yes: live offer, reservation and physical sign | Yes: the shared rack physically rearranges |
| Is there a credible real-world consequence? | Strong | Moderate |
| Can judges run it without special hardware? | Only with a complete browser display twin | Yes |
| Largest implementation risk | Unknown e-paper model and transport | Reliable external-model spatial planning |

## Selection gate

School-Run Rescue Box becomes the selected entry only if all of these are true:

1. The exact e-paper model and supported control path are identified.
2. One approved image can be sent to the display without a hidden manual
   replacement step.
3. A second version showing a changed remaining count refreshes reliably and
   visibly enough to film.
4. The browser display twin supports the complete journey for judges without
   hardware.
5. The website, not the model, remains authoritative for stock, reservations,
   price rules and the approved publication scope.

If any of the first three conditions cannot be demonstrated quickly and
reliably, select Rack Rescue instead. Do not build a new device platform merely
to rescue the physical concept.

Rack Rescue becomes the selected entry only if a real external model can
produce valid discrete placements from the exposed state without a hidden
solver. If that fails, the concept proves a validator rather than useful agent
reasoning and should not replace the already qualified fitting-room prototype.

## Work that must not be duplicated

- Do not implement both complete experiences.
- Do not add accounts, payments, live food ordering or a real point-of-sale
  integration.
- Do not add vision, uploads, free-coordinate geometry or a general packing
  service to Rack Rescue.
- Do not make the e-paper display mandatory for judging.
- Do not remove the existing fitting-room prototype until the selected
  replacement passes a real external-agent journey.
- Do not change the current public entry merely because a static concept image
  looks attractive.

## Next action

Identify the physical display and its control path. If it is available, run the
smallest two-frame update test: publish one offer image, then update only the
remaining count. That result selects School-Run Rescue Box or promotes Rack
Rescue to the implementation lane.
