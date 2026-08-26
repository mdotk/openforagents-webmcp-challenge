# Launch Window A-01 qualification

This page distinguishes automated product checks from native browser evidence.

## Automated checks

The local acceptance command is:

```sh
npm run check
```

It runs lint, 15 deterministic tests and the production TypeScript/Vite build.
The tests cover:

- Ordered safe repairs and stale-revision rejection.
- Approval, denial, revocation and a fresh request.
- Exact one-use grant creation and consumption.
- WebMCP registration, cancellation of permanent and one-use actions, and
  disposal.
- Removal of the temporary tool after use or revocation.
- The absence of any launch tool.
- The complete manual fallback and launch through the visible page control.
- Keyboard focus through approval, use and final launch.

Dependency auditing reports no known vulnerabilities, and the bounded source
scan reports no credentials.

## Native browser checks

Automated tests do not prove that a browser exposed or executed the page's
WebMCP tools. Native qualification must use the deployed site in ChatGPT's
in-app browser or a supported Chrome build with WebMCP testing enabled.

The required native checks are:

1. Seven permanent tools appear with the expected closed schemas.
2. Read-only and state-changing annotations match their behavior.
3. Safe repairs execute and stale revisions fail.
4. Approval registers only `apply_power_reroute` with the exact grant ID.
5. Cancellation before the commit point does not change mission state.
6. Use and revocation both remove the temporary tool.
7. Restarting the page leaves no duplicate or stale tools.
8. No launch tool appears at any point.
9. The complete visual flow remains usable at desktop, 390 px and 320 px.

The public entry should claim only the native browser behavior that has been
observed in the named browser build.

## Chrome observation — 26 August 2026

The deployed experience was checked in Chrome 151.0.7922.174 at
<https://openforagents-webmcp-challenge.vercel.app/>.

The page completed native registration and read back its Open for Agents tool
inventory through `document.modelContext.getTools()`. It showed seven permanent
tools at the start, eight after a person approved the exact power reroute, and
seven again after the one-use repair was used or the approval was revoked.
Restarting the experience returned it to revision 0 with seven tools and no
launch tool.

The visible fallback completed the full repair and launch journey. The denial,
revocation and restart paths also behaved as described. Launch stayed locked
until the approved repair was complete, was not exposed through WebMCP and was
performed through the visible page control. No console errors or warnings
appeared.

The experience was also checked at desktop width, 390 px and 320 px. All
controls and explanations remained present, and neither mobile width produced
horizontal overflow.

Chrome's WebMCP Model Context Tool Inspector independently listed all seven
permanent tools with their expected closed schemas and `readOnlyHint` values.
It executed `mission_status` with `{}`, which returned the initial revision 0
state, and `restart_comms_relay` with `{"expected_revision": 0}`, which returned
revision 1 with a ready communications relay and a nominal signal. The visible
page reflected the same state while launch remained locked. The experience was
then restarted and returned to revision 0 with seven tools.

This establishes native inventory and one read-only plus one state-changing
tool invocation in the named Chrome build. It does not establish model-driven
tool selection or compatibility with every browser or agent.
