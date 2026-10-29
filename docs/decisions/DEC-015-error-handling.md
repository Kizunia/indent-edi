# DEC-015: One error envelope, safe messages, one error dialog

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** team default
- **SRS refs:** 12.3, FR-22, NFR-05
- **Review refs:** #11, section 2 FR-22
- **Work items:** WI-02, WI-06, WI-08

## Context

Routes return `err.message` straight to the client (possible leakage once a real DB is used) and several `fetch` calls ignore failures. The SRS requires popup/dialog errors, understandable messages, and no raw technical or database errors.

## Decision

1. Server errors are `AppError(code, message, httpStatus, details?)`. Route handlers wrap every handler in one helper that converts errors to the envelope:
   `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "fieldErrors": { "items.0.requiredQuantity": "..." }, "requestId": "..." } }`
2. Stable codes (full list in [api.md](../spec/api.md)): `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION_FAILED` 400, `INDENT_EMPTY` 400, `DUPLICATE_ITEM` 409, `NOT_EDITABLE` 409, `VERSION_CONFLICT` 409, `STOCK_UNAVAILABLE` 502, `EXPORT_FAILED` 500, `INTERNAL` 500.
3. Unknown errors (Prisma, network, bugs) are logged server-side with the stack and a `requestId`, and the client gets only `INTERNAL` with the generic message "Something went wrong. Please try again. Reference: <requestId>".
4. Messages for known codes are written for end users, kept in one `messages` module (English now), and never contain SQL, table names or stack traces.
5. The client uses one `useApi`/`apiFetch` helper that handles `res.ok`, JSON parse failures and network errors, and returns `{ data } | { error }`.
6. Errors are shown in a single `ErrorDialog` (modal, `role="alertdialog"`). Field errors are also marked on the fields. Inline callouts are not used for failures (FR-22 says popup/dialog).
7. Every action that can fail shows the dialog: save, update, delete, submit, export, stock lookup, unauthorized, invalid indent.

## Consequences

Every route is a thin handler: authenticate -> validate -> authorize -> service -> envelope.

## Revisit if

Localization is needed (move `messages` to an i18n catalog).
