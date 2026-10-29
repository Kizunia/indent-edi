# Open questions for the company

The SRS (section 24) lists items that must be confirmed. Each row shows what the app does **until** they answer. When an answer arrives: update the row to `Answered`, change the DEC (new DEC superseding the old one if the behaviour changes), and edit the matching `spec/` file.

Status: `Open` / `Answered`. "Needs migration" is from the DB owner's section 9 in [final-data-model.md](data-model/final-data-model.md).

| # | Question (SRS ref) | Status | Current provisional behaviour | Decision | Migration if answered otherwise |
|---|---|---|---|---|---|
| 1 | Indent Number format (7.2) | Open | `IND-` + 6 digits, config | [DEC-010](decisions/DEC-010-number-generation-and-preview.md) | No |
| 2 | Item Code format (8.4) | Open | `ITM-` + 6 digits, config | [DEC-010](decisions/DEC-010-number-generation-and-preview.md) | No |
| 3 | Exact Indent Types; who can create them (7.3) | Open | Read from `indent_type_master`; no creation UI | [DEC-002](decisions/DEC-002-persistence-prisma-mysql.md) | No |
| 4 | Department Master source (7.4, 14) | Open | `department_master` rows from the DB owner | [DEC-022](decisions/DEC-022-department-handling.md) | No |
| 5 | Is the header Department mandatory? (7.4, 8.2) | Open | Required by the app form; DB column nullable | [DEC-022](decisions/DEC-022-department-handling.md) | Yes: make `department_id NOT NULL` if yes |
| 6 | User roles (2.3, 6) | Open | Five listed roles, config-driven | [DEC-004](decisions/DEC-004-permission-matrix.md) | No |
| 7 | Permission matrix (6.1, NFR-09) | Open | Provisional matrix in [permissions.md](spec/permissions.md) | [DEC-004](decisions/DEC-004-permission-matrix.md) | No |
| 8 | Same item multiple times in one indent (8.6, BR-09) | Open | Blocked | [DEC-009](decisions/DEC-009-duplicate-items.md) | Optional `UNIQUE(indent_id,item_id)` |
| 9 | Remove an item before saving (8.8, BR-10) | Open | Allowed | [DEC-012](decisions/DEC-012-remove-item-before-save.md) | No |
| 10 | Editable item fields (8.10, BR-11) | Open | Purpose, Qty, Required Date, Unit, Line Dept (Draft) | [DEC-007](decisions/DEC-007-edit-rules.md) | No |
| 11 | Search behaviour (10.2, BR-13) | Open | Exact first, then partial | [DEC-011](decisions/DEC-011-indent-search.md) | No |
| 12 | Statuses displayed (7.9) | Open | DRAFT, SUBMITTED only; others from approval data | [DEC-005](decisions/DEC-005-status-model-and-transitions.md) | No |
| 13 | Fields editable after submission (7.10, BR-12) | Open | None (read-only) | [DEC-007](decisions/DEC-007-edit-rules.md) | No |
| 14 | Stock-change warning required? (9.6, BR-14) | Open | Shown, non-blocking | [DEC-013](decisions/DEC-013-stock-freshness.md) | No |
| 15 | Approval-system integration / status contract (4.2, 14) | Open | Not built; `source=APPROVAL` path reserved | [DEC-005](decisions/DEC-005-status-model-and-transitions.md) | Maybe: `approval_status_code` (D-14) |
| 16 | Recreate vs integrate the Item Master (8.5, 14) | Open | Recreated in the app DB | [DEC-025](decisions/DEC-025-new-items-and-item-picker.md) | No |
| 17 | Accessibility standard (NFR-03) | Open | WCAG 2.2 AA | [DEC-020](decisions/DEC-020-accessibility.md) | No |
| 18 | Company print format (11.3) | Open | Generic header block | [DEC-026](decisions/DEC-026-print.md) | No |
| 19 | Company Excel format (11.2) | Open | One sheet, one row per line | [DEC-018](decisions/DEC-018-excel-export.md) | No |
| 20 | Additional validation limits (12.1) | Open | None invented | [DEC-014](decisions/DEC-014-validation.md) | No |
| 21 | Company timezone for business date/time (D-04) | Open | `Asia/Kolkata` | [DEC-021](decisions/DEC-021-business-date-time.md) | No |
| 22 | Auth integration mechanism and user-id format/length (2.5, 14, D-18) | Open | Pluggable provider; id = string up to 64 | [DEC-003](decisions/DEC-003-auth-provider-seam.md) | No |
| 23 | Is `stock_balance` ours, or is a company Inventory DB available? (9.2, D-25) | Open | Read `stock_balance` via `StockProvider` | [DEC-013](decisions/DEC-013-stock-freshness.md) | No |
| 24 | Excel "Current Stock": snapshot or live? (11.2) | Open | Line snapshot + checked-at | [DEC-018](decisions/DEC-018-excel-export.md) | No |
| 25 | Should "Save & Submit" be allowed, or must Submit always follow a saved Draft? (UC-04, BR-05) | Open | Allowed | [DEC-006](decisions/DEC-006-save-and-submit.md) | No |
| 26 | Must the Indent Number be reserved when the form opens (UC-01 step 2)? | Open | Preview only | [DEC-010](decisions/DEC-010-number-generation-and-preview.md) | No |
| 27 | May Remark be edited in Draft? (7.5 vs 7.7) | Open | Yes | [DEC-007](decisions/DEC-007-edit-rules.md) | No |
