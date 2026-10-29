# DEC-012: Items can be removed from the Current Item List before the first save

- **Status:** Provisional (SRS 8.8 / BR-10 TBD)
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** 8.7, 8.8, 8.9, FR-08, BR-01, BR-10
- **Work items:** WI-08

## Context

Whether a user can remove a line from the in-progress list before saving is unconfirmed.

## Decision

1. Before the first save, the list is client-only state. Each row has a Remove action. No server call is made and no confirmation is needed (nothing is persisted), but removing is keyboard accessible.
2. FR-08 / BR-01 is still enforced at Save: zero lines shows the error dialog "An Indent cannot be saved without at least one Item." and the server rejects it too (`INDENT_EMPTY`).
3. After the first save, removal is a Draft-only persisted delete under DEC-008 (with confirmation, and never the last line).

## Alternatives considered

- Disallow removal: the user must discard the whole form to fix one mistake.

## Revisit if

Company answers BR-10.
