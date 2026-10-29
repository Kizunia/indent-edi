import type { AuthUser } from "./types";

// SAMPLE users for the dev auth provider only (DEC-003). They are not company
// data. departmentId values must match department_master ids in the seed data;
// adjust them when the DB owner's seed lands (docs/data-model/db-handoff.md H-01).
export const DEV_USERS: readonly AuthUser[] = [
  { id: "dev-emp-1", name: "Dev Employee (Dept 1)", roles: ["DEPARTMENT_EMPLOYEE"], departmentId: 1 },
  { id: "dev-emp-2", name: "Dev Employee (Dept 2)", roles: ["DEPARTMENT_EMPLOYEE"], departmentId: 2 },
  { id: "dev-head-1", name: "Dev Department Head (Dept 1)", roles: ["DEPARTMENT_HEAD"], departmentId: 1 },
  { id: "dev-purchase", name: "Dev Purchase Employee", roles: ["PURCHASE_EMPLOYEE"] },
  { id: "dev-store", name: "Dev Store Employee", roles: ["STORE_EMPLOYEE"] },
  { id: "dev-admin", name: "Dev Admin", roles: ["ADMIN"] },
];

export const DEFAULT_DEV_USER_ID = "dev-admin";
