# Developer setup

Decision: [DEC-023](../decisions/DEC-023-tooling-npm-docker.md). Status: tooling exists (WI-01). Starting the container and applying the migration on MySQL 8.0 has not been verified yet ([db-handoff H-02](../data-model/db-handoff.md)).

## Prerequisites

- Node.js LTS (version pinned in `client/package.json` `engines`) and **npm**.
- Docker Desktop.
- Git.

## First-time setup

```bash
cd client
cp .env.example .env            # then check the values below
npm ci
npm run db:up                   # Docker Compose MySQL 8.0 on localhost:3307 (DBs: indent_dev, indent_test); needs Docker Desktop running
npm run db:migrate              # applies prisma/migrations (teammate-owned)
# SAMPLE masters for dev: a db:seed script is added when the DB owner delivers the seed (db-handoff H-01)
npm run dev                     # http://localhost:3000
```

Until WI-04 lands, the pages still use the old JSON store and do not need the database. The auth switcher, `/api/me` and all unit tests work without it.

## Environment variables (`client/.env`)

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `mysql://root:password@localhost:3307/indent_dev` | app database |
| `DATABASE_URL_TEST` | `mysql://root:password@localhost:3307/indent_test` | tests only; must contain `_test` |
| `AUTH_PROVIDER` | `dev` | `dev` or `external` (DEC-003) |
| `APP_TIMEZONE` | `Asia/Kolkata` | business date/time zone (DEC-021, PROVISIONAL) |
| `ALLOW_DUPLICATE_ITEMS` | `false` | DEC-009 (PROVISIONAL) |
| `INDENT_NUMBER_PREFIX` / `INDENT_NUMBER_PAD` | `IND-` / `6` | DEC-010 (PROVISIONAL) |
| `ITEM_CODE_PREFIX` / `ITEM_CODE_PAD` | `ITM-` / `6` | DEC-010 (PROVISIONAL) |
| `AUTH_LOGIN_URL` | (empty) | where unauthenticated users are sent (TBD with the auth team) |
| `TZ` | `UTC` | process timezone, must be UTC (DEC-021) |

`.env` is git-ignored. Never commit real credentials.

## Scripts (`client/package.json`)

| Script | What it does |
|---|---|
| `dev`, `build`, `start` | Next.js |
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `test`, `test:watch` | Vitest unit tests (`tests/unit`, no DB) |
| `test:int` | Vitest integration tests (`tests/integration`) against `DATABASE_URL_TEST`; refuses any database whose name does not end in `_test`; passes with no tests until WI-04 |
| `db:up`, `db:down` | start/stop the Compose MySQL |
| `db:migrate`, `db:deploy`, `db:studio`, `db:validate`, `db:generate` | Prisma |
| `db:reset:test` | drop, recreate and migrate `indent_test` (same `_test` guard) |
| `test:e2e`, `db:seed` | added later: Playwright in WI-12, seed when the DB owner delivers it |

## Definition of done for any change

1. `npm run lint && npm run typecheck && npm run test && npm run test:int` pass.
2. E2E passes for UI changes.
3. The relevant `spec/` file, DEC, [traceability](../spec/traceability.md) and the [roadmap](../plan/roadmap.md) status are updated in the same change.

## Notes

- Use npm only. If an old pnpm `node_modules` is present, delete it completely (close editors and dev servers first; Windows may refuse otherwise) and run `npm ci`.
- The data model doc states the migration has not been run against a live MySQL server; see [db-handoff H-02](../data-model/db-handoff.md).
- `DATABASE_URL` is read by the database layer (WI-04), not by `lib/server/config.ts`, so the app starts without a database.
