# Shared Fitting Room demo video

This is a recording plan only. No video has been recorded or published.

Target runtime: 2 minutes 40 seconds. The final video must stay below three
minutes and show the deployed page, the real compatible browser agent and the
native tool inventory. Do not reconstruct model output or animate a fake tool
list.

## 0:00–0:12: The result first

Open on the final all-black look beside the four-item fitting room. Flash back
through the burgundy first look and the sold-out organza revision, then show the
human-approved tool count change from seven to eight and back to seven.

On-screen words:

> One brief · six constraints · live stock · one exact approval

Narration:

> I described one look. My browser agent shopped the retailer, kept the piece I
> chose, recovered when stock changed and stopped before the one action that
> needed my approval.

## 0:12–0:32: The brief

Restart the experience. Show the saved request and six constraint chips without
reading every word aloud.

Narration:

> I need a couture vampire look for Saturday: size medium, nothing tight around
> my neck, dance-ready, under 250 dollars, available for Friday pickup and built
> around boots I already own. A chat can suggest an outfit. This agent works in
> the retailer's current catalogue and the same fitting room I can see.

## 0:32–0:58: Let the agent shop

Give the external agent one instruction: build the strongest complete look from
the saved brief, explain the choices and stop before any hold. Keep the agent's
tool activity and the visible fitting room in the recording. Cut idle waiting,
but preserve the order of real calls.

Narration:

> WebMCP gives the agent seven typed tools. It reads the brief, searches
> retailer-authored facts, compares products and assembles a complete look.
> Price, size, movement and Friday quantity still come from the retailer, not the
> model.

## 0:58–1:18: Human taste changes the plan

Show the first burgundy look. Pin the tailored vest on the page and ask for an
all-black revision. Show the dress-form image and shared item list change.

Narration:

> I like the vest, so I pin it. The agent cannot remove a human-pinned item. I
> ask for all black, and it revises the rest of the outfit around my decision.

## 1:18–1:43: Live stock forces reasoning

Apply the labelled inventory update. Hold long enough to show that the organza
sleeves have zero Friday quantity, the validation state fails and the review
action disappears. Ask the agent to re-check and repair the look. Show the
bell-sleeve substitute and restored $242 validation.

Narration:

> Then the organza sleeves sell out for Friday. The page rejects the stale look
> instead of pretending it still works. The agent re-reads the retailer state,
> preserves my vest, chooses the available shrug and stays inside every hard
> limit.

## 1:43–2:08: Stop at the human boundary

Ask the agent to validate and request review. Show the exact four items, $242
subtotal, Friday 4 pm pickup, 15-minute duration, $0 charge and “no hold yet”.

Narration:

> The agent can prepare the decision, but it cannot approve it. I see the exact
> scope before anything is held. Requesting review creates no reservation and
> charges nothing.

## 2:08–2:28: Seven, eight, seven

Keep the native inventory visible. Approve the exact hold on the page, show
`reserve_approved_look` appear as the eighth tool, then ask the agent to use it.
Show `FF-DEMO-001`, $0 charged and the inventory return to seven.

Narration:

> My approval creates one exact, one-use capability. The agent uses it, the
> fictional hold is created and the tool disappears. Seven tools, eight only
> while authority exists, then seven again.

## 2:28–2:40: Close on the reason WebMCP matters

End on the final shared mirror and source URL.

Narration:

> This is what agent-native shopping can feel like: the agent handles the
> tedious coordination, the retailer stays authoritative and the person keeps
> the decisions that matter.

## Recording acceptance

- The external agent must make real WebMCP calls against the deployed page.
- The first look, human pin, all-black revision, inventory failure, substitute,
  exact review and one-use hold must be one truthful chronological journey.
- Show the 7 to 8 to 7 native inventory at readable size.
- Do not call the fictional quantities or hold real.
- Do not claim compatibility beyond the browser and agent actually recorded.
- Keep unrelated tabs, profile details and credentials out of frame.
- Verify narration, captions and the visible result against the final deployed
  build before publication.
