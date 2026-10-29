# DEC-008: Delete rules

- **Status:** Accepted (role restrictions follow DEC-004 and stay provisional)
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** 7.8, 8.11, FR-08, FR-17, FR-18, FR-21, BR-01, BR-07
- **Data model refs:** D-10, D-17, D-19, D-23
- **Review refs:** #3, section 2 FR-17, FR-18
- **Work items:** WI-04, WI-05, WI-08

## Context

The MVP hard-deletes indents, shows the list-page Delete button for every status, and lets the API delete lines from Submitted indents.

## Decision

1. **Delete indent:** only for a Draft (`is_editable` status), only if `can(user, "indent.delete", indent)`. It is a **soft delete**: sets `deleted_at` and `deleted_by_user_id`, bumps `version`, and a Prisma client extension hides deleted rows from every query (D-17). The indent number is never reused. Deleted indents never appear in list, search, filter options, export or the detail page (404).
2. **Delete line:** only on a Draft, under the optimistic lock; the line row is physically deleted (D-17). The service rejects deleting the last line (`INDENT_EMPTY`, D-23, FR-08).
3. The UI shows Delete only when the server says it is allowed (the same rule on the list page and the detail page).
4. Both deletions require the confirmation "Are you sure you want to delete this Indent/Item?" (FR-21, 12.2).
5. Deleting a Submitted indent is not possible in this module.

## Alternatives considered

- Hard delete: no audit, number gaps unexplained.
- Admin may delete a Submitted indent: no company support; and the approval team may already hold it.

## Consequences

Admin recovery of a soft-deleted indent is a DB operation; there is no undelete UI.

## Revisit if

The company asks for undelete, delete of Submitted indents, or an audit of removed lines (D-17 suggests an audit table).
