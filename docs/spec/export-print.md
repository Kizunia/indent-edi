# Export and print

Decisions: [DEC-018](../decisions/DEC-018-excel-export.md), [DEC-026](../decisions/DEC-026-print.md). Layout is **PROVISIONAL** (SRS 11.2: company format TBD).

## 1. Excel export

**Request:** `POST /api/indents/export` ([api.md](api.md)) with selected `indentNumbers`, or `mode: "filtered"` + the list filters. Requires `indent.export`; rows are limited to the user's view scope; soft-deleted indents are excluded.

**File:** `indents-YYYYMMDD-HHmm.xlsx` (time in `APP_TIMEZONE`). One sheet, `Indents`. One row **per line**; the indent columns repeat on each row. Header row bold, frozen, with auto-filter. Sorted `indent_date DESC, id DESC`, then `line_number`.

| # | Column | Source | Cell type |
|---|---|---|---|
| 1 | Indent Number | `indent_number` | text |
| 2 | Indent Type | type name | text |
| 3 | Date | `indent_date` | date |
| 4 | Time | `indent_time` | time |
| 5 | Department (header) | header department name | text |
| 6 | Created By | `created_by_name` | text |
| 7 | Remark | `remark` | text |
| 8 | Status | status name | text |
| 9 | Line No. | `line_number` | number |
| 10 | Item Code | `item_code_snapshot` | text |
| 11 | Item Name | `item_name_snapshot` | text |
| 12 | Specification | `specification_snapshot` | text |
| 13 | Drawing Number | `drawing_number_snapshot` | text |
| 14 | Department (line) | line department name | text |
| 15 | Purpose | `purpose` | text |
| 16 | Current Stock | `current_stock_snapshot` | number, empty when not available |
| 17 | Stock Checked At | `stock_checked_at` | date-time |
| 18 | Required Quantity | `required_quantity` | number (4 dp) |
| 19 | Unit | unit name/symbol | text |
| 20 | Required Date | `required_date` | date |

This covers every field in SRS 11.2 (Indent Information and Item Information).

**Rules**
- Read in batches of about 500 indents by id cursor and stream rows to the writer (no full in-memory array).
- Text cells starting with `=`, `+`, `-` or `@` are prefixed with `'` to prevent formula injection.
- Decimals are written as numbers from the Decimal value, not floats from strings parsed loosely.
- Failure: the stream is aborted and the client shows the `EXPORT_FAILED` dialog; no partial file is offered.
- Export never needs a confirmation dialog.

## 2. Print

- Print button on the detail page calls `window.print()` (`indent.print`).
- `@media print`: hide side nav, header bar controls, buttons, filters, dialogs and toasts; white background, black text; full width; no horizontal scrolling containers.
- **Print header block** (visible only in print): system name, **Indent Number**, status, indent date and time, Created By, Department, and "Printed on <date time in APP_TIMEZONE> by <user name>".
- The line table prints all columns of SRS 8.2: Item Code, Item Name, Specification, Drawing Number, Department, Purpose, Current Stock, Required Quantity, Unit, Required Date.
- Table header repeats on each page; rows do not split across pages.
- A company template, when supplied, replaces the header block and layout only.
