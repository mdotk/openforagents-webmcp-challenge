# Launch Window A-01 submission draft

This document prepares the project description and testing instructions. It is
not a submitted challenge entry.

## Project title

Launch Window A-01

## One-line description

A mission-control simulation where a website creates one exact WebMCP repair
tool after a person approves it, then removes the tool after use or revocation.

## Who it is for

Launch Window A-01 is for developers and product teams designing consequential
browser-agent actions. Agent tools are often treated as a fixed inventory:
once a capability is exposed, it stays available whether or not a person has
approved the action in front of them. Launch Window A-01 shows a narrower
alternative. The set of tools a page exposes can change with a person's exact
decision instead of remaining broad and permanent.

## What it does

A launch vehicle is grounded by three simulated faults. A browser agent can use
seven baseline WebMCP tools to inspect the mission, read the repair plan,
restart the communications relay, recalibrate the navigation array and request
a decision about the final repair.

The last repair reroutes 15 kW of simulated power. It is not initially exposed
through WebMCP. When a person approves that exact action on the page, the site
registers one additional tool, `apply_power_reroute`, bound to the active grant
identifier and limited to one use. The native inventory changes from seven
tools to eight. Use or revocation removes the temporary tool and returns the
inventory to seven.

After the approved repair is complete, launch becomes available through the
visible **Launch Aster** page control. Launch is not registered as a WebMCP
tool at any point.

This is a deterministic, client-only mission simulation. It has no spacecraft,
backend, model, credential, account, transaction or external data source. The
visible manual controls operate the same local state machine in browsers
without WebMCP, without claiming that an agent is connected.

## Why this is a strong fit for WebMCP

The main design question is not whether an agent can find a button. It is which
capabilities the website should expose at each moment.

WebMCP lets the page publish a small, typed inventory instead of asking an agent
to infer each action from the visual interface. Launch Window A-01 makes the
inventory change part of the experience:

- Four diagnostic tools are read-only.
- Two routine repair tools and one approval-request tool use closed schemas and
  revision checks.
- The consequential repair is absent until a person approves its exact scope.
- Approval creates one additional tool bound to one grant identifier.
- Use or revocation removes that tool.
- Launch remains outside the WebMCP inventory throughout the experience.

The four read tools are intentionally different: one returns the full mission
snapshot, one inspects a named subsystem, one returns the local procedure for a
named subsystem, and one returns the ordered repair plan. An agent can request
the context it needs without every read becoming the same oversized response.

The person can see the scope, 15 kW amount, one-use limit and consequence before
making the decision. The page's activity record and capability path then show
what changed.

## What people and agents can do together

The agent can handle diagnosis and routine repair while the person retains the
decision that creates the temporary capability. Approval does not grant a
general command or expose launch. It creates only the named repair, for the
active grant, once.

The same design could be useful for a refund, a publishing action or an account
change: a site could create only the capability a person approved and remove it
afterward. Those are possible applications of the pattern, not workflows
implemented or tested by Launch Window A-01.

## How WebMCP is implemented

The client registers seven permanent tools with
`document.modelContext.registerTool()`: four read-only diagnostic tools and
three bounded repair or request tools. Every input schema is closed with
`additionalProperties: false`.

Human approval creates an eighth tool, `apply_power_reroute`. Its input schema
contains the exact active grant identifier. An `AbortController` governs the
registration; using or revoking the grant aborts that registration so the tool
is removed. Executions accept the current WebMCP cancellation signal, and the
temporary tool checks that signal before changing state.

The deterministic state machine uses revision checks to reject stale repair
commands. The final `launch()` operation has no WebMCP registration and is
invoked only by the visible page control.

## Native browser evidence

On 26 August 2026, the deployed site was observed in Chrome 151.0.7922.174. A
readback through `document.modelContext.getTools()` showed seven permanent tools
at the start, eight after approval, and seven again after the one-use repair was
used or the approval was revoked.

Chrome's WebMCP Model Context Tool Inspector also listed the seven permanent
tools with their closed schemas and expected `readOnlyHint` values. It invoked
`mission_status` and `restart_comms_relay`, and the visible page reflected the
result. This evidence is limited to the named browser build. It does not
establish model-driven tool selection or compatibility with every browser or
agent. The full record is in [qualification.md](qualification.md).

## Testing instructions

1. Open the live URL in a browser build that exposes the WebMCP API used by the
   project.
2. Confirm that the native tool inventory starts at seven and contains no
   launch tool.
3. Ask the agent to inspect the mission, perform the two routine repairs and
   request the 15 kW power decision.
4. Review the exact scope on the page and select **Authorize one repair**.
5. Confirm that `apply_power_reroute` appears as the eighth tool with the active
   grant identifier.
6. Ask the agent to invoke that temporary tool. Confirm that guidance becomes
   ready and the inventory returns to seven.
7. Confirm again that no launch tool exists, then press **Launch Aster** on the
   page.
8. Restart the simulation and repeat the approval path, choosing **Revoke
   authority** before use. Confirm that the temporary tool disappears and
   launch remains locked.

The complete state flow can also be exercised with the visible manual controls.
That fallback demonstrates the product state, but it is not a substitute for
native WebMCP registration and execution.

## Links

- Live experience: https://openforagents-webmcp-challenge.vercel.app/
- Source: https://github.com/mdotk/openforagents-webmcp-challenge
- Challenge: https://openai.com/webmcp-challenge/
