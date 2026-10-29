# Architecture overview

Target structure for `client/` (Next.js 16 App Router, TypeScript, Prisma 6, MySQL 8). Next.js 16 differs from older versions: read the guides in `client/node_modules/next/dist/docs/` before writing routes or pages ([client/AGENTS.md](../../client/AGENTS.md)). Decisions behind this: [DEC-002](../decisions/DEC-002-persistence-prisma-mysql.md), [DEC-017](../decisions/DEC-017-rendering-ssr.md).

## 1. Layers

```
Browser
  Client Components (forms, filter bar, dialogs)  ->  REST route handlers  (mutations, lookups)
Server Components (pages) ----------------------->  services              (reads)
                                                       |
Route handler:  authenticate -> validate (Zod) -> authorize -> service -> error envelope
                                                       |
service (business rules, transactions)  ->  repositories (Prisma)  and  providers (Stock, Auth)
                                                       |
                                                    MySQL
```

Rules:
1. **Pages and route handlers never import Prisma.** They call services. Services call repositories and providers. This is the NFR-08 seam.
2. **Business rules live in services/domain only** ([domain-rules.md](../spec/domain-rules.md)), never in components or route handlers.
3. **Schemas and types are shared** (`lib/shared`), inferred from Zod; no duplicated interfaces.
4. A dependency may only point down the diagram. `lib/shared` imports nothing from `lib/server` or `components`.
5. Anything marked PROVISIONAL reads its value from `lib/server/config`, not from a literal.

## 2. Folder layout

```
client/
  app/
    api/...                      route handlers (thin), one folder per endpoint in spec/api.md
    indents/page.tsx             list (server)
    indents/new/page.tsx         create
    indents/[indentNumber]/page.tsx   detail
    loading.tsx, error.tsx, not-found.tsx, forbidden/...
  components/                    shared UI (Field, FilterBar, DataTable, ConfirmDialog, ErrorDialog, ...)
  lib/
    shared/
      schemas/                   Zod schemas (DEC-014)
      messages.ts                user-facing message catalogue (DEC-015)
      datetime.ts                the only timezone conversion code (DEC-021)
      format.ts                  number formatting, decimal helpers
    server/
      config.ts                  env parsing + PROVISIONAL settings
      db.ts                      Prisma client + soft-delete extension (replaces lib/prisma.ts)
      http/handler.ts            wrapper: auth, error envelope, requestId, logging
      errors.ts                  AppError and codes
      auth/
        types.ts                 Role, Action, Scope, AuthUser, AuthProvider interface
        dev-provider.ts          dev user/role switcher with signed cookie (throws in production)
        dev-users.ts             SAMPLE dev users
        external-provider.ts     stub until the auth team defines the mechanism
        select-provider.ts       picks the provider from config (no Next.js imports, testable)
        current-user.ts          getCurrentUser(), requireUser()
        permission-matrix.ts     role x action x scope (DEC-004)
        authorize.ts             scopeFor(), can(), authorize(), allowedActions()
      repositories/              indent, item, master, stock, number-sequence
      providers/stock.ts         StockProvider interface + stock_balance implementation
      services/                  indent-service, item-service, export-service, meta-service
  prisma/                        owned by the DB teammate
  tests/ unit/, integration/, e2e/, factories/
```

`lib/store.ts`, `lib/types.ts`, `lib/prisma.ts` and `client/data/` are removed or replaced in WI-02/WI-04.

## 3. Cross-cutting

| Concern | Where | Notes |
|---|---|---|
| Auth | `lib/server/auth` | `getCurrentUser()` is the only identity source (DEC-003) |
| Authorization | `authorize.ts` | called in every handler/page; scope also added to queries (DEC-004) |
| Validation | `lib/shared/schemas` | same schema on client and server (DEC-014) |
| Errors | `errors.ts`, `http/handler.ts`, `messages.ts` | one envelope, no raw errors (DEC-015) |
| Concurrency | services | versioned `updateMany` + transactions (DEC-016) |
| Time | `datetime.ts` | UTC instants; business date/time in `APP_TIMEZONE` (DEC-021) |
| Logging | `http/handler.ts` | structured logs with `requestId`; no personal data beyond user id |
| Config | `config.ts` | env parsed and validated on first use (fails fast on bad values); `DATABASE_URL` is checked by `db.ts` (WI-04) so auth/validation run without a database |

## 4. Data flow examples

**Create with submit:** form -> `POST /api/indents` -> handler (auth, schema, `can(create)` and `can(submit)`) -> `indentService.create` -> transaction: validate masters, create new items, snapshot item + stock, allocate number, insert indent/lines/history, submit -> `IndentDetail` -> success dialog with the final number.

**List page:** server page reads URL params -> `authorize(view)` -> `indentService.list(filters, user)` (scope added to `where`) -> HTML. The filter bar updates the URL; the server re-renders.

**Stock check:** confirm dialog opens -> `GET /api/stock?itemIds=` -> `StockProvider.getStock` -> compare with displayed values -> notice.

## 5. Extension points (NFR-08)

| Future change | What changes |
|---|---|
| Real auth | implement `external-provider.ts` |
| Company Inventory DB | new `StockProvider` implementation |
| ERP item/department masters | new implementations behind the item/master repositories |
| Approval statuses | insert status rows; add the `source=APPROVAL` service path |
| New roles/permissions | edit `permission-matrix.ts` |
