# Open for Agents WebMCP Challenge

Open for Agents WebMCP Challenge is a deterministic, client-only mission-control
experience created by Enoki Limited for the WebMCP challenge. Matt Gibbs
represents Enoki Limited for the entry. The repository uses this neutral,
descriptive title because a final creative name has not been chosen.

[Try the live experience](https://openforagents-webmcp-challenge.vercel.app/) ·
[Read about the WebMCP Challenge](https://openai.com/webmcp-challenge/)

The experience demonstrates how a page can keep consequential actions under
human control while exposing limited tools through WebMCP. It is a simulation:
there is no real spacecraft, backend, model, credential, account or external
data source behind it.

## How the experience works

1. Read-only diagnostic tools report the simulation's current state. They do
   not change that state.
2. A person reviews a specific repair and explicitly approves or declines it.
3. Approval creates an exact, one-use repair tool. It permits only the approved
   repair, not a general command or a different amount.
4. The repair tool disappears after it is used once or when the person revokes
   the approval.
5. The final launch control is available only to the person using the page. It
   is never exposed as a WebMCP tool.

All state and responses are local and deterministic. Repeating the same flow
from the same starting state produces the same simulated result. When the
required WebMCP browser API is unavailable, visible manual controls provide a
fallback path through the experience without pretending that tools were
registered with the browser.

## Run locally

The project requires a current Node.js release with `npm`.

```sh
npm ci
npm run dev
```

Vite prints the local URL. Open that URL in a browser to use the experience.

## Test and build

Run the automated tests once:

```sh
npm run test:run
```

Run lint, the automated tests and the production build together:

```sh
npm run check
```

The individual lint and build commands are also available as `npm run lint`
and `npm run build`.

To inspect the production build locally:

```sh
npm run preview
```

## Browser qualification

The WebMCP path requires a browser build that exposes the page-level WebMCP API
used by this project. In other browsers, the manual fallback remains available,
but that does not qualify native WebMCP registration or execution.

Qualification in one supporting browser build establishes only the behavior
observed in that build. It is not a claim of compatibility with every browser,
browser version, operating system, agent or future WebMCP specification.
Automated tests run in jsdom and do not by themselves qualify native WebMCP in
a browser. Manual qualification should cover the diagnostic, approval, one-use
repair, revocation, fallback and human-only launch paths.

See [docs/qualification.md](docs/qualification.md) for the current test scope
and [docs/submission-draft.md](docs/submission-draft.md) for the prepared entry
description.

## Project status and provenance

This is standalone code created during the challenge period. It is not a copy,
release or renamed edition of another Open for Agents product. The related
[challenge chronology](docs/challenge-chronology.md) records the limited public
provenance and current submission status without claiming reuse or results that
have not occurred.

## Licence

The project source is copyright (C) 2026 Enoki Limited and is available under
the GNU General Public License, version 2 or (at your option) any later version
(`GPL-2.0-or-later`). See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change and
[SECURITY.md](SECURITY.md) for private vulnerability-reporting guidance.
