import { describe, expect, it } from "vitest";
import { parseConfig } from "@/lib/server/config";

describe("parseConfig", () => {
  it("applies the documented PROVISIONAL defaults", () => {
    const c = parseConfig({});
    expect(c.appTimezone).toBe("Asia/Kolkata");
    expect(c.allowDuplicateItems).toBe(false);
    expect(c.indentNumber).toEqual({ prefix: "IND-", pad: 6 });
    expect(c.itemCode).toEqual({ prefix: "ITM-", pad: 6 });
  });

  it("treats empty strings as not set", () => {
    const c = parseConfig({ APP_TIMEZONE: "", AUTH_LOGIN_URL: "", AUTH_PROVIDER: "", INDENT_NUMBER_PAD: "" });
    expect(c.appTimezone).toBe("Asia/Kolkata");
    expect(c.authLoginUrl).toBeUndefined();
    expect(c.indentNumber.pad).toBe(6);
  });

  it("reads overrides", () => {
    const c = parseConfig({
      ALLOW_DUPLICATE_ITEMS: "true",
      INDENT_NUMBER_PREFIX: "PURC",
      INDENT_NUMBER_PAD: "7",
      APP_TIMEZONE: "UTC",
    });
    expect(c.allowDuplicateItems).toBe(true);
    expect(c.indentNumber).toEqual({ prefix: "PURC", pad: 7 });
    expect(c.appTimezone).toBe("UTC");
  });

  it("defaults the auth provider to dev outside production and external in production", () => {
    expect(parseConfig({ NODE_ENV: "development" }).authProvider).toBe("dev");
    expect(parseConfig({ NODE_ENV: "test" }).authProvider).toBe("dev");
    expect(parseConfig({ NODE_ENV: "production" }).authProvider).toBe("external");
  });

  it("honours an explicit auth provider", () => {
    expect(parseConfig({ NODE_ENV: "development", AUTH_PROVIDER: "external" }).authProvider).toBe("external");
  });

  it.each([
    [{ APP_TIMEZONE: "Mars/Olympus" }, "APP_TIMEZONE"],
    [{ ALLOW_DUPLICATE_ITEMS: "yes" }, "ALLOW_DUPLICATE_ITEMS"],
    [{ INDENT_NUMBER_PAD: "0" }, "INDENT_NUMBER_PAD"],
    [{ INDENT_NUMBER_PAD: "abc" }, "INDENT_NUMBER_PAD"],
    [{ AUTH_PROVIDER: "ldap" }, "AUTH_PROVIDER"],
    [{ NODE_ENV: "staging" }, "NODE_ENV"],
  ])("fails fast on %j", (env, name) => {
    expect(() => parseConfig(env as Record<string, string>)).toThrow(name);
  });
});
