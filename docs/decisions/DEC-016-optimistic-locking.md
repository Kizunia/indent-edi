# DEC-016: Optimistic locking with indent version

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** team (adopts D-19)
- **SRS refs:** NFR-10, FR-16
- **Data model refs:** D-19, D-22, D-23
- **Review refs:** #2
- **Work items:** WI-04, WI-05, WI-08

## Context

Two users can edit the same Draft. The MVP rewrites whole files and loses updates.

## Decision

1. Every API response for an indent includes `version`. Every write request (edit, add line, delete line, submit, delete indent) must send the `version` it was based on (`If-Match` style field `version` in the body).
2. The service does `updateMany({ where: { id, version, deletedAt: null, statusId in editable }, data: { version: { increment: 1 } } })` first, per D-19, and treats `count === 0` as `VERSION_CONFLICT` (or `NOT_EDITABLE` when the status check fails, which is distinguished by a follow-up read).
3. The header row update takes the row lock that serializes line numbering (D-22) and the last-line check (D-23). All of it is inside one `$transaction`.
4. The UI handles `VERSION_CONFLICT` with a dialog: "This indent was changed by someone else. Reload to see the latest version." and a Reload button. It never overwrites silently.
5. Responses after a successful write return the new `version`.

## Consequences

All write endpoints need the extra `version` field; documented in [api.md](../spec/api.md).
