# DEC-014: Validation with shared Zod schemas; server is authoritative

- **Status:** Accepted (limits Provisional: SRS 12.1 forbids inventing them)
- **Date:** 2026-10-29
- **Decided by:** team default
- **SRS refs:** 12.1, 8.9, FR-08, FR-22
- **Data model refs:** D-07
- **Review refs:** #3, #14, section 2 row 12.1
- **Work items:** WI-02, WI-06

## Context

The MVP validates in the UI, and the server checks only the presence of four header fields.

## Decision

1. Request schemas are defined once in `client/lib/shared/schemas/` using Zod, and used by forms (client) and by route handlers (server). Types are inferred from them (no hand-written duplicates of `AddedItem`).
2. The server always validates, regardless of the client.
3. Rules (see [validation.md](../spec/validation.md)): required fields; trimmed strings with maximum lengths equal to the DB column sizes; `requiredQuantity` is a positive decimal with at most 4 places (D-06); valid calendar dates; `requiredDate >= indentDate`; masters referenced by id must exist **and be active**; the item must exist and be active; at least one line.
4. **No invented limits:** no minimum/maximum quantity and no maximum date range beyond the above (SRS 12.1, D-07).
5. DB CHECK constraints are the last line of defence; the service must produce a friendly message before the DB raises one.
6. Unexpected extra fields are rejected (strict schemas) so clients cannot sneak in `status`, `createdBy` or other server-owned fields.
7. Failed validation returns `400 VALIDATION_FAILED` with `fieldErrors` keyed by field path (DEC-015).

## Alternatives considered

- Hand-written checks: they drift between client and server.

## Revisit if

The company supplies validation limits (add them in the schemas and `validation.md`).
