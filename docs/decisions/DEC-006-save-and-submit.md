# DEC-006: "Save & Submit" on the Create screen is kept, as Draft then Submit in one transaction

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** user (chose to keep the one-click action)
- **SRS refs:** 7.5, 7.6, FR-09, FR-10, BR-05, UC-03, UC-04
- **Data model refs:** D-15
- **Work items:** WI-05, WI-08

## Context

BR-05 says Save (Draft) and Submit are distinct actions, and UC-04 requires the indent to exist in Draft before submitting. The MVP's Create screen has "Save Draft" and "Save & Submit".

## Decision

1. The Create screen offers two buttons: **Save Draft** and **Save & Submit**. The detail screen offers **Submit** for a Draft.
2. `POST /api/indents` always creates the indent in `DRAFT`. It accepts an optional `submit: true` flag. When it is set, the service performs create-as-Draft and submit **in the same DB transaction**; the indent is never visible as Draft if submission fails (the whole thing rolls back).
3. Two history rows are written: `-> DRAFT` and `DRAFT -> SUBMITTED`. The number is assigned once (DEC-010).
4. Confirmation (FR-21): "Save & Submit" shows the **Submit** confirmation text and mentions that it will be sent for approval.
5. The permission check requires both `indent.create` and `indent.submit`.
6. Recorded as a deliberate deviation from the strict reading of UC-04 in [`srs-errata.md`](../srs/srs-errata.md) (E-06): the Draft state still exists in the data, so BR-05 holds.

## Alternatives considered

- Remove the combined button: matches UC-04 literally, but costs users a click and a page change.

## Consequences

One extra branch in the create service and one extra test case.

## Revisit if

The company confirms that submission must always be a separate user action after viewing the saved Draft.
