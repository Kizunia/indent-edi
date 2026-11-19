# Organize Indent System

A web app to create, save, submit, list, filter, edit, delete, print and export purchase **Indents** (material requests). Built from the SRS in [`../docs/srs/SRS-v1.0.md`](../docs/srs/SRS-v1.0.md).

Stack: Next.js 16 (App Router, React 19), TypeScript, Tailwind v4, Prisma 6 + MySQL 8, Zod, Vitest, ExcelJS.

**Docs are the contract.** Start at [`../docs/README.md`](../docs/README.md). Run instructions: [`../docs/architecture/dev-setup.md`](../docs/architecture/dev-setup.md).

## Quick start

```bash
cd client
npm ci
cp .env.example .env     # check DATABASE_URL: it must point at a database you are happy to change
npm run db:setup         # Docker MySQL + migrations + sample data
npm run dev              # http://localhost:3000
```

Use the **Signed in as (dev)** switcher in the side navigation to act as an employee, department head, purchase, store or admin user.

## Features

- Create an indent with header fields and many items (existing or new items), Save Draft or Save & Submit.
- Server-assigned Indent Number (`IND-000001`), date, time, creator and status; the client cannot send them.
- List with search, filters (type, department, status, creator, dates), 10 per page, filters kept in the URL, expandable item grids.
- Edit a Draft (remark, lines, add/remove line), submit, delete (Draft only, soft delete), with confirmations and optimistic-lock conflict handling.
- Stock is read by the server; "Not available" is shown when unknown (never 0); changes are shown before saving or submitting.
- Print the detail page; Excel export of selected or all matching indents (streamed).
- Roles and permissions from a provisional matrix ([`../docs/spec/permissions.md`](../docs/spec/permissions.md)).

Many SRS values are TBD. The app uses documented defaults labelled `PROVISIONAL (DEC-xxx)`; see [`../docs/open-questions.md`](../docs/open-questions.md).

## Layout

| Path | Purpose |
|---|---|
| `app/` | Pages (Server Components), `app/api/**` thin route handlers (authenticate, validate, authorize, service) |
| `components/ui`, `components/layout`, `components/indents` | Dialogs, fields, nav, and the indent screens' client islands |
| `lib/services/` | The domain: all business rules and transactions (`indents`, `items`, `masters`, `export`, `stock-provider`) |
| `lib/server/` | Config, auth (provider seam, permission matrix), HTTP handler wrapper, Excel writer |
| `lib/shared/` | Zod schemas, date/format helpers, error catalogue (server and client safe) |
| `lib/client/api.ts` | `apiFetch`: checks every response and turns failures into one `ApiError` |
| `prisma/` | Schema, migration, seeds ([`prisma/README.md`](prisma/README.md)) |
| `tests/unit`, `tests/integration` | Vitest; integration tests need the `_test` MySQL database |

## Commands

```bash
npm run dev | build | start
npm run lint | typecheck | test | test:int
npm run db:setup | db:up | db:deploy | db:seed | db:seed:sample | db:studio
```

Playwright end-to-end tests are planned but not added yet.
