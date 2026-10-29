# DEC-009: Duplicate items in one indent are blocked

- **Status:** Provisional (SRS 8.6 / BR-09 TBD)
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** 8.6, 15.2, BR-09
- **Data model refs:** D-24
- **Review refs:** #20 (feature 20)
- **Work items:** WI-05, WI-08

## Context

The company has not said whether the same item may appear twice in one indent (prevent, combine, or allow). The MVP allows it silently.

## Decision

1. A second line with the same `item_id` in the same indent is rejected: `DUPLICATE_ITEM` ("This item is already in the indent. Edit its quantity instead.").
2. It is enforced in the service for both create and add-line, and in the UI before the user submits (the Add Item button shows the same message).
3. Controlled by one config flag, `ALLOW_DUPLICATE_ITEMS` (default `false`) in the app config module. The service rule is the only place that reads it.
4. A DB unique key `UNIQUE(indent_id, item_id)` is **not** required for this to work; it is an optional hardening request in [`db-handoff.md`](../data-model/db-handoff.md) (D-24 says it is safe because lines are hard-deleted).

## Alternatives considered

- Allow with a warning: weakens data quality and makes totals ambiguous.
- Merge quantities: needs unit conversion rules that are not defined.

## Consequences

If the company later says "allow", set the flag; no migration needed.

## Revisit if

Company answers BR-09.
