# Running the app: dev, production, data and tests

This is the runbook. All commands run from the `client/` folder unless stated. Decision behind the tooling: [DEC-023](../decisions/DEC-023-tooling-npm-docker.md).

**What works today.** The app stores everything in MySQL through Prisma (no JSON files). The full flow runs: create, save draft, submit, list, filter, edit a Draft, delete a Draft, print and Excel export. Authentication is a dev user switcher until the auth team's mechanism exists (backlog B-05). Browser end-to-end tests (Playwright) are deferred.

| Legend | Meaning |
|---|---|
| **Verified** | run on this project's code (2026-11-19) |
| **Not verified** | written from the configuration; not run yet |

## 1. Prerequisites

- Node.js 20.9 or newer (22 LTS recommended) and **npm** 10 or newer. Use npm only, not pnpm or yarn.
- Git.
- Docker Desktop for the local database, or any MySQL >= 8.0.16 (CHECK constraints are ignored on older versions).

## 2. First-time setup (one command path)

```bash
cd client
npm ci                  # installs exactly what package-lock.json says (also runs prisma generate)
cp .env.example .env    # points at the Docker MySQL below
npm run db:setup        # docker up + apply migrations + base seed + sample seed
npm run dev             # http://localhost:3000
```

Status: **Verified** (migration, both seeds twice for idempotency, dev server).

**Check `.env` before running anything that writes.** `DATABASE_URL` decides which database the app, the seeds and `db:migrate` use. If you already have a local MySQL in `.env`, scripts will change *that* database.

## 3. Start the development server

```bash
npm run dev             # http://localhost:3000  (redirects to /indents)
npm run dev -- -p 3100  # use another port
```

What you get in dev:
- Hot reload; errors shown in the browser overlay.
- **User switcher** at the bottom of the side navigation ("Signed in as (dev)"). It lets you act as any role (employee, department head, purchase, store, admin). The default user is *Dev Admin*. The choice is kept in a signed cookie. Employees see only their own indents, department heads their department's, purchase/store/admin all of them ([permissions](../spec/permissions.md)).
- `GET /api/me` shows the current user and what they may do; `GET /api/dev/session` lists the dev users.

If the switcher is missing, `AUTH_PROVIDER` is not `dev` or the app is running in production mode.

## 4. Build and start the production server

```bash
npm run build           # compiles; also type-checks
npm run start           # http://localhost:3000, production mode
```

Production behaves differently on purpose ([DEC-003](../decisions/DEC-003-auth-provider-seam.md)):

| Behaviour | Production |
|---|---|
| Default auth provider | `external`, which is a stub that signs nobody in until the auth team's mechanism is built (backlog B-05) |
| Every page and endpoint | `401` / "not signed in" page |
| `/api/dev/session` and the user switcher | `404` / hidden |
| `AUTH_PROVIDER=dev` | Refused: requests fail with a generic `500` (reference number shown); the real reason is in the server log. Never set it in production |

So a production build is **not deployable yet**: there is no real login. Treat production mode today as a check that the build works. All pages are rendered per request and never cached (`connection()` in `getCurrentUser`).

Deploy the schema with `npm run db:deploy` (applies existing migrations, never creates new ones). **Never run `db:migrate` against a production database**; it is for development.

## 5. Database (needs Docker Desktop running)

```bash
npm run db:up           # starts MySQL 8.0 on localhost:3307 and waits until it is healthy
npm run db:deploy       # applies prisma/migrations (use db:migrate when you are changing the schema)
npm run db:studio       # browse the data at http://localhost:5555
npm run db:down         # stops the container (data is kept in a Docker volume)
```

Status: **Verified** (MySQL 8.0 container, migration `0001_init`).

Details:
- `docker-compose.yml` (repo root) creates two databases: `indent_dev` (app) and `indent_test` (tests only). Host port **3307** avoids a clash with a MySQL already installed on 3306.
- Default connection (matches `.env.example`): `mysql://root:password@localhost:3307/indent_dev`. These are local-only credentials.
- The first migration also inserts the statuses the app owns (`DRAFT`, `SUBMITTED`) and the number counters (`INDENT`, `ITEM`).
- To start with an empty database again (development only, **deletes all data**): `npx prisma migrate reset`. Prisma refuses this when an AI agent runs it unless the user consents explicitly.
- To remove the container **and its data volume**: `docker compose -f ../docker-compose.yml down -v`.

## 6. Seeding data

```bash
npm run db:seed          # SAMPLE departments, indent types, units, 8 items with stock, 2 submitted indents
npm run db:seed:sample   # optional: 20 more items and 16 indents covering every status, type and filter
```

Both are idempotent and self-contained (`prisma/seed.ts`, `seed-sample.ts`, `seed-lib.ts`). The SRS says Indent Types and Departments must not be invented, so this is clearly **SAMPLE data** ([db-handoff H-01](../data-model/db-handoff.md)); it never goes to production.

