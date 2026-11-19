# Organize Indent System

A web app to create, save, submit, list, filter, edit, delete, print and export purchase **Indents** (material requests). Next.js 16 + TypeScript + Prisma + MySQL 8.

This page gets you from a fresh clone to a running app in about 10 minutes. Deeper docs: [`docs/README.md`](docs/README.md) and [`docs/architecture/dev-setup.md`](docs/architecture/dev-setup.md).

## 1. What you need

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.9 or newer (22 LTS recommended) | `node -v` |
| npm | 10 or newer | `npm -v` |
| Docker Desktop | any recent, **running** | `docker info` |
| Git | any | `git --version` |

Docker provides the MySQL database. No MySQL install is needed. Use **npm** only, not pnpm or yarn.

## 2. Get the code

```bash
git clone https://github.com/Kizunia/indent-edi.git
cd indent-edi
git checkout integration/complete    # the complete, up-to-date branch
cd client                            # every command below runs from client/
```

## 3. Set up and run

```bash
npm ci                               # install exactly what package-lock.json says
cp .env.example .env                 # Windows PowerShell: Copy-Item .env.example .env
npm run db:setup                     # starts MySQL in Docker, creates tables, loads sample data
npm run dev                          # http://localhost:3000
```

Open <http://localhost:3000>. It redirects to the indent list.

`npm run db:setup` is safe to run again. It needs Docker running and port **3307** free.

> **Check `.env` before you run anything.** `DATABASE_URL` decides which database the app and the seed scripts change. The value from `.env.example` points at the Docker database (`localhost:3307`). If you point it at another MySQL, the scripts will write sample data into *that* database.

## 4. Try it out

There is no real login yet. Use the **Signed in as (dev)** dropdown at the bottom of the left menu to act as another user. Each role sees different things:

| User in the dropdown | Role | Can see | Can do |
|---|---|---|---|
| Dev Admin (default) | Admin | all indents | everything |
| Dev Employee (Dept 1) / (Dept 2) | Department Employee | only their own indents | create, edit/submit/delete own Drafts, export, print |
| Dev Department Head (Dept 1) | Department Head | indents of their department | same, for the department |
| Dev Purchase Employee, Dev Store Employee | Purchase / Store | all indents | view, export, print only (cannot create or edit) |

Suggested walkthrough (about 5 minutes):

1. **List:** as Admin, open *All Indents*. Try the search box, the filters, page 2, and the arrow next to a row to see its items.
2. **Create:** *New Indent*. Pick a type and department, search an item (try `bolt`), set a quantity and required date, click **Add Item**. Add a second item with *New item*. Click **Save Draft** and confirm.
3. **Edit a Draft:** open the new indent, click **Edit**, change the remark or a quantity, add or remove an item. Removing the last item is blocked.
4. **Submit:** click **Submit** and confirm. The indent becomes read-only, and Edit/Delete disappear.
5. **Rules:** switch to *Dev Employee (Dept 1)*: only their own indents show. Switch to *Dev Purchase Employee*: there is no *New Indent* menu entry.
6. **Export and print:** select rows in the list and click **Export selected**, or open an indent and use **Export** / **Print**.

## 5. Everyday commands (run from `client/`)

| Command | What it does |
|---|---|
| `npm run dev` | start the app with hot reload |
| `npm run db:up` / `npm run db:down` | start / stop the Docker MySQL (data is kept) |
| `npm run db:seed` | base sample data (safe to re-run) |
| `npm run db:seed:sample` | optional: 16 more indents covering every status |
| `npm run db:studio` | browse the database at <http://localhost:5555> |
| `npm run lint` · `typecheck` · `test` | code checks (no database needed) |
| `npm run test:int` | integration tests (need the test database, see below) |
| `npm run build` then `npm run start` | production build (see the note below) |

Start over with an empty database (**deletes all data in Docker**): `docker compose -f ../docker-compose.yml down -v`, then `npm run db:setup`.

### Running the integration tests

```bash
# macOS/Linux
export DATABASE_URL_TEST="mysql://root:password@localhost:3307/indent_test"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
npm run test:int
```

```powershell
# Windows PowerShell
$env:DATABASE_URL_TEST = "mysql://root:password@localhost:3307/indent_test"
$env:DATABASE_URL = $env:DATABASE_URL_TEST; npx prisma migrate deploy
npm run test:int
```

The test database name **must end in `_test`**, or the tests refuse to run.

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `failed to connect to the docker API` | Docker Desktop is not running. Start it, wait until it says running, retry. |
| Port 3307 is already in use | Another MySQL/container uses it. Stop it, or change the port in `docker-compose.yml` **and** `DATABASE_URL`. |
| Port 3000 is already in use | `npm run dev -- -p 3100` |
| Every page says "not signed in", or the dev dropdown is missing | You started with `npm run start` (production mode, which has no dev login by design). Use `npm run dev`. |
| `Can't reach database server` or `table ... does not exist` | The database is not running or not migrated: `npm run db:setup`. Then check `DATABASE_URL` in `.env`. |
| The list is empty | The seeds did not run: `npm run db:seed && npm run db:seed:sample`. Or you are signed in as an employee with no indents of their own. |
| The app shows different data than expected | `.env` points at another database. Check `DATABASE_URL`. |
| `npm ci` fails with `EPERM` on Windows | Close editors/terminals using `node_modules`, delete the folder, run `npm ci` once. |
| `Invalid configuration: ...` at start | A value in `.env` is wrong; the message names it. |

## 7. Good to know

- All data is **sample data**. Departments, indent types and number formats are placeholders until the company confirms them ([`docs/open-questions.md`](docs/open-questions.md)).
- Indent numbers look like `IND-000001` and are assigned when you save; the number shown on the form is only an expectation.
- Real login, approval-system statuses and the real inventory database are not built yet ([`docs/plan/roadmap.md`](docs/plan/roadmap.md)). Browser end-to-end tests are planned but not added yet.
- Project layout, rules and decisions: [`AGENTS.md`](AGENTS.md), [`client/README.md`](client/README.md), [`docs/`](docs/).
