import { cookies } from "next/headers";
import { z } from "zod";
import { AppError } from "@/lib/server/errors";
import { getConfig } from "@/lib/server/config";
import { apiRoute, parseJson } from "@/lib/server/http/handler";
import { DEV_SESSION_COOKIE, findDevUser, signSession, verifySession } from "@/lib/server/auth/dev-provider";
import { DEFAULT_DEV_USER_ID, DEV_USERS } from "@/lib/server/auth/dev-users";

// Dev-only user/role switcher (DEC-003). Answers 404 unless the dev provider is
// active and the app is not in production, so it cannot be used to impersonate.
function assertDevEnabled() {
  const config = getConfig();
  if (config.isProduction || config.authProvider !== "dev") throw new AppError("NOT_FOUND");
  return config;
}

// GET: the selectable users and the current one.
export const GET = apiRoute(async () => {
  const config = assertDevEnabled();
  const stored = (await cookies()).get(DEV_SESSION_COOKIE)?.value;
  const currentUserId = verifySession(stored, config.devSessionSecret) ?? DEFAULT_DEV_USER_ID;
  return Response.json({
    enabled: true,
    currentUserId,
    users: DEV_USERS.map((u) => ({ id: u.id, name: u.name, roles: u.roles })),
  });
});

// POST { userId }: switch user.
export const POST = apiRoute(async (req) => {
  const config = assertDevEnabled();
  const { userId } = await parseJson(req, z.strictObject({ userId: z.string().min(1).max(64) }));
  if (!findDevUser(userId)) {
    throw new AppError("VALIDATION_FAILED", { fieldErrors: { userId: "Unknown user." } });
  }
  (await cookies()).set(DEV_SESSION_COOKIE, signSession(userId, config.devSessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return Response.json({ currentUserId: userId });
});
