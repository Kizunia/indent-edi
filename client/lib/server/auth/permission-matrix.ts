import type { Action, Role, Scope } from "./types";

// PROVISIONAL (DEC-004): SRS 6.1 leaves the whole matrix TBD. This is the one
// place to change once the company confirms it. Keep docs/spec/permissions.md
// in step with this file.
//
// Edit / submit / delete additionally require the indent to be a Draft; that
// status rule lives in the domain layer, not here.
export const PERMISSION_MATRIX: Record<Role, Record<Action, Scope>> = {
  DEPARTMENT_EMPLOYEE: {
    "indent.view": "own",
    "indent.create": "all",
    "indent.edit": "own",
    "indent.submit": "own",
    "indent.delete": "own",
    "indent.export": "own",
    "indent.print": "own",
  },
  DEPARTMENT_HEAD: {
    "indent.view": "department",
    "indent.create": "all",
    "indent.edit": "department",
    "indent.submit": "department",
    "indent.delete": "department",
    "indent.export": "department",
    "indent.print": "department",
  },
  PURCHASE_EMPLOYEE: {
    "indent.view": "all",
    "indent.create": "none",
    "indent.edit": "none",
    "indent.submit": "none",
    "indent.delete": "none",
    "indent.export": "all",
    "indent.print": "all",
  },
  STORE_EMPLOYEE: {
    "indent.view": "all",
    "indent.create": "none",
    "indent.edit": "none",
    "indent.submit": "none",
    "indent.delete": "none",
    "indent.export": "all",
    "indent.print": "all",
  },
  ADMIN: {
    "indent.view": "all",
    "indent.create": "all",
    "indent.edit": "all",
    "indent.submit": "all",
    "indent.delete": "all",
    "indent.export": "all",
    "indent.print": "all",
  },
};
