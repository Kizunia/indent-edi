import type { Prisma } from "@prisma/client";
import { scopeFor } from "../server/auth/authorize";
import type { Action, AuthUser } from "../server/auth/types";

/** Soft-deleted indents are invisible everywhere (DEC-008). */
export const NOT_DELETED = { deletedAt: null } satisfies Prisma.IndentWhereInput;

/**
 * Turns the user's scope for an action into a Prisma filter so out-of-scope
 * rows are never read (docs/spec/permissions.md). Always includes NOT_DELETED.
 */
export function scopeWhere(user: AuthUser, action: Action): Prisma.IndentWhereInput {
  const scope = scopeFor(user, action);
  switch (scope) {
    case "all":
      return { ...NOT_DELETED };
    case "own":
      return { ...NOT_DELETED, createdByUserId: user.id };
    case "department": {
      // Header department or any line department (DEC-022).
      const d = user.departmentId;
      if (d === undefined) return { ...NOT_DELETED, id: { in: [] } };
      return { ...NOT_DELETED, OR: [{ departmentId: d }, { items: { some: { departmentId: d } } }] };
    }
    default:
      return { ...NOT_DELETED, id: { in: [] } };
  }
}
