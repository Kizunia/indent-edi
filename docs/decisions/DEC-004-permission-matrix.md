# DEC-004: Config-driven permission matrix with provisional defaults

- **Status:** Provisional (SRS 6.1 matrix is entirely TBD)
- **Date:** 2026-10-29
- **Decided by:** user (chose "config-driven matrix, provisional defaults")
- **SRS refs:** 2.3, 6, 6.1, NFR-09, BR-08
- **Review refs:** #5
- **Work items:** WI-03, WI-06

## Context

The SRS requires authorization (NFR-09, BR-08) but does not define roles or permissions. Guessing in scattered `if` statements would make the later answer a rewrite.

## Decision

1. Permissions live in one config module, `client/lib/server/auth/permission-matrix.ts`: a map `role -> action -> scope`. Actions: `indent.view`, `indent.create`, `indent.edit`, `indent.submit`, `indent.delete`, `indent.export`, `indent.print`. Scopes: `none`, `own`, `department`, `all`.
2. Every route handler and server page calls `can(user, action, indent?)` (or `authorize()` wrapping it). It checks the matrix and the scope (ownership by `createdByUserId`; department by the indent's header department or any line department).
3. **Deny by default:** an unknown role, a missing action, or no user means denied.
4. Status rules (Draft-only edit/delete) are separate from permissions and are enforced in the domain layer ([domain-rules](../spec/domain-rules.md)). Both must pass.
5. Provisional default matrix (all values **PROVISIONAL**, shown in [permissions.md](../spec/permissions.md)): Department Employee = view own, create, edit/submit/delete own Draft, export/print own. Department Head = same for department scope. Purchase Employee and Store Employee = view/export/print all. Admin = all actions, all scopes.
6. The UI hides or disables actions using the same `can()` result sent from the server, but the server decides.
7. Every list, detail, export and filter-options query applies the view scope, so users never see indents outside it.

## Alternatives considered

- Empty matrix: the app could not be demonstrated.
- Ownership-only rule: ignores the SRS's role concept.

## Consequences

When the company confirms the matrix, only `permission-matrix.ts` and `permissions.md` change.

## Revisit if

The company supplies the matrix or a different role list (SRS 6 says do not assume the five roles).
