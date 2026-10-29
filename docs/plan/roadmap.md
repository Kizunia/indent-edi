# Roadmap and work-item status

This file is the **only** place that tracks progress. Update the status in the same change that does the work. Work items are done in order unless the dependency column allows otherwise; the owner checks in with the user between items.

Status values: `todo` | `in-progress` | `blocked (reason)` | `done (date)`.

Last updated: 2026-10-29 (docs written; WI-01 code, WI-02 and WI-03 implemented while the DB is still in progress).

**Current state:** WI-01..03 do not need the database and are done or nearly done. WI-04 onward is blocked on the DB owner (H-01 seed data, H-02 verified migration, see [db-handoff.md](../data-model/db-handoff.md)).

## Docs phase

| Item | Status |
|---|---|
| SRS in repo (`docs/srs/SRS-v1.0.md`) | done (2026-10-29) |
| Decision records DEC-001..026 | done (2026-10-29), awaiting user review |
| Spec files, architecture, errata, open questions, DB handoff | done (2026-10-29), awaiting user review |

## Work items

### WI-01 Tooling: npm only, Docker MySQL, test runner, CI skeleton
- **Status:** in-progress. Done 2026-10-29: npm only (pnpm files removed, `npm ci` clean), `docker-compose.yml` (valid; MySQL 8.0 on 3307, `indent_dev` + `indent_test`), `.env.example`, scripts, Vitest unit + integration configs (the integration setup refuses non-`_test` databases), `reset-test-db.mjs`, `.github/workflows/ci.yml`, lint/typecheck/test/build all pass locally. **Not yet verified:** starting the container and applying the migration (Docker Desktop was not running; also needs H-02), and the CI workflow has never run on GitHub. `npm run lint` is green only because legacy MVP files are temporarily downgraded to warnings in `eslint.config.mjs` (removed in WI-13). `npm audit` still reports 9 vulnerabilities (the `xlsx` package among them, replaced in WI-10).
- **Depends on:** none | **Decisions:** DEC-023, DEC-024
- **Do:** remove pnpm files and reinstall with npm; add `docker-compose.yml` (MySQL 8.0, port 3307, `indent_dev` + `indent_test`); update `.env.example`; add scripts from [dev-setup.md](../architecture/dev-setup.md); add Vitest config; GitHub Actions workflow (lint, typecheck, test, build).
- **Accept:** a clean clone can run `docker compose up -d`, `npm ci`, `npm run db:migrate` and `npm test` (with at least one trivial test) successfully; CI is green.
- **Blocked by:** db-handoff H-02 for a clean migrate on MySQL 8.0.

### WI-02 Domain core: config, schemas, errors, shared types
- **Status:** done (2026-10-29). `lib/server/config.ts`, `errors.ts`, `http/handler.ts` (`apiRoute`, `parseJson`, `parseQuery`, `zodToAppError`), `lib/shared/{messages,datetime,format}.ts`, `lib/shared/schemas/*`. 107 unit tests. Still open from the original scope: the old `lib/types.ts` and `any` casts disappear when WI-04/WI-06 replace the routes that use them.
- **Depends on:** WI-01 | **Decisions:** DEC-014, DEC-015, DEC-021
- **Do:** `lib/server/config.ts`; `lib/shared/schemas` per [validation.md](../spec/validation.md); `AppError` + codes + `messages.ts`; `datetime.ts`; handler wrapper producing the envelope; remove duplicated types and `any` casts.
- **Accept:** unit tests for every validation rule, error mapping (including that unknown errors never leak text), and timezone helpers (date near midnight in `Asia/Kolkata`).

### WI-03 Auth seam, permissions
- **Status:** done (2026-10-29). `lib/server/auth/*`, `GET /api/me`, `GET|POST /api/dev/session`, `DevUserSwitcher` in the side nav. 168 unit tests (full role x action x ownership table). Verified with curl on `next dev` (role switching, forged cookie ignored) and on a production build (`/api/me` 401, dev endpoints 404, `AUTH_PROVIDER=dev` in production fails closed with a generic 500). **Caveat:** the old JSON-store routes and pages are not yet protected; that happens when WI-06 rewrites them.
- **Depends on:** WI-02 | **Decisions:** DEC-003, DEC-004
- **Do:** `AuthProvider`, dev provider with switcher UI and `/api/dev/session`, external stub, `getCurrentUser()`, `GET /api/me`, `permission-matrix.ts`, `authorize()`.
- **Accept:** table-driven unit test of the full matrix per [permissions.md](../spec/permissions.md); dev provider throws when `NODE_ENV=production`; unauthenticated API call returns 401 envelope.

