# Database setup (MySQL + Prisma)

Requires MySQL >= 8.0.16 (CHECK constraints are ignored on older versions).

1. Create an empty database with utf8mb4:
   `CREATE DATABASE indent CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
2. `cp .env.example .env` and set `DATABASE_URL`.
3. `npm install` (runs `prisma generate`).
4. `npm run db:migrate` (applies `migrations/0001_init`: tables, CHECKs, DRAFT/SUBMITTED statuses, number sequences).
5. `npm run db:seed` loads the prototype's departments, indent types, items, stock and demo indents from `data/*.json` (safe to re-run).
6. Optional: `npm run db:seed:sample` adds 20 more items and 16 indents covering every status, type, department and filter (needs step 5 first; safe to re-run). Statuses beyond Draft/Submitted are placeholders from SRS 7.9.
7. `npm run dev`. `npm run db:studio` shows the data.

If the tables were already created by hand from the SQL file, do not run step 4.
Instead mark the migration as applied: `npx prisma migrate resolve --applied 0001_init`.

Design rationale: see the data model document (decision log D-01..D-31).

## Code layout

- `lib/db/` shared plumbing: `client.ts` (Prisma singleton), `sequence.ts` (concurrency-safe numbering), `mappers.ts` (DB rows <-> API shapes in `lib/types.ts`), `dates.ts`, `errors.ts`.
- `lib/repositories/` the only code that touches Prisma: `masters.ts`, `items.ts`, `stock.ts`, `indents.ts`.
- `app/api/**` thin HTTP routes that call the repositories. Raw database errors are logged server-side and never sent to the browser.
