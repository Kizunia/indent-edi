# Decision records

One file per decision, in the format of [`_template.md`](_template.md). Decisions are never rewritten: to change one, add a new DEC and mark the old one `Superseded by DEC-XXX` here and in its file.

**Status legend:** `Accepted` = decided, does not depend on a company answer. `Provisional` = a safe default chosen while the SRS item is TBD; listed in [open-questions.md](../open-questions.md). `Superseded` = replaced.

| ID | Decision | Status | SRS refs | Work items |
|---|---|---|---|---|
| [DEC-001](DEC-001-docs-first-living-docs.md) | Docs first; docs stay live; precedence order | Accepted | all | all |
| [DEC-002](DEC-002-persistence-prisma-mysql.md) | Prisma + MySQL behind repositories; JSON store removed | Accepted | NFR-08, NFR-10 | WI-04 |
| [DEC-003](DEC-003-auth-provider-seam.md) | `getCurrentUser()` + pluggable AuthProvider + dev switcher | Accepted (prod mechanism TBD) | 1.4, 2.5, FR-01, NFR-09 | WI-03 |
| [DEC-004](DEC-004-permission-matrix.md) | Config-driven role x action matrix, deny by default | Provisional | 6, 6.1, BR-08 | WI-03, WI-06 |
| [DEC-005](DEC-005-status-model-and-transitions.md) | Status master; server-only DRAFT -> SUBMITTED | Accepted / later statuses Provisional | 7.9, FR-10, BR-05 | WI-05 |
| [DEC-006](DEC-006-save-and-submit.md) | Keep "Save & Submit" as Draft + Submit in one transaction | Accepted | BR-05, UC-04 | WI-05, WI-08 |
| [DEC-007](DEC-007-edit-rules.md) | Editable fields per status; Remark editable in Draft | Provisional | 7.5, 7.7, 7.10, 8.10, BR-06 | WI-05, WI-08 |
| [DEC-008](DEC-008-delete-rules.md) | Soft delete indent (Draft only); hard delete line | Accepted | FR-17, FR-18, 8.11 | WI-04, WI-05 |
| [DEC-009](DEC-009-duplicate-items.md) | Block duplicate items (config flag) | Provisional | 8.6, BR-09 | WI-05 |
| [DEC-010](DEC-010-number-generation-and-preview.md) | Number assigned on save; preview on Create | Accepted / formats Provisional | 7.2, 8.4, FR-02, UC-01 | WI-04, WI-08 |
| [DEC-011](DEC-011-indent-search.md) | Search: exact first, then partial | Provisional | 10.2, BR-13 | WI-04, WI-07 |
| [DEC-012](DEC-012-remove-item-before-save.md) | Allow removal before first save | Provisional | 8.8, BR-10 | WI-08 |
| [DEC-013](DEC-013-stock-freshness.md) | Re-check stock at Save/Submit; "Not available"; no blocking | Provisional | 9.4, 9.6, BR-04, BR-14 | WI-04, WI-09 |
| [DEC-014](DEC-014-validation.md) | Shared Zod schemas; server authoritative; no invented limits | Accepted | 12.1 | WI-02, WI-06 |
| [DEC-015](DEC-015-error-handling.md) | Error envelope, safe messages, single ErrorDialog | Accepted | 12.3, FR-22 | WI-02, WI-06, WI-08 |
| [DEC-016](DEC-016-optimistic-locking.md) | Optimistic locking on `version` | Accepted | NFR-10 | WI-04, WI-05 |
| [DEC-017](DEC-017-rendering-ssr.md) | Server Components, URL-param filters, REST mutations | Accepted | NFR-04 | WI-07 |
| [DEC-018](DEC-018-excel-export.md) | exceljs streaming export; select all matching | Accepted / layout Provisional | 11.1, 11.2, FR-19 | WI-10 |
| [DEC-019](DEC-019-ui-system.md) | Tailwind, shared components, expandable rows | Accepted | NFR-01, 02, 07 | WI-08 |
| [DEC-020](DEC-020-accessibility.md) | WCAG 2.2 AA target | Provisional | NFR-03 | WI-07, WI-08 |
| [DEC-021](DEC-021-business-date-time.md) | Server-assigned date/time in `APP_TIMEZONE` (Asia/Kolkata) | Accepted / timezone Provisional | FR-03, 7.1 | WI-02, WI-04 |
| [DEC-022](DEC-022-department-handling.md) | Header department defaults to lines; filter header OR line | Provisional | 7.4, 8.2, FR-13 | WI-04, WI-07 |
| [DEC-023](DEC-023-tooling-npm-docker.md) | npm only; Docker Compose MySQL dev + test | Accepted | n/a | WI-01 |
| [DEC-024](DEC-024-testing-ci.md) | Vitest + MySQL integration + Playwright + CI | Accepted | n/a | WI-01, WI-12 |
| [DEC-025](DEC-025-new-items-and-item-picker.md) | New items created in the save transaction; picker rules | Accepted | 8.3-8.5, FR-06 | WI-04, WI-08 |
| [DEC-026](DEC-026-print.md) | Whole-page print + header block | Accepted / template Provisional | 11.3, FR-20 | WI-11 |

Overrides of the DB owner's decisions: **D-20 (Remark frozen) is superseded for Remark by DEC-007.** Tracked in [db-handoff.md](../data-model/db-handoff.md).
