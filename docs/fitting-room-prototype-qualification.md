# Shared Fitting Room prototype qualification

This page records evidence for the separate fitting-room prototype. It does
not replace the qualification record for Launch Window A-01 or claim that the
prototype is the current challenge entry.

## Implemented slice

The prototype is selected with `?experience=fitting-room`. The root URL still
opens Launch Window A-01.

The browser-local implementation contains:

- A saved occasion brief and six fictional products with structured prices,
  sizes, movement ratings and Friday quantities.
- One revisioned fitting room shared by the visible page and seven WebMCP
  tools.
- A person-controlled item pin that an agent cannot remove.
- A deterministic availability change that makes the first revised look
  invalid until a substitute is chosen.
- An exact review for four products, a $242 subtotal, Friday pickup and a
  15-minute simulated hold.
- One temporary `reserve_approved_look` tool created only after the person
  approves that review.
- One simulated hold with reference `FF-DEMO-001`, no charge and no checkout,
  payment or order tool.

## Automated checks

`npm run check` passes lint, 33 deterministic tests and the production
TypeScript/Vite build.

The fitting-room tests cover:

- Structured product search and immutable snapshots.
- Revision conflicts and protection for a person-pinned item.
- Availability invalidation and substitution.
- Exact review scope and invalidation after a change.
- One-use hold creation, replay rejection, revocation and expiry.
- Seven permanent closed-schema tools and the absence of checkout, payment and
  order tools.
- Cancellation before a state-changing commit.
- Temporary-tool registration, use, removal and disposal.
- The visible manual journey and fallback when native WebMCP is unavailable.

## Chrome observation — 26 August 2026

The local production experience was checked in the user's existing Chrome
session.

Chrome exposed seven native tools at revision 0. The visible journey then:

1. Built a first three-item look.
2. Pinned the vest as a human decision.
3. Revised the look to an all-black four-item combination without removing the
   pinned vest.
4. Applied the deterministic inventory change, which reduced the selected
   organza sleeves to zero Friday quantity and removed the review action.
5. Substituted the available bell-sleeve shrug and produced a valid $242 look.
6. Created an exact human review without creating a hold.
7. Approved that review, after which Chrome reported eight native tools.
8. Used the approved hold once, creating `FF-DEMO-001` and returning the native
   inventory to seven tools.

The prototype produced no console warnings or errors. The page had no
horizontal overflow at desktop, 390 px or 320 px, and the controls remained
available at both mobile widths.

This check establishes native registration and the visible 7 to 8 to 7
lifecycle in the named local browser session. It does not yet establish
deployed discovery, independent tool execution by a model, compatibility with
every browser or agent, or readiness to replace the current entry.
