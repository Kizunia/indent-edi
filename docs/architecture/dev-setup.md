# Running the app: dev, production, data and tests

This is the runbook. All commands run from the `client/` folder unless stated. Decision behind the tooling: [DEC-023](../decisions/DEC-023-tooling-npm-docker.md).

**What works today.** The pages and old API routes still store data in JSON files (`client/data/`), so the app runs **without a database**. The MySQL database, its seed data and the code that uses it arrive with WI-04 ([roadmap](../plan/roadmap.md)). Sections below say which parts need the database and which are verified.

| Legend | Meaning |
|---|---|
| **Verified** | run on this project's code (2026-10-29) |
| **Not verified** | written from the configuration; not run yet |

## 1. Prerequisites

- Node.js 20.9 or newer (22 LTS recommended; 24 is used locally) and **npm** 10 or newer. Use npm only, not pnpm or yarn.
- Git.
- Docker Desktop, only for the database parts (sections 5 and 6).

## 2. First-time setup (no database needed)

```bash
cd client
npm ci                  # installs exactly what package-lock.json says (also runs prisma generate)
cp .env.example .env    # optional today; every setting has a default. Needed for the database later
```

Status: **Verified** (`npm ci` on a clean `node_modules`).

## 3. Start the development server

```bash
npm run dev             # http://localhost:3000  (redirects to /indents)
npm run dev -- -p 3100  # use another port
```

Status: **Verified.**

What you get in dev:
- Hot reload; errors shown in the browser overlay.
- **User switcher** at the bottom of the side navigation ("Signed in as (dev)"). It lets you act as any role (employee, department head, purchase, store, admin). The default user is *Dev Admin*. The choice is kept in a signed cookie.
- `GET /api/me` shows the current user and what they may do; `GET /api/dev/session` lists the dev users.

If the switcher is missing, `AUTH_PROVIDER` is not `dev` or the app is running in production mode.

## 4. Build and start the production server

```bash
npm run build           # compiles; also type-checks
npm run start           # http://localhost:3000, production mode
npm run start -- -p 3101
```

Status: **Verified** (build, start, and the behaviour below).

Production behaves differently on purpose ([DEC-003](../decisions/DEC-003-auth-provider-seam.md)):

| Behaviour | Production |
|---|---|
| Default auth provider | `external`, which is a stub that signs nobody in until the auth team's mechanism is built (backlog B-05) |
| `GET /api/me` and every endpoint protected by the new auth | `401 UNAUTHENTICATED` |
| `/api/dev/session` and the user switcher | `404` / hidden |
| `AUTH_PROVIDER=dev` | Refused: requests fail with a generic `500` (reference number shown) and the real reason is in the server log. Never set it in production |
| Old MVP pages and API routes | still open and unprotected until WI-06 rewrites them |

So a production build is **not deployable yet**: there is no real login, and storage is still JSON files. Treat production mode today as a check that the build works.

Requirements when running the old JSON storage in production mode:
- Start it from inside `client/` (the data folder is found relative to the working directory).
- The process must be able to write to `client/data/`.
- Run a single instance only (JSON files are not safe for concurrent writers; this is one of the reasons for WI-04).

Once the database is in use, deploy with `npm run db:deploy` (applies existing migrations, never creates new ones). **Never run `db:migrate` against a production database**; it is for development.

## 5. Database (needs Docker Desktop running)

```bash
npm run db:up           # starts MySQL 8.0 on localhost:3307 and waits until it is healthy
npm run db:migrate      # applies prisma/migrations to indent_dev
npm run db:studio       # browse the data at http://localhost:5555
npm run db:down         # stops the container (data is kept in a Docker volume)
```

Status: **Not verified.** Docker Desktop was not running when this was written, and the DB owner has not yet confirmed the migration on a live server ([db-handoff H-02](../data-model/db-handoff.md)).

Details:
- `docker-compose.yml` (repo root) creates two databases: `indent_dev` (app) and `indent_test` (tests only). Host port **3307** avoids a clash with a MySQL already installed on 3306.
- Default connection (matches `.env.example`): `mysql://root:password@localhost:3307/indent_dev`. These are local-only credentials.
- The first migration (`0001_init`) also inserts the two statuses the app owns (`DRAFT`, `SUBMITTED`) and the two number counters (`INDENT`, `ITEM`).
- To start with an empty database again (development only, **deletes all data in `indent_dev`**): `npx prisma migrate reset`.
- To remove the container **and its data volume**: `docker compose -f ../docker-compose.yml down -v`.

## 6. Seeding data

### Today (JSON storage): nothing to run

The seed data is the committed files in `client/data/`: `departments.json`, `indent-types.json`, `items.json`, `stock.json` and `indents.json`. The app reads and edits them while running, so creating indents changes `indents.json`, `items.json` and `stock.json`.

To go back to the committed sample data (this **discards any indents or items you created**):

```bash
git restore client/data     # run from the repo root
```

### With the database: the seed is not written yet

The SRS says Indent Types and Departments must not be invented, so master data (departments, indent types, units, items, stock) has to come from the DB owner. Until it arrives:

- The app has **no `db:seed` command**. It is added when the seed lands ([db-handoff H-01](../data-model/db-handoff.md)); this section will then list the exact command.
- The migration alone gives only the statuses and number counters from section 5.
- Dev auth users (`client/lib/server/auth/dev-users.ts`) assume departments with id 1 and 2 ([H-08](../data-model/db-handoff.md)).
- Test data for automated tests is created by the tests themselves and labelled SAMPLE ([DEC-024](../decisions/DEC-024-testing-ci.md)); sample data never goes to production.

## 7. Tests and checks

```bash
npm test                # unit tests, no database (Verified: 275 pass)
npm run typecheck       # Verified
npm run lint            # Verified (0 errors; 20 warnings from old MVP files)
npm run test:int        # integration tests against indent_test; passes with no tests until WI-04
npm run db:reset:test   # drop, recreate and migrate indent_test
```

Both `test:int` and `db:reset:test` refuse to run unless `DATABASE_URL_TEST` names a database ending in `_test`. Playwright end-to-end tests (`test:e2e`) arrive in WI-12.

## 8. Environment variables (`client/.env`)

`.env` is git-ignored. Never commit real credentials. In production, set these in the host's environment instead of a file.

| Variable | Default / example | Purpose |
|---|---|---|
| `DATABASE_URL` | `mysql://root:password@localhost:3307/indent_dev` | app database (used from WI-04) |
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
| `/api/me` returns 401 in dev | `AUTH_PROVIDER=external` is set in `.env`; remove it or set `dev` |
| Prisma errors about the client | `npm run db:generate` |
| "Refusing to run: ... does not end in _test" | `DATABASE_URL_TEST` points at the wrong database; this guard is intentional |

## 10. Definition of done for any change

1. `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:int` pass.
2. End-to-end tests pass for UI changes (once WI-12 exists).
3. The relevant `spec/` file, the DEC, [traceability](../spec/traceability.md), the [roadmap](../plan/roadmap.md) and [presentation page 05](../presentation/05-status-and-next-steps.md) are updated in the same change.
