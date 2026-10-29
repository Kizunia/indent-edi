import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_DEV_USER_ID, DEV_USERS } from "./dev-users";
import type { AuthProvider, AuthUser } from "./types";

// Dev/test auth provider (DEC-003): a user + role switcher backed by a signed
// cookie. It must never run in production.

export const DEV_SESSION_COOKIE = "dev_session";

function mac(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(userId).digest("base64url");
}

/** Cookie value for a user id: "<userId>.<signature>". */
export function signSession(userId: string, secret: string): string {
  return `${userId}.${mac(userId, secret)}`;
}

/** Returns the user id if the cookie value carries a valid signature, otherwise null. */
export function verifySession(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(mac(userId, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}

export function findDevUser(userId: string): AuthUser | undefined {
  return DEV_USERS.find((u) => u.id === userId);
}

export interface DevProviderOptions {
  secret: string;
  isProduction: boolean;
  /** Reads the dev session cookie (injected so this module is testable without Next.js). */
  readCookie: () => Promise<string | undefined>;
}

export function createDevProvider(options: DevProviderOptions): AuthProvider {
  // Fail loudly rather than silently let anyone pick their role in production.
  if (options.isProduction) {
    throw new Error("The dev auth provider must not be used in production. Set AUTH_PROVIDER=external.");
  }
  return {
    async getUser() {
      const userId = verifySession(await options.readCookie(), options.secret) ?? DEFAULT_DEV_USER_ID;
      return findDevUser(userId) ?? null;
    },
  };
}
