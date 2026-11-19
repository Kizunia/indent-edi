# Database setup (MySQL + Prisma)

Requires MySQL >= 8.0.16 (CHECK constraints are ignored on older versions).

1. Create an empty database with utf8mb4:
   `CREATE DATABASE indent CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
2. `cp .env.example .env` and set `DATABASE_URL`.
3. `npm install` (runs `prisma generate`).
4. `npm run db:migrate` (applies `migrations/0001_init`: tables, CHECKs, DRAFT/SUBMITTED statuses, number sequences).
5. `npm run db:seed` loads SAMPLE departments, indent types, units, items, stock and two demo indents (self-contained in `prisma/seed.ts`; safe to re-run). Indent Numbers and Item Codes use the configured format (`IND-000001`, `ITM-000001`, DEC-010). Demo indents are created by the dev auth users (`lib/server/auth/dev-users.ts`) so every role in the dev user switcher has data.
6. Optional: `npm run db:seed:sample` adds 20 more items and 16 indents covering every status, type, department and filter (needs step 5 first; safe to re-run). Statuses beyond Draft/Submitted are placeholders from SRS 7.9.
7. `npm run dev`. `npm run db:studio` shows the data.

If the tables were already created by hand from the SQL file, do not run step 4.
Instead mark the migration as applied: `npx prisma migrate resolve --applied 0001_init`.

Design rationale: see [`docs/data-model/final-data-model.md`](../../docs/data-model/final-data-model.md) (decision log D-01..D-31).

## Code layout

- `lib/db/client.ts` the Prisma singleton; `lib/db/sequence.ts` concurrency-safe numbering.
- `lib/services/` the only code that touches Prisma and where every business rule lives: `indents.ts`, `items.ts`, `masters.ts`, `export.ts`, `numbering.ts`, `scope.ts`, `stock-provider.ts`, `mappers.ts`.
- `app/api/**` thin HTTP routes; pages call the services directly. Raw database errors are logged server-side and never sent to the browser.
- `prisma/seed.ts`, `seed-sample.ts`, `seed-lib.ts` SAMPLE data (idempotent, no JSON files).
