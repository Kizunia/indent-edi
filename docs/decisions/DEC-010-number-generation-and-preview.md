# DEC-010: Indent number and item code generation; number preview on Create

- **Status:** Accepted (mechanism); Provisional (formats, SRS 7.2 / 8.4 TBD)
- **Date:** 2026-10-29
- **Decided by:** user (preview only, assign on save)
- **SRS refs:** 7.2, 8.4, FR-02, FR-06, BR-02, BR-03, UC-01 step 2
- **Data model refs:** D-11, D-12, D-13, D-27
- **Review refs:** section 2 FR-02, FR-06
- **Work items:** WI-04, WI-08

## Context

FR-02 requires a unique read-only number. UC-01 step 2 says the system generates it when Create opens, but D-13 notes a number cannot be both gap-free and handed out before the user commits. The user wants to see a number on the form.

## Decision

1. **Preview:** when the Create screen opens, the server returns `expectedNumber`, computed as `number_sequence.INDENT.last_value + 1` formatted with the configured format. It does **not** increment the counter and reserves nothing. It is shown read-only with the label "Expected number" and helper text "Final number is confirmed when you save."
2. **Assignment:** the real number is assigned inside the save transaction from `number_sequence` using `UPDATE ... SET last_value = last_value + 1` as the last step before the header insert (D-12). Numbers are gap-free.
3. If the assigned number differs from the previewed one (another user saved first), the success dialog shows the final number prominently and says it differs. The number in the confirmation and in the URL is always the real one.
4. **Format** comes from config (`INDENT_NUMBER_PREFIX`, `INDENT_NUMBER_PAD`; **PROVISIONAL** default `IND-` + 6 digits, e.g. `IND-000124`) and may be changed without a migration. `PURC000123` in the SRS is only an example. A per-year or per-type scope is possible later using a scope key like `INDENT:2026` (D-12).
5. **Item code:** same mechanism with scope `ITEM`, **PROVISIONAL** `ITM-` + 6 digits, assigned inside the indent save transaction (DEC-025). There is no preview for item codes: a new item row shows "Assigned on save".
6. On `P2002` for the unique number, retry the transaction once (D-12).

## Alternatives considered

- Reserve on open: matches UC-01 literally but burns numbers on abandoned forms.
- Save an empty Draft on open: breaks BR-01.

## Consequences

An extra read endpoint (`GET /api/indents/next-number`). The preview can be wrong under concurrency; that is communicated in the UI. Recorded as a deviation from UC-01 step 2 in [`srs-errata.md`](../srs/srs-errata.md) (E-01).

## Revisit if

The company supplies the real formats or insists on reserved numbers (then increment in a short separate transaction and accept gaps, per D-13).