### WI-04 Prisma repositories and services (replace the JSON store)
- **Status:** todo | **Depends on:** WI-02, WI-03, db-handoff H-01 (seed data) | **Decisions:** DEC-002, DEC-008 (soft delete), DEC-010, DEC-011, DEC-013 (provider), DEC-016, DEC-021, DEC-022, DEC-025
- **Do:** `db.ts` with soft-delete extension; repositories (indent, item, masters, stock, number sequence); `StockProvider`; services for list/filter/search/paginate, get, create (transaction, numbering, new items, snapshots), next-number preview, item search, meta, stock lookup; delete `lib/store.ts`, `client/data/`, `uuid`.
- **Accept:** integration tests: parallel creates yield distinct gap-free numbers; failed create leaves no item or number consumed; list filters and the department OR rule; exact-first search; page size 10; soft-deleted indents invisible; stock unchanged by create (BR-04); stock "Not available" stored as NULL.

### WI-05 Server-owned rules
- **Status:** todo | **Depends on:** WI-04 | **Decisions:** DEC-005, DEC-006, DEC-007, DEC-008, DEC-009, DEC-016
- **Do:** submit service and history rows; edit remark/lines; add/delete line with last-line guard; delete indent; duplicate rule; Save & Submit transaction; optimistic lock; reject unknown/immutable fields.
- **Accept:** integration tests for every row of [domain-rules.md](../spec/domain-rules.md) section 3, `VERSION_CONFLICT` and `NOT_EDITABLE` cases, no way to set `status` from any endpoint.

### WI-06 Route handlers rewritten
- **Status:** todo | **Depends on:** WI-03, WI-05 | **Decisions:** DEC-014, DEC-015
- **Do:** implement every endpoint in [api.md](../spec/api.md) as a thin handler (authenticate, validate, authorize, service, envelope). Remove routes that are not in the spec.
- **Accept:** route-level integration tests for 401/403/404/400/409 on each endpoint; responses match the shapes in the spec; no `err.message` is returned to clients.

### WI-07 Server-rendered pages and URL-driven list
- **Status:** todo | **Depends on:** WI-06 | **Decisions:** DEC-017, DEC-011, DEC-020
- **Do:** list/detail/new pages as Server Components; filters + page in URL; `<Link>` row navigation; expandable item grid; `loading.tsx`, `error.tsx`, `not-found`; item picker with `AbortController`.
- **Accept:** first HTML response contains the list rows; refresh and back button keep filters; keyboard can open a row; no `window.location.href` navigation.

### WI-08 UI components and behaviour
- **Status:** todo | **Depends on:** WI-07 | **Decisions:** DEC-006, DEC-009, DEC-010, DEC-012, DEC-015, DEC-019, DEC-020
- **Do:** `ErrorDialog` + `apiFetch`; accessible `ConfirmDialog`; Tailwind conversion, responsive layout; `Field`, `FilterBar`, `DataTable`, `ItemGrid`; Create screen per [ui.md](../spec/ui.md) (expected number, read-only date/time/Created By, remove-before-save, Save Draft / Save & Submit, unsaved guard); list Delete only for Draft; all failures shown in the dialog; confirmation texts.
- **Accept:** E2E for create/save/submit/delete/edit including each confirmation and error dialog; axe has no serious violations on the 3 pages; page has no horizontal scroll at 375px width.

### WI-09 Stock freshness
- **Status:** todo | **Depends on:** WI-08 | **Decisions:** DEC-013
- **Do:** re-check at Save/Submit confirm with "was X, now Y" and Update; detail-page notice; "Not available" rendering everywhere.
- **Accept:** integration + E2E: change stock between add and save -> notice shown, save still works, saved snapshot equals the server-read value.

