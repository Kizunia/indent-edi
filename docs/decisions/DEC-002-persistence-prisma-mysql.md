# DEC-002: Persistence is Prisma + MySQL behind a repository seam

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** user / DB teammate
- **SRS refs:** 1.2, 2.5, NFR-08, NFR-10, 25
- **Data model refs:** D-01..D-31 (all), especially D-25, D-28
- **Review refs:** #1, #2, #6, #17
- **Work items:** WI-04

## Context

The MVP stores everything in JSON files read and rewritten on every request ([`client/lib/store.ts`](../../client/lib/store.ts)). It is not concurrency-safe and cannot paginate. A teammate owns the MySQL 8 + Prisma 6 data model ([final-data-model.md](../data-model/final-data-model.md), [schema.prisma](../../client/prisma/schema.prisma)).

## Decision

1. The app uses the teammate's schema as it is. **The app does not change the schema or migrations.** Needs go to [`db-handoff.md`](../data-model/db-handoff.md).
2. All data access is async and goes through repositories/services in `client/lib/server/` (see [architecture](../architecture/overview.md)). Route handlers and pages never import Prisma directly.
3. External systems are reached through interfaces: `StockProvider` (D-25), `AuthProvider` (DEC-003), and later an item/department master adapter. This is how NFR-08 (ERP swap without rewrite) is met.
4. `lib/store.ts`, `client/data/*.json` and the `uuid` dependency are removed when WI-04 lands. JSON is not kept as a fallback.
5. Ids exposed to the browser are integers from Prisma. Decimals cross the API boundary as strings (D-06). URLs and exports identify an indent by `indent_number` (D-01, D-11).
6. Master data (departments, indent types, units, items, stock) comes from the DB owner's seed. The SRS forbids inventing the lists, so sample data used for tests/dev is labelled `SAMPLE` and never shipped as production data.

## Alternatives considered

- Keep JSON and add file locking: does not scale and cannot do the filters in FR-13.
- Use Prisma directly in route handlers: couples the UI contract to the schema and blocks the ERP swap.

## Consequences

WI-04 is a large change. It depends on the migration being applied to the Docker dev DB ([dev-setup](../architecture/dev-setup.md)) and on seed data from the DB owner.

## Revisit if

The company mandates integrating with the existing ERP DB from day one (then write adapters behind the same interfaces).
