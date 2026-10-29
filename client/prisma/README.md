# Database setup (MySQL + Prisma)

Requires MySQL >= 8.0.16 (CHECK constraints are ignored on older versions).

1. Create an empty database with utf8mb4:
   `CREATE DATABASE indent CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
2. `cp .env.example .env` and set `DATABASE_URL`.
3. `npm install` (runs `prisma generate`).
4. `npm run db:migrate` (applies `migrations/0001_init`: tables, CHECKs, DRAFT/SUBMITTED statuses, number sequences).
5. `npm run db:studio` to inspect the data.

If the tables were already created by hand from the SQL file, do not run step 4.
Instead mark the migration as applied: `npx prisma migrate resolve --applied 0001_init`.

Design rationale: see the data model document (decision log D-01..D-31).