- Numbers and codes follow the configured format: `IND-000001`, `ITM-000001` ([DEC-010](../decisions/DEC-010-number-generation-and-preview.md)).
- Seeded indents are created by the dev auth users, so each role in the switcher has data.
- Departments are created with fixed ids 1..5 because dev users reference departments 1 and 2 ([H-08](../data-model/db-handoff.md)).
- Statuses beyond Draft/Submitted exist only after `db:seed:sample`; they are placeholders for the approval team's statuses (SRS 7.9).

## 7. Tests and checks

```bash
npm test                # unit tests, no database (Verified: 283 pass)
npm run typecheck       # Verified
npm run lint            # Verified (0 errors, 0 warnings)
npm run test:int        # integration tests against indent_test (Verified: 33 pass)
npm run db:reset:test   # drop, recreate and migrate indent_test (destructive; see section 5)
```

To run the integration tests on a fresh test database: set `DATABASE_URL_TEST` (the name must end in `_test`), apply the migration with `DATABASE_URL=<same url> npx prisma migrate deploy`, then `npm run test:int`. The tests create their own SAMPLE masters, use unique user ids per run, and can be repeated on the same database.

Both `test:int` and `db:reset:test` refuse to run unless `DATABASE_URL_TEST` names a database ending in `_test`. **Deferred:** Playwright end-to-end tests and axe accessibility checks (roadmap WI-12).

## 8. Environment variables (`client/.env`)

`.env` is git-ignored. Never commit real credentials. In production, set these in the host's environment instead of a file.

| Variable | Default / example | Purpose |
|---|---|---|
| `DATABASE_URL` | `mysql://root:password@localhost:3307/indent_dev` | app database |
| `DATABASE_URL_TEST` | `mysql://root:password@localhost:3307/indent_test` | tests only; name must end in `_test` |
| `AUTH_PROVIDER` | `dev` outside production, `external` in production | `dev` or `external` ([DEC-003](../decisions/DEC-003-auth-provider-seam.md)) |
| `DEV_SESSION_SECRET` | `dev-only-insecure-secret` | signs the dev session cookie; dev only |
| `AUTH_LOGIN_URL` | empty | where unauthenticated users are sent (TBD with the auth team) |
| `APP_TIMEZONE` | `Asia/Kolkata` | business date/time zone (PROVISIONAL, [DEC-021](../decisions/DEC-021-business-date-time.md)) |
| `ALLOW_DUPLICATE_ITEMS` | `false` | PROVISIONAL, [DEC-009](../decisions/DEC-009-duplicate-items.md) |
| `INDENT_NUMBER_PREFIX` / `INDENT_NUMBER_PAD` | `IND-` / `6` | PROVISIONAL, [DEC-010](../decisions/DEC-010-number-generation-and-preview.md) |
| `ITEM_CODE_PREFIX` / `ITEM_CODE_PAD` | `ITM-` / `6` | PROVISIONAL, [DEC-010](../decisions/DEC-010-number-generation-and-preview.md) |
| `TZ` | `UTC` | process time zone; keep UTC ([DEC-021](../decisions/DEC-021-business-date-time.md)) |

An invalid value (for example an unknown time zone) makes the app fail with a clear "Invalid configuration" message instead of running with a wrong setting.

## 9. Troubleshooting

| Problem | Cause and fix |
|---|---|
| `failed to connect to the docker API` / `dockerDesktopLinuxEngine` | Docker Desktop is not running. Start it, wait until it says running, retry `npm run db:up` |
| Port 3000 already in use | `npm run dev -- -p 3100` (or `npm run start -- -p 3101`) |
| Port 3307 already in use | Another container or MySQL uses it. Stop it, or change the host port in `docker-compose.yml` and in `DATABASE_URL` |
| `npm ci` fails with `EPERM` / "directory not empty" on Windows, or `node_modules` is half-built | A dev server, editor or another `npm` is holding files. Close them, wait for any running `npm` to finish, delete `node_modules` completely, run `npm ci` once |
| `pnpm-lock.yaml` or `pnpm-workspace.yaml` reappear | Someone ran pnpm. Delete both and the pnpm `node_modules`, then `npm ci`. Do not commit them |
| `Invalid configuration: ...` at startup | A value in `.env` is not valid; the message names the variable |
| Every request returns 401 in dev | `AUTH_PROVIDER=external` is set in `.env`, or you started with `npm run start` (production mode); use `npm run dev` |
| App shows different data than the Docker DB | `.env` points at another MySQL; check `DATABASE_URL` |
| Prisma errors about the client | `npm run db:generate` |
| "Refusing to run: ... does not end in _test" | `DATABASE_URL_TEST` points at the wrong database; this guard is intentional |

## 10. Definition of done for any change

1. `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:int` pass.
2. End-to-end tests pass for UI changes (once WI-12 exists).
3. The relevant `spec/` file, the DEC, [traceability](../spec/traceability.md), the [roadmap](../plan/roadmap.md) and [presentation page 05](../presentation/05-status-and-next-steps.md) are updated in the same change.
