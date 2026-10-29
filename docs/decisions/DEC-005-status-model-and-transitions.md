# DEC-005: Status model and server-owned transitions

- **Status:** Accepted for DRAFT/SUBMITTED; later statuses Provisional (approval team's contract is TBD)
- **Date:** 2026-10-29
- **Decided by:** user / DB teammate (D-14)
- **SRS refs:** 4.2, 7.6, 7.9, FR-10, FR-13, BR-05, 18.4
- **Data model refs:** D-08, D-14, D-15
- **Review refs:** #3, section 4 (status row)
- **Work items:** WI-05, WI-06

## Context

The MVP lets the client send any `status` string on create and update, and has a hard-coded status list. The SRS says the status values come from the approval team (7.9).

## Decision

1. Statuses are rows in `indent_status_master` (D-08, D-14). The app only hard-codes the two codes it owns: `DRAFT` and `SUBMITTED`.
2. **Clients never send `status`.** Create and update DTOs have no status field. The only app-driven transition is **DRAFT -> SUBMITTED**, via `POST /api/indents/{indentNumber}/submit`. Status changes made by the approval team arrive through a separate server path (`source = APPROVAL`) outside this module's UI; it is not built now.
3. Every transition inserts an `indent_status_history` row (`source = APP`, who, when) in the same transaction, and sets `submitted_at` / `submitted_by_user_id` on submit.
4. The status filter options, badge labels and colours come from the status master. Unknown future statuses render with a neutral badge.
5. Whether an indent can be edited is `status.is_editable` (D-14), not a hard-coded comparison. Today only `DRAFT` has it set. See DEC-007.

## Alternatives considered

- Keep the string union in `types.ts`: breaks when the approval team adds statuses.
- Let the client request a status: the API would be open to any transition.

## Consequences

`StatusBadge`, the list filter and export read the master. Transition rules live in one function in the domain layer.

## Revisit if

The approval team keeps its own status and sends only events (add `approval_status_code`, see D-14).
