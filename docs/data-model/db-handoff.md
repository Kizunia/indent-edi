# App -> DB owner handoff

The data model ([final-data-model.md](final-data-model.md)) and `client/prisma/` belong to the DB teammate. The app does not change them. This file is how the app side asks for things and records where it deliberately differs. The DB owner should check it before changing the schema.

Status: `Open` / `Agreed` / `Done`.

## A. Requests to the DB owner

| # | Request | Why | Status |
|---|---|---|---|
| H-01 | Provide **seed data** for dev/test: departments, indent types, units, items, `stock_balance`, plus the `DRAFT`/`SUBMITTED` statuses (already in migration 0001) and `number_sequence` rows. Label sample data clearly as SAMPLE. The SRS says Indent Types and Departments must not be invented. | The app's integration tests, E2E and demo need masters. WI-04 is blocked without it. | Open |
| H-08 | The dev auth users (`client/lib/server/auth/dev-users.ts`) reference `department_master` ids **1 and 2**. Tell the app side the real ids in the seed so the fixtures match (or keep ids 1 and 2 for the first two departments). | [DEC-003](../decisions/DEC-003-auth-provider-seam.md), WI-03 | Open |
| H-02 | Confirm the migration `0001_init` applies cleanly on MySQL 8.0 (Docker, `utf8mb4_0900_ai_ci`). The data-model doc says it was not run against a live server. | [DEC-023](../decisions/DEC-023-tooling-npm-docker.md), WI-01 | Open |
| H-03 | **Optional:** add `UNIQUE(indent_id, item_id)` on `indent_item` to harden the duplicate rule. The app enforces it in the service anyway. | [DEC-009](../decisions/DEC-009-duplicate-items.md), D-24 | Open (optional) |
| H-04 | Confirm that reading `number_sequence.last_value` (no write) is acceptable for the number preview. | [DEC-010](../decisions/DEC-010-number-generation-and-preview.md) | Open |
| H-05 | Confirm that `stock_balance.updated_at` is maintained by whoever writes stock (it has no `@updatedAt`) so the app can detect changes. | [DEC-013](../decisions/DEC-013-stock-freshness.md), D-25 | Open |
| H-06 | Confirm company timezone `Asia/Kolkata` for `indent_date` / `indent_time` (D-04, open question 21). | [DEC-021](../decisions/DEC-021-business-date-time.md) | Open |
| H-07 | The `client/prisma/README.md` link to the decision log now points to `docs/data-model/final-data-model.md`. Keep that path stable. | docs reorganisation | Done |

## B. Where the app differs from the data model (service-level only, no schema change)

| # | Data-model item | App behaviour | Decision |
|---|---|---|---|
| X-01 | D-20: Remark is frozen after the first save. | **Remark is editable while the indent is a Draft.** All other header fields stay immutable. No schema change. Draft edits bump `version` and `updated_by_user_id`. | [DEC-007](../decisions/DEC-007-edit-rules.md) |
| X-02 | D-13: number shown "Assigned on save". | The Create screen also shows a read-only **expected** number (a preview computed from `last_value + 1`). The real number is still assigned on save. | [DEC-010](../decisions/DEC-010-number-generation-and-preview.md) |
| X-03 | D-16: header department nullable. | The app form requires a header department for now. | [DEC-022](../decisions/DEC-022-department-handling.md) |
| X-04 | D-24: duplicates allowed by the schema. | The service blocks duplicates (config flag). | [DEC-009](../decisions/DEC-009-duplicate-items.md) |
| X-05 | D-25: stock row may be absent for new items. | The app shows "Not available" and stores `current_stock_snapshot = NULL`, never 0. | [DEC-013](../decisions/DEC-013-stock-freshness.md) |

## C. What the app relies on (do not change without telling the app side)

- Table and column names/mappings in `schema.prisma`, integer ids, `DECIMAL(18,4)` quantities.
- `indent_status_master.code` values `DRAFT` and `SUBMITTED`, and `is_editable`.
- `number_sequence` scopes `INDENT` and `ITEM` seeded in the migration.
- `indent_status_history.source` values `APP`, `APPROVAL`, `SYSTEM`.
- Unique keys on `indent_number`, `item_code`, and master `code`s.
- `onDelete: Cascade` from indent to lines and history; `Restrict` elsewhere.
