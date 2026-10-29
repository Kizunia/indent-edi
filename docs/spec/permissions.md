# Permissions

Status: **PROVISIONAL** (SRS 6.1 is entirely TBD). Implementation rules are in [DEC-004](../decisions/DEC-004-permission-matrix.md); identity comes from [DEC-003](../decisions/DEC-003-auth-provider-seam.md).

## 1. Model

- A user has one or more roles and optionally a `departmentId`.
- The matrix maps `role -> action -> scope` where scope is `none | own | department | all`.
- With several roles the **widest** scope wins per action.
- `own` = `indent.createdByUserId === user.id`. `department` = the indent's header department, or any line's department, equals `user.departmentId`.
- `can(user, action, indent?)` returns true only if the scope matches the indent. List/export queries add the scope as a `where` filter so out-of-scope rows are never read.
- Deny by default. A user without a recognised role can do nothing.
- Permission is necessary but not sufficient: status rules ([domain-rules.md](domain-rules.md)) also apply (e.g. Admin cannot edit a Submitted indent).

## 2. Actions

| Action | Meaning | SRS |
|---|---|---|
| `indent.view` | List, search, filter, open detail | FR-11, FR-14 |
| `indent.create` | Create and Save Draft, add lines while creating | FR-01, FR-09 |
| `indent.edit` | Edit Draft remark/lines, add/remove line | FR-16, FR-17 |
| `indent.submit` | Submit (and the submit part of Save & Submit) | FR-10 |
| `indent.delete` | Delete Draft | FR-18 |
| `indent.export` | Excel export | FR-19 |
| `indent.print` | Print | FR-20 |

The SRS matrix columns map: Create Indent -> `indent.create`; Add/Edit Item and Edit Indent -> `indent.edit`; Save Draft -> `indent.create`/`indent.edit`; Submit -> `indent.submit`; Delete Indent -> `indent.delete`; Export; Print. View is implied by SRS 10.4 and added explicitly.

## 3. Provisional default matrix

File: `client/lib/server/auth/permission-matrix.ts` (single place to change).

| Role | view | create | edit | submit | delete | export | print |
|---|---|---|---|---|---|---|---|
| Department Employee | own | all* | own | own | own | own | own |
| Department Head | department | all* | department | department | department | department | department |
| Purchase Employee | all | none | none | none | none | all | all |
| Store Employee | all | none | none | none | none | all | all |
| Admin | all | all | all | all | all | all | all |

\* `create` has no existing indent, so its scope is a yes/no per role; the created indent is owned by the user and its department defaults to the user's.

Edit/submit/delete apply only to Drafts regardless of scope.

## 4. Enforcement checklist

- Every route handler: authenticate -> validate -> `authorize()` -> service. A missing check is a bug.
- Pages: call the same service functions with the same `authorize()`; a 403 renders the standard "not allowed" page, a missing/other-scope indent renders 404 (do not reveal existence).
- `GET /api/me` returns the user and the action list so the UI can hide/disable controls. The UI is never the control.
- Detail and list responses carry per-indent `permissions` flags (`canEdit`, `canSubmit`, `canDelete`, `canPrint`) computed by the server.
- Tests: a table-driven test covers every role x action x (own / other / other-department) x (Draft / Submitted).
