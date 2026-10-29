# DEC-007: Edit rules for indents and lines

- **Status:** Provisional (SRS 7.10, 8.10, BR-11, BR-12 are TBD); Remark rule supersedes D-20
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** 7.5, 7.7, 7.10, 8.10, 8.11, FR-16, FR-17, BR-06, BR-11, BR-12
- **Data model refs:** D-14, D-19, D-20 (superseded for Remark only), D-21, D-22, D-23
- **Review refs:** section 2 FR-16, FR-17
- **Work items:** WI-05, WI-06, WI-08

## Context

SRS 7.5 says a Draft "can be edited", while 7.7 / BR-06 say Indent-level attributes are immutable after creation. 8.10 lists possibly editable item fields but says not to treat the list as final. The DB owner's D-20 froze Remark too.

## Decision

Editability is decided by the status (`is_editable`, DEC-005) and by the field. In **Draft**:

| Scope | Field | Editable? |
|---|---|---|
| Indent | Indent Number, Type, Date, Time, Header Department, Created By, Status | No (immutable, BR-06) |
| Indent | Remark | **Yes** (supersedes D-20; no schema change) |
| Line | Item (item_id), Item Code / Name / Specification / Drawing Number snapshots | No. To change the item, remove the line and add another (D-21) |
| Line | Purpose, Required Quantity, Required Date, Unit, Line Department | Yes |
| Line | Add a line / remove a line | Yes (not the last line, FR-08) |

In **Submitted** (and any non-editable status): everything is read-only in this module (FR-16 and 7.10 are satisfied by "nothing is editable yet"). Delete is also blocked (DEC-008).

Implementation rules:
- The update DTO contains only the editable fields above; anything else is rejected with `VALIDATION_FAILED` (not silently ignored).
- Every edit goes through the optimistic lock (DEC-016) and checks `can(user, "indent.edit", indent)` and the status rule.
- Editing prompts the "Are you sure you want to update this Indent?" confirmation (FR-21).
- The Remark override is a service-level rule only; it is logged in [`db-handoff.md`](../data-model/db-handoff.md) so the DB owner knows.

## Alternatives considered

- Freeze Remark as D-20 says: a typo in a note forces deleting the Draft.
- Allow some edits after Submit: not confirmed by the company.

## Consequences

The editable-field list is a single constant in the domain layer, so a company answer changes one list and one doc table.

## Revisit if

The company answers 7.10 / 8.10 (post-submit edits, extra editable fields), or says Remark must be frozen (then revert to D-20).
