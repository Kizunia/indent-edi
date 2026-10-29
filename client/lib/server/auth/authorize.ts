import { AppError } from "../errors";
import { PERMISSION_MATRIX } from "./permission-matrix";
import {
  ACTIONS,
  ROLES,
  type Action,
  type AuthUser,
  type AuthorizableIndent,
  type Role,
  type Scope,
} from "./types";

// Authorization (DEC-004, NFR-09, BR-08). Deny by default: an unknown role, a
// missing user or a missing matrix entry grants nothing.

const WIDTH: Record<Scope, number> = { none: 0, own: 1, department: 2, all: 3 };

const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

/** Widest scope the user's roles give for an action. With several roles the widest wins. */
export function scopeFor(user: AuthUser | null | undefined, action: Action): Scope {
  if (!user) return "none";
  let best: Scope = "none";
  for (const name of user.roles) {
    if (!isRole(name)) continue; // SRS 6: never assume roles beyond the configured ones
    const scope = PERMISSION_MATRIX[name][action] ?? "none";
    if (WIDTH[scope] > WIDTH[best]) best = scope;
  }
  return best;
}

/**
 * Is the user allowed to do `action`?
 * - Without `indent`: true if the action is allowed on at least some indents
 *   (use this for buttons and for the list-level check; queries then add the scope).
 * - With `indent`: also checks ownership / department for the user's scope.
 */
export function can(
  user: AuthUser | null | undefined,
  action: Action,
  indent?: AuthorizableIndent
): boolean {
  const scope = scopeFor(user, action);
  if (scope === "none" || !user) return false;
  if (scope === "all" || indent === undefined) return true;
  if (scope === "own") return indent.createdByUserId === user.id;
  // scope === "department"
  return user.departmentId !== undefined && indent.departmentIds.includes(user.departmentId);
}

/** Throws FORBIDDEN (or UNAUTHENTICATED with no user) unless `can()` is true. */
export function authorize(
  user: AuthUser | null | undefined,
  action: Action,
  indent?: AuthorizableIndent
): asserts user is AuthUser {
  if (!user) throw new AppError("UNAUTHENTICATED");
  if (!can(user, action, indent)) throw new AppError("FORBIDDEN");
}

/** Actions the user may perform on at least some indents, for GET /api/me and the UI. */
export function allowedActions(user: AuthUser | null | undefined): Action[] {
  return ACTIONS.filter((a) => scopeFor(user, a) !== "none");
}
