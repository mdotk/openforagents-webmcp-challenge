# Qualification status

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
- The complete manual fallback and human-only launch.
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
