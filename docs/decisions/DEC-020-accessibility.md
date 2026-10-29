# DEC-020: Accessibility target WCAG 2.2 AA

- **Status:** Provisional (SRS NFR-03: standard TBD)
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** NFR-03, 23
- **Review refs:** section 2 NFR-03, feature 12
- **Work items:** WI-07, WI-08

## Context

Labels are not bound to fields, clickable cells use `onClick` on `<td>`, and `ConfirmDialog` has no dialog role, focus trap or Esc handling.

## Decision

Target **WCAG 2.2 Level AA**, applied from the start. Concretely:

1. Every control has a programmatic label (`htmlFor`/`id` or `aria-label`); required fields are marked with text, not colour alone; errors are linked with `aria-describedby` and announced via `aria-live="polite"`.
2. List rows are real links (`<Link>` in the Indent Number cell, with the row also clickable as a convenience); all actions are reachable by keyboard; visible focus ring; no focus obscured by sticky headers.
3. Dialogs: `role="dialog"` / `"alertdialog"`, `aria-modal`, labelled title, focus moves in and is trapped, Esc closes (except while a save is in progress), focus returns to the trigger.
4. Colour contrast >= 4.5:1 for text and >= 3:1 for UI components; status is never shown by colour alone (the badge has text).
5. Target size >= 24x24 CSS px.
6. Tables have `<th scope>` and a caption or `aria-label`. Pagination uses `nav` with `aria-label` and `aria-current="page"`.
7. Respect `prefers-reduced-motion`.
8. Verified by an automated check (axe via Playwright) on the three pages, plus a manual keyboard pass in WI-12.

## Revisit if

The company names a different standard.
