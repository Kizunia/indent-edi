// Identity and permission vocabulary (DEC-003, DEC-004, docs/spec/permissions.md).

/** Roles named in SRS 2.3 / 6. PROVISIONAL: the final role list is TBD. */
export const ROLES = [
  "DEPARTMENT_EMPLOYEE",
  "DEPARTMENT_HEAD",
  "PURCHASE_EMPLOYEE",
  "STORE_EMPLOYEE",
  "ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "indent.view",
  "indent.create",
  "indent.edit",
  "indent.submit",
  "indent.delete",
  "indent.export",
  "indent.print",
] as const;
export type Action = (typeof ACTIONS)[number];

/** How far an action reaches. `create` has no existing indent, so it is `all` or `none`. */
export type Scope = "none" | "own" | "department" | "all";

/** The authenticated user, as supplied by the auth module (SRS 2.5). */
export interface AuthUser {
  /** Opaque id from the auth module (max 64 characters, D-18). */
  id: string;
  /** Display name, snapshotted onto indents as created_by_name. */
  name: string;
  /** Role names as given by the auth module. Unknown names grant nothing. */
  roles: string[];
  departmentId?: number;
}

/** What `can()` needs to know about an existing indent to check ownership and department scope. */
export interface AuthorizableIndent {
  createdByUserId: string;
  /** Header department plus every line department (DEC-022). */
  departmentIds: number[];
}

/** Source of the current user. Exactly one is active (DEC-003). */
export interface AuthProvider {
  /** Returns the signed-in user, or null when nobody is signed in. */
  getUser(): Promise<AuthUser | null>;
}
