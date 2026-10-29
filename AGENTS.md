# Agent guide: Organize Indent System

An enterprise web app for creating, saving, submitting, listing, exporting and printing **Indents** (material requests). It is built from a written SRS. The app lives in `client/` (Next.js 16, TypeScript, Prisma, MySQL). The documentation lives in `docs/` and is the contract you code against.

## Before you write any code

1. Read [`docs/README.md`](docs/README.md) (map, precedence, how docs stay live).
2. Find your work item in [`docs/plan/roadmap.md`](docs/plan/roadmap.md). Read the decision records (`docs/decisions/DEC-xxx`) and spec files it names. Do not start a work item whose dependencies are not `done`.
3. Skim [`docs/srs/srs-errata.md`](docs/srs/srs-errata.md) and [`docs/open-questions.md`](docs/open-questions.md) so you know where the SRS is unclear and what the app does meanwhile.
4. For anything in `client/`, also read [`client/AGENTS.md`](client/AGENTS.md): this Next.js has breaking changes; read the guides in `client/node_modules/next/dist/docs/` before writing routes or pages.

## Rules

1. **Respect the SRS** ([`docs/srs/SRS-v1.0.md`](docs/srs/SRS-v1.0.md)). Never edit it. Never invent values it marks TBD (indent types, departments, roles, formats, limits). Use the provisional defaults in the DECs and label them `PROVISIONAL (DEC-xxx)` in code.
2. **Docs before code.** If behaviour must change, update the DEC/spec first (new DEC that supersedes, never rewrite), then code, in the same change.
3. **If the docs are unclear, contradictory, or silent: stop and ask the user** (interactive question with a recommended option and the reason). Record the answer in a DEC. Do not guess.
4. **Server owns the rules.** The UI only mirrors them. Validate (shared Zod schemas), authorize (`authorize()`), and enforce state rules in services. Clients never send `status`, `createdBy`, the indent number/date/time, stock values or item snapshots.
5. **Layers:** pages and route handlers call services; services call repositories/providers; only repositories import Prisma ([`docs/architecture/overview.md`](docs/architecture/overview.md)).
6. **The DB belongs to the DB teammate.** Do not change `client/prisma/` or `docs/data-model/final-data-model.md`. Put requests in [`docs/data-model/db-handoff.md`](docs/data-model/db-handoff.md).
7. **No raw errors to users** (FR-22). Use the error envelope and `messages` catalogue ([DEC-015](docs/decisions/DEC-015-error-handling.md)).
8. **Tests are part of done.** Each work item lists acceptance tests. Update [`docs/spec/traceability.md`](docs/spec/traceability.md) and the roadmap status when finished.
9. Use **npm** (not pnpm/yarn). Never commit `.env` or credentials. Never run tests against a database whose name does not end in `_test`.
10. Do not commit, push, or open PRs unless the user asks.

## Quick facts

- Page size 10; indents are addressed by `indentNumber` in URLs and APIs.
- Statuses the app owns: `DRAFT`, `SUBMITTED` (others come from the approval team).
- Draft: Remark and line fields editable, header fixed; Submitted: read-only.
- Delete: Draft only; indent soft delete, line hard delete.
- Indent number assigned on save; Create shows an expected-number preview.
- Stock: read-only via `StockProvider`; unknown stock is "Not available", never 0.

## Where things are

| Need | File |
|---|---|
| Requirements | `docs/srs/SRS-v1.0.md` |
| All decisions | `docs/decisions/README.md` |
| Business rules | `docs/spec/domain-rules.md` |
| API contract | `docs/spec/api.md` |
| Permissions | `docs/spec/permissions.md` |
| Validation | `docs/spec/validation.md` |
| Screens and texts | `docs/spec/ui.md` |
| Excel/print | `docs/spec/export-print.md` |
| Req -> test map | `docs/spec/traceability.md` |
| Setup and scripts | `docs/architecture/dev-setup.md` |
| What to build next | `docs/plan/roadmap.md` |
| Presentation material | `docs/presentation/` (update page 05 when a work item's status changes) |
