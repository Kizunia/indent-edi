# DEC-024: Testing pyramid and CI

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** team default
- **Review refs:** #16, feature 19
- **Work items:** WI-01, WI-12 (and tests in every WI)

## Decision

1. **Unit tests (Vitest):** domain rules (status transitions, editable fields, duplicate rule), Zod schemas, `can()` and the permission matrix, number formatting, date/timezone helpers, error mapping.
2. **Integration tests (Vitest + real MySQL `indent_test`):** services and route handlers: create/save/submit, concurrency (two parallel saves get different numbers), optimistic-lock conflict, soft delete visibility, last-line guard, list filters and pagination, export row selection.
3. **E2E (Playwright):** create -> save draft -> edit -> submit -> list/search/filter -> export -> print preview, for each role in the dev auth provider, plus an axe accessibility check on the three pages.
4. Every work item adds or updates tests for its acceptance criteria. A work item is not done without them.
5. **CI (GitHub Actions):** on every PR run `lint`, `typecheck`, `test`, `test:int` (MySQL service container), `build`; E2E on main and on demand.
6. Test data is created by the tests themselves (factories) and is labelled sample; masters needed by tests come from a test seed, not from company data.
