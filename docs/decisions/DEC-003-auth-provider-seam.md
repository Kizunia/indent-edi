# DEC-003: Authentication through a pluggable AuthProvider

- **Status:** Accepted (production provider mechanism is TBD with the auth team)
- **Date:** 2026-10-29
- **Decided by:** user (chose "pluggable provider + dev user switcher")
- **SRS refs:** 1.4 (Created By), 2.5, 14 (Authentication), FR-01, NFR-09, BR-08
- **Data model refs:** D-18
- **Review refs:** #5
- **Work items:** WI-03

## Context

Login is owned by another team, but every rule (Created By, permissions, ownership, audit) needs the current user. The MVP lets the user type "Created By", which makes the audit trail unreliable. The SRS (1.4) defines Created By as the authenticated user.

## Decision

1. One function, `getCurrentUser()` in `client/lib/server/auth/`, returns `{ id: string, name: string, roles: Role[], departmentId?: number } | null`. It is the only way server code learns who the user is.
2. It delegates to an `AuthProvider` selected by `AUTH_PROVIDER` env:
   - `dev` (default outside production): a user + role switcher in the UI header; the choice is kept in a signed cookie. Sample users are defined in one dev fixture file. **The dev provider throws at startup if `NODE_ENV=production`.**
   - `external`: reads the identity the auth team supplies. The mechanism (trusted headers, session cookie, JWT) is **TBD**. Until it is decided this provider is a documented stub that returns `null`, so a production build has no access by default.
3. No user is ever taken from request bodies or query strings. `createdByUserId` = `user.id`, `createdByName` = `user.name` snapshot (D-18). The "Created By" field on the form is read-only and shows the current user.
4. Unauthenticated requests: API returns `401 UNAUTHENTICATED`; pages redirect to the auth team's login URL (`AUTH_LOGIN_URL`, TBD) or show a "Not signed in" page.
5. Id format is an opaque string up to 64 chars (D-18).

## Alternatives considered

- Trusted headers only: no way to exercise roles locally.
- Hard-coded admin: permissions cannot be tested.

## Consequences

Local dev and E2E tests can act as any role. The auth team's contract only needs to fill in one provider.

## Revisit if

The auth team defines the mechanism, or requires user lookup (e.g. Created By filter dropdown) from their API instead of from indent rows.
