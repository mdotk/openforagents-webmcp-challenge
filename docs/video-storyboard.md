# Launch Window A-01 demo video

This is a recording plan only. No video has been published.

Target runtime: 2 minutes 42 seconds. Keep the finished video between 2:35 and
2:50, below the challenge's three-minute limit, using only original visuals and
narration.

## Recording requirements

- Record the central 7 → 8 → 7 sequence against the deployed site in a browser
  with native WebMCP support. Keep the native tool inventory visible and do not
  substitute the manual **Use one-use reroute** control for the tool invocation.
- Capture the readable 7 → 8 → 7 sequence as one continuous shot. A refresh of
  the native inventory is fine; a staged counter or reconstructed tool list is
  not.
- Use one agent request for diagnosis and the two routine repairs. Show the
  resulting page state instead of presenting seven tools one after another.
- Match the narration to the recorded actor. Say that an agent invoked a tool
  only if the recording shows model-driven invocation; for an inspector-driven
  execution, say that the tool was invoked through WebMCP.
- Show the simulation notice on screen and describe broader workflows only as
  possible applications. This project does not implement refunds, publishing
  or account changes.
- Keep account details, unrelated tabs and browser profile information outside
  the frame. Use captions for the tool counts and the final page-control
  boundary, then verify each caption against the recorded behavior.

## 0:00–0:10 — Hook: seven, eight, seven

Begin with the power decision already pending and the native inventory showing
seven tools. In a fast, continuous native capture, approve the exact repair on
the page, show `apply_power_reroute` become the eighth tool, invoke it through
WebMCP and show the inventory return to seven.

On-screen captions: **7 baseline tools** → **8 after approval** → **7 after use**

Narration:

> Seven tools. I approve one exact repair: eight. It runs once, and the page
> returns to seven.

## 0:10–0:27 — Name the idea and its limit

Show the full page, the Launch Window A-01 title card and the simulation notice.
Restart the experience for the walkthrough.

Narration:

> This is Launch Window A-01, a local mission-control simulation for teams
> designing consequential browser-agent actions. Agent tools are often treated
> as a fixed inventory. Here, the page exposes only the authority that exists
> now. There is no spacecraft, account, backend or external transaction. The
> point is the permission lifecycle you just saw.

## 0:27–0:53 — Let the agent handle routine work

Give the agent one request: inspect the mission, complete the routine repairs
and stop after requesting the power decision. Keep the mission cards,
capability path and activity record prominent. Do not pause on every individual
tool call.

Narration:

> The page starts with seven typed WebMCP tools. The agent can read the local
> state at the level it needs, restart communications, recalibrate navigation
> and request the next decision. Closed schemas and revision checks keep each
> command tied to the current simulated mission state.

## 0:53–1:17 — Show the exact decision

Hold on the approval panel. Show the guidance-only scope, 15 kW amount and
one-use limit. Keep the native inventory visible at seven and show that neither
`apply_power_reroute` nor a launch tool is present.

Narration:

> The power reroute is different. It is not exposed through WebMCP yet. The page
> asks me to approve one 15-kilowatt transfer for guidance. That decision does
> not grant a general command, and it does not expose launch.

## 1:17–1:48 — Record the native capability lifecycle

Use a fresh, continuous native capture at readable speed:

1. Show seven tools before approval.
2. Select **Authorize one repair** on the page.
3. Refresh or reread the native inventory and show eight tools, including
   `apply_power_reroute` with the active grant identifier.
4. Invoke `apply_power_reroute` through WebMCP.
5. Show guidance become ready and the native inventory return to seven.

Narration:

> My approval makes the page register one additional tool, bound to this grant
> and limited to one use. The approved capability is invoked through WebMCP.
> The page consumes the grant and removes the tool, so the native inventory
> returns from eight to seven.

## 1:48–2:05 — Keep launch outside WebMCP

Show the seven-tool inventory once more with no launch tool. Then press
**Launch Aster** on the page and let the launch animation clear the tower.

On-screen caption: **Launch: visible page control · not exposed through WebMCP**

Narration:

> Launch never appears in the WebMCP inventory. When the repairs are complete,
> I perform it through the visible page control.

## 2:05–2:23 — Show revocation

After a short reset, return to a prepared approval state. Approve the repair,
show the eighth tool, then select **Revoke authority** before it is used. Show
the inventory return to seven and launch remain locked.

Narration:

> Approval is not permanent. Before use, I can revoke it. The temporary tool is
> removed, the baseline inventory returns, and launch stays locked.

## 2:23–2:42 — Close with the transferable pattern

Return to the full mission-control view, then end on a simple title card with
the live experience and source repository.

Narration:

> A refund, publishing action or account change could use the same pattern, but
> this project implements only the mission simulation. Launch Window A-01 shows
> the core idea: create the capability a person approved, then take it away.

## Prepared video metadata

Title:

> Launch Window A-01 | One approved WebMCP tool, then gone

Description:

> Launch Window A-01 is a deterministic, client-only mission-control simulation
> created for the WebMCP Challenge. The page starts with seven WebMCP tools.
> After a person approves one exact 15 kW repair, it registers
> `apply_power_reroute` as an eighth, one-use tool, then removes it after use or
> revocation. Launch is not exposed through WebMCP; it is performed through the
> visible page control.
>
> This project simulates a mission. It does not connect to a spacecraft, model,
> account, backend, transaction or external data source.
>
> Live experience: https://openforagents-webmcp-challenge.vercel.app/
>
> Source: https://github.com/mdotk/openforagents-webmcp-challenge
