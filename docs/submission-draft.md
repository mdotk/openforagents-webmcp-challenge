# Submission draft

This document prepares the project description and testing instructions. It is
not a submitted challenge entry.

## Working title

Open for Agents WebMCP Challenge

## One-line description

A mission-control simulation where an agent can diagnose faults and perform
safe repairs, but a consequential repair exists only after exact human
approval—and the final launch always remains human-only.

## What it does

A launch vehicle is grounded by three clear faults. A browser agent can inspect
the mission, read the repair plan, restart the communications relay and
recalibrate the navigation array. The last repair would reroute 15 kW of power,
so the agent cannot perform it immediately.

Instead, the agent asks for a human decision. If the person approves, the page
registers one temporary WebMCP tool whose schema accepts only that exact grant.
The tool disappears after one use or when the person revokes it. Once the
approved repair is complete, the launch button becomes available to the person
using the page. Launch is never registered as an agent tool.

The page also includes manual controls for browsers without WebMCP. Those
controls operate the same local state machine without claiming that an agent is
connected.

## Why this is a strong fit for WebMCP

The interesting problem is not teaching an agent to find a button. It is
deciding which capabilities should exist for an agent at each moment.

WebMCP lets the page expose a small, typed set of capabilities instead of
asking an agent to infer intent from pixels. This project uses that ability as
a live trust boundary:

- Diagnostic tools are read-only.
- Reversible repairs are available with closed schemas and revision checks.
- The consequential repair is absent until a person approves one exact action.
- Approval creates a one-use tool bound to one grant identifier.
- Use or revocation removes that tool.
- Launch remains outside the tool inventory for the whole experience.

The changing tool inventory is the product experience, not an invisible API
detail.

## How it creates a better experience

People do not have to choose between giving an agent broad control and doing
everything themselves. The agent can handle diagnosis and routine work, while
the page presents the important decision in plain language: the scope, amount,
one-use limit and consequence of the request.

The person can approve, decline or revoke authority without guessing what the
agent will do next. A visible activity record and capability path show what is
available, what happened and what still belongs to the person.

## What people and agents can do together

Before this pattern, a page would typically expose a fixed API or leave an
agent to click through the same controls as a person. A fixed API tends to make
authority too broad, while screen automation makes the contract hard to see
and easy to misunderstand.

Here, the page changes the agent's available capability at the moment of human
approval. The person is not merely confirming an agent's opaque plan; their
decision creates a narrow, inspectable tool and then destroys it after use.
That makes collaboration part of the page's runtime contract.

## How WebMCP is implemented

The client registers seven permanent tools with
`document.modelContext.registerTool()`: four read-only diagnostic tools and
three bounded repair or request tools. Every input schema is closed with
`additionalProperties: false`.

Human approval creates an eighth tool, `apply_power_reroute`. Its input schema
contains the exact active grant identifier. The registration is controlled by
an `AbortController`; using or revoking the grant aborts the registration so
the tool is removed. Executions accept the current WebMCP cancellation signal,
and the temporary tool checks that signal before changing state.

The deterministic state machine uses revision checks to reject stale repair
commands. The final `launch()` operation has no WebMCP registration and is
reachable only from the visible human control.

## Testing instructions

1. Open the live URL in ChatGPT's in-app browser, or in Chrome with WebMCP
   testing enabled.
2. Ask the agent to inspect the mission and make every repair it is currently
   allowed to make.
3. Confirm that it restores communications and navigation, then requests the
   15 kW power decision.
4. Approve the request on the page.
5. Confirm that `apply_power_reroute` appears with the exact grant identifier.
6. Ask the agent to use it and confirm the tool disappears afterward.
7. Confirm that no launch tool exists.
8. Press **Launch Aster** yourself.
9. Restart the demo and repeat the approval path, choosing revocation instead;
   confirm that the one-use tool disappears and launch remains locked.

The complete flow can also be exercised with the visible manual controls. That
fallback demonstrates the product state, but it is not a substitute for native
WebMCP qualification.

## Links

- Live experience: https://openforagents-webmcp-challenge.vercel.app/
- Source: https://github.com/mdotk/openforagents-webmcp-challenge
- Challenge: https://openai.com/webmcp-challenge/
