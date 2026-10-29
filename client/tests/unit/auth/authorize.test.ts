import { describe, expect, it } from "vitest";
import { allowedActions, authorize, can, scopeFor } from "@/lib/server/auth/authorize";
import { PERMISSION_MATRIX } from "@/lib/server/auth/permission-matrix";
import { ACTIONS, ROLES, type Action, type AuthUser, type AuthorizableIndent, type Role, type Scope } from "@/lib/server/auth/types";
import { AppError } from "@/lib/server/errors";

const userWith = (roles: string[], extra: Partial<AuthUser> = {}): AuthUser => ({
  id: "u1",
  name: "Test User",
  roles,
  departmentId: 1,
  ...extra,
});

// Indents relative to user "u1" in department 1.
const own: AuthorizableIndent = { createdByUserId: "u1", departmentIds: [9] };
const sameDept: AuthorizableIndent = { createdByUserId: "u2", departmentIds: [1] };
const otherDept: AuthorizableIndent = { createdByUserId: "u2", departmentIds: [2] };
const lineInDept: AuthorizableIndent = { createdByUserId: "u2", departmentIds: [2, 1] };

// The provisional matrix from docs/spec/permissions.md section 3, written out
// independently so a typo in permission-matrix.ts is caught.
const EXPECTED: Record<Role, Record<Action, Scope>> = {
  DEPARTMENT_EMPLOYEE: {
    "indent.view": "own", "indent.create": "all", "indent.edit": "own", "indent.submit": "own",
    "indent.delete": "own", "indent.export": "own", "indent.print": "own",
  },
  DEPARTMENT_HEAD: {
    "indent.view": "department", "indent.create": "all", "indent.edit": "department",
    "indent.submit": "department", "indent.delete": "department", "indent.export": "department",
    "indent.print": "department",
  },
  PURCHASE_EMPLOYEE: {
    "indent.view": "all", "indent.create": "none", "indent.edit": "none", "indent.submit": "none",
    "indent.delete": "none", "indent.export": "all", "indent.print": "all",
  },
  STORE_EMPLOYEE: {
    "indent.view": "all", "indent.create": "none", "indent.edit": "none", "indent.submit": "none",
    "indent.delete": "none", "indent.export": "all", "indent.print": "all",
  },
  ADMIN: {
    "indent.view": "all", "indent.create": "all", "indent.edit": "all", "indent.submit": "all",
    "indent.delete": "all", "indent.export": "all", "indent.print": "all",
  },
};

describe("permission matrix", () => {
  it("defines every role and every action", () => {
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        expect(PERMISSION_MATRIX[role][action], `${role} ${action}`).toBeDefined();
      }
    }
  });

  it("matches the documented provisional matrix", () => {
    expect(PERMISSION_MATRIX).toEqual(EXPECTED);
  });
});

describe("can() for every role x action x ownership", () => {
  // [role, action, indent label, indent, allowed]
  const cases: Array<[Role, Action, string, AuthorizableIndent, boolean]> = [];
  for (const role of ROLES) {
    for (const action of ACTIONS) {
      const scope = EXPECTED[role][action];
      const allowed = (indent: AuthorizableIndent, label: "own" | "sameDept" | "otherDept" | "lineInDept") => {
        if (scope === "all") return true;
        if (scope === "none") return false;
        if (scope === "own") return label === "own";
        return label === "sameDept" || label === "lineInDept";
      };
      cases.push([role, action, "own", own, allowed(own, "own")]);
      cases.push([role, action, "sameDept", sameDept, allowed(sameDept, "sameDept")]);
      cases.push([role, action, "otherDept", otherDept, allowed(otherDept, "otherDept")]);
      cases.push([role, action, "lineInDept", lineInDept, allowed(lineInDept, "lineInDept")]);
    }
  }

  it.each(cases)("%s %s on %s indent", (role, action, _label, indent, allowed) => {
    expect(can(userWith([role]), action, indent)).toBe(allowed);
  });

  it("list-level check (no indent) is true whenever the scope is not none", () => {
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        expect(can(userWith([role]), action)).toBe(EXPECTED[role][action] !== "none");
      }
    }
  });
});

describe("deny by default", () => {
  it("denies when nobody is signed in", () => {
    for (const action of ACTIONS) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action, own)).toBe(false);
    }
  });

  it("grants nothing for unknown, empty or wrongly cased roles", () => {
    for (const roles of [[], ["SUPERUSER"], ["admin"], ["Admin"], ["__proto__"], ["constructor"]]) {
      const user = userWith(roles);
      for (const action of ACTIONS) expect(can(user, action), `${roles} ${action}`).toBe(false);
      expect(allowedActions(user)).toEqual([]);
    }
  });

  it("denies department scope for a user without a department", () => {
    const head = userWith(["DEPARTMENT_HEAD"], { departmentId: undefined });
    expect(can(head, "indent.view", sameDept)).toBe(false);
  });
});

describe("several roles", () => {
  it("the widest scope wins", () => {
    const u = userWith(["DEPARTMENT_EMPLOYEE", "PURCHASE_EMPLOYEE"]);
    expect(scopeFor(u, "indent.view")).toBe("all");
    expect(scopeFor(u, "indent.edit")).toBe("own");
  });

  it("ignores an unknown role next to a known one", () => {
    const u = userWith(["NOPE", "STORE_EMPLOYEE"]);
    expect(scopeFor(u, "indent.export")).toBe("all");
    expect(scopeFor(u, "indent.create")).toBe("none");
  });
});

describe("authorize()", () => {
  it("throws UNAUTHENTICATED without a user", () => {
    expect(() => authorize(null, "indent.view")).toThrowError(AppError);
    try {
      authorize(null, "indent.view");
    } catch (e) {
      expect((e as AppError).code).toBe("UNAUTHENTICATED");
      expect((e as AppError).status).toBe(401);
    }
  });

  it("throws FORBIDDEN when not allowed", () => {
    try {
      authorize(userWith(["STORE_EMPLOYEE"]), "indent.create");
      expect.unreachable();
    } catch (e) {
      expect((e as AppError).code).toBe("FORBIDDEN");
      expect((e as AppError).status).toBe(403);
    }
  });

  it("throws FORBIDDEN for another user's indent under own scope", () => {
    expect(() => authorize(userWith(["DEPARTMENT_EMPLOYEE"]), "indent.edit", sameDept)).toThrowError(AppError);
  });

  it("returns quietly when allowed", () => {
    expect(() => authorize(userWith(["ADMIN"]), "indent.delete", otherDept)).not.toThrow();
  });
});

describe("allowedActions", () => {
  it("lists what each role can do on some indents", () => {
    expect(allowedActions(userWith(["STORE_EMPLOYEE"]))).toEqual(["indent.view", "indent.export", "indent.print"]);
    expect(allowedActions(userWith(["ADMIN"]))).toEqual([...ACTIONS]);
  });
});
