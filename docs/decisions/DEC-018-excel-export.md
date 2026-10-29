# DEC-018: Excel export with exceljs, streamed, with select-all-matching

- **Status:** Accepted (layout Provisional: SRS 11.2 says the company layout is TBD)
- **Date:** 2026-10-29
- **Decided by:** team default / user (replace `xlsx`)
- **SRS refs:** 11.1, 11.2, FR-19, UC-07, 12.3
- **Data model refs:** D-06, D-25, section 6.7
- **Review refs:** #4, #12, section 2 FR-19
- **Work items:** WI-10

## Context

The export route loads everything with `pageSize: 100000`, builds one JSON array and writes it with `xlsx@0.18.5` (known advisories). "Select all" only selects the current page, and the filename is always the same.

## Decision

1. Library: **`exceljs`** streaming writer (`WorkbookWriter`). Remove `xlsx`.
2. `POST /api/indents/export` accepts one of: `{ indentNumbers: [...] }` (one or many selected), or `{ mode: "filtered", filters }` (all matching the current list filters and the user's view scope). "Export all" with no filters is `mode: "filtered"` with empty filters. It requires `indent.export` and applies the view scope (DEC-004). Soft-deleted indents are never included.
3. Rows are read in batches of about 500 by `id` cursor (D-29, section 6.7) and written to the stream. The response is streamed with `Content-Disposition: attachment; filename="indents-YYYYMMDD-HHmm.xlsx"` (time in `APP_TIMEZONE`).
4. Layout (**PROVISIONAL**, see [export-print.md](../spec/export-print.md)): one sheet, one row per line, indent columns repeated, covering every field in SRS 11.2. Header row is frozen and bold. Quantities are numeric cells, dates are real date cells, text cells are escaped against formula injection (values starting with `=`, `+`, `-`, `@` are prefixed with `'`).
5. "Current Stock" in the export is the line snapshot, plus a "Stock checked at" column (D-25).
6. A hard cap is not invented. A very large export still streams; if it fails the client shows the `EXPORT_FAILED` dialog.
7. The list page's "Select all" has two choices: select this page, or "select all N matching" (sends `mode: filtered`).

## Alternatives considered

- Keep `xlsx` from npm: unpatched advisories.
- CSV: SRS asks for Excel.

## Revisit if

The company supplies an Excel template.