### WI-10 Export
- **Status:** todo | **Depends on:** WI-06 | **Decisions:** DEC-018
- **Do:** exceljs streaming export per [export-print.md](../spec/export-print.md); select page / select all matching; filename; remove `xlsx`.
- **Accept:** integration test reads the generated file: columns, typed cells, row count for one/many/filtered/all, scope limited, deleted excluded, formula-injection guard; large dataset (e.g. 5 000 indents) streams without loading all in memory.

### WI-11 Print
- **Status:** todo | **Depends on:** WI-08 | **Decisions:** DEC-026
- **Do:** print stylesheet and header block.
- **Accept:** E2E emulates print media: controls hidden, header block visible, all lines present.

### WI-12 End-to-end and CI completion
- **Status:** todo | **Depends on:** WI-08..WI-11 | **Decisions:** DEC-024
- **Do:** Playwright suite per role; axe checks; CI runs everything; fix flakiness.
- **Accept:** CI green on a clean checkout, including E2E on main.

### WI-13 Cleanup and final traceability check
- **Status:** todo | **Depends on:** WI-12
- **Do:** remove wrong SRS section references in comments (cite FR/BR ids instead); delete dead code; verify every row of [traceability.md](../spec/traceability.md) has a passing test; refresh [open-questions.md](../open-questions.md).
- **Accept:** no code comment cites an SRS "section" that doesn't exist in `SRS-v1.0.md`; traceability has no empty Test cell.

## Coverage of the review ([app-vs-srs-review.md](../reviews/app-vs-srs-review.md))

Section 3 issues:

| Issue | Covered by |
|---|---|
| 1 whole-file reads | WI-04 |
| 2 races / lost updates | WI-04, WI-05 |
| 3 server doesn't own rules | WI-05, WI-06 |
| 4 export in memory | WI-10 |
| 5 no auth/permissions | WI-03 |
| 6 in-memory filtering, full items on list | WI-04, WI-07 |
| 7 `window.location.href` rows | WI-07 |
| 8 refetch per keystroke, stale responses | WI-07, WI-08 |
| 9 stock handling | WI-09 |
| 10 item search | WI-04, WI-08 |
| 11 unhandled failures | WI-08 |
| 12 `xlsx` advisories | WI-10 |
| 13 inline styling | WI-08 |
| 14 `any`, missing shared types | WI-02 |
| 15 wrong SRS section references | WI-13 |
| 16 no tests / CI | WI-01, WI-12 |
| 17 `uuid` dependency | WI-04 |

Section 5 recommendations (features):

| Feature | Covered by |
|---|---|
| 1 validation schema | WI-02 |
| 2 state rules on server | WI-05 |
| 3 submit endpoint | WI-05 |
| 4 `<Link>` rows | WI-07 |
| 5 Delete only for Draft, show errors | WI-08 |
| 6 AbortController | WI-07, WI-08 |
| 7 server components | WI-07 |
| 8 auth seam / `can()` | WI-03 |
| 9 stock freshness | WI-09 |
| 10 ErrorDialog / `useApi` | WI-08 |
| 11 export improvements | WI-10 |
| 12 accessibility | WI-08 |
| 13 responsive layout | WI-08 |
| 14 expandable item summary | WI-07, WI-08 |
| 15 audit trail / status history | status history in WI-05; full line-level audit: backlog B-03 |
| 16 duplicate / copy indent | backlog B-01 |
| 17 unsaved guard / auto-save | guard in WI-08; local auto-save: backlog B-02 |
| 18 print template | WI-11 (company template: backlog) |
| 19 automated tests | WI-01, WI-12 and every WI |
| 20 duplicate-item handling | WI-05, WI-08 |

## Backlog (not scheduled, not required by the SRS)

| ID | Item | Trigger |
|---|---|---|
| B-01 | Duplicate indent / copy items from a previous indent | user request |
| B-02 | Local auto-save of an unsaved Create form | user request |
| B-03 | Line-level audit trail (who changed what) | company asks for audit (see D-17) |
| B-04 | Approval-system status integration (`source=APPROVAL`) | approval team contract |
| B-05 | Real `external` auth provider | auth team contract |
| B-06 | Real Inventory `StockProvider` | company Inventory DB access |
| B-07 | Company print and Excel templates | company supplies them |
