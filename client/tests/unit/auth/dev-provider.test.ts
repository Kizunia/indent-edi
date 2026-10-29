import { describe, expect, it } from "vitest";
import { createDevProvider, signSession, verifySession } from "@/lib/server/auth/dev-provider";
import { DEFAULT_DEV_USER_ID, DEV_USERS } from "@/lib/server/auth/dev-users";
import { selectProvider } from "@/lib/server/auth/select-provider";
import { externalProvider } from "@/lib/server/auth/external-provider";
import { ROLES } from "@/lib/server/auth/types";

const SECRET = "test-secret";

describe("signed dev session", () => {
  it("round-trips a user id", () => {
    expect(verifySession(signSession("dev-emp-1", SECRET), SECRET)).toBe("dev-emp-1");
  });

  it("rejects a different secret, a tampered id and a tampered signature", () => {
    const good = signSession("dev-emp-1", SECRET);
    expect(verifySession(good, "other-secret")).toBeNull();
    expect(verifySession(good.replace("dev-emp-1", "dev-admin"), SECRET)).toBeNull();
    expect(verifySession(good.slice(0, -2) + "xx", SECRET)).toBeNull();
  });

  it.each([undefined, "", "nodot", ".sig", "dev-admin."])("rejects malformed value %j", (v) => {
    expect(verifySession(v, SECRET)).toBeNull();
  });
});

describe("dev provider", () => {
  const make = (cookie?: string) =>
    createDevProvider({ secret: SECRET, isProduction: false, readCookie: async () => cookie });

  it("returns the user named by a valid cookie", async () => {
    const user = await make(signSession("dev-store", SECRET)).getUser();
    expect(user?.id).toBe("dev-store");
    expect(user?.roles).toEqual(["STORE_EMPLOYEE"]);
  });

  it("falls back to the default dev user without a valid cookie", async () => {
    expect((await make().getUser())?.id).toBe(DEFAULT_DEV_USER_ID);
    expect((await make("dev-store.forged").getUser())?.id).toBe(DEFAULT_DEV_USER_ID);
  });

  it("returns null for a validly signed id that is not a dev user", async () => {
    expect(await make(signSession("ghost", SECRET)).getUser()).toBeNull();
  });

  it("refuses to be created in production", () => {
    expect(() => createDevProvider({ secret: SECRET, isProduction: true, readCookie: async () => undefined })).toThrow(
      /must not be used in production/
    );
  });
});

describe("dev users", () => {
  it("only use configured roles, with unique ids", () => {
    const ids = new Set<string>();
    for (const u of DEV_USERS) {
      expect(ids.has(u.id)).toBe(false);
      ids.add(u.id);
      for (const r of u.roles) expect(ROLES as readonly string[]).toContain(r);
    }
    expect(ids.has(DEFAULT_DEV_USER_ID)).toBe(true);
  });
});

describe("selectProvider", () => {
  const read = async () => undefined;

  it("uses the dev provider outside production", async () => {
    const p = selectProvider({ authProvider: "dev", isProduction: false, devSessionSecret: SECRET }, read);
    expect((await p.getUser())?.id).toBe(DEFAULT_DEV_USER_ID);
  });

  it("throws when the dev provider is configured in production", () => {
    expect(() => selectProvider({ authProvider: "dev", isProduction: true, devSessionSecret: SECRET }, read)).toThrow(
      /production/
    );
  });

  it("the external stub signs nobody in until the auth team's mechanism exists", async () => {
    const p = selectProvider({ authProvider: "external", isProduction: true, devSessionSecret: SECRET }, read);
    expect(p).toBe(externalProvider);
    expect(await p.getUser()).toBeNull();
  });
});
