# DEC-011: Indent number search is exact-first, then partial

- **Status:** Provisional (SRS 10.2 / BR-13 TBD)
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** 10.2, FR-12, BR-13, UC-06
- **Data model refs:** D-29, D-31
- **Review refs:** section 2 FR-12
- **Work items:** WI-04, WI-07

## Context

The SRS says to search by Indent ID/Number but does not say whether exact or partial.

## Decision

1. The query is trimmed. Empty means no search filter.
2. Matches are indents whose `indent_number` **equals** the term, or **contains** it (case-insensitive; the default collation `utf8mb4_0900_ai_ci` already is, D-31).
3. An exact match is placed first in page 1 regardless of the sort order; the rest follow in the normal order (`indent_date DESC, id DESC`, D-29). Paging counts the combined set.
4. The term is passed as a parameter (Prisma), never concatenated into SQL. `%` and `_` typed by the user are escaped so they match literally.
5. FULLTEXT is not used (D-31). If the list grows large, the `contains` scan is the first thing to measure.
6. No match shows the empty state message required by UC-06.

## Alternatives considered

- Partial only: an exact number can end up on page 2 beside similar numbers.
- Exact only: users must know the full number.

## Consequences

The list service builds two queries (exact id lookup + paged contains excluding it) or one query with ordering; see [api.md](../spec/api.md).

## Revisit if

Company answers BR-13.
