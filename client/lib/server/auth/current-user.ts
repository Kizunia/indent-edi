import { cookies } from "next/headers";
import { AppError } from "../errors";
import { getConfig } from "../config";
import { DEV_SESSION_COOKIE } from "./dev-provider";
import { selectProvider } from "./select-provider";
import type { AuthUser } from "./types";

/** The only way server code learns who the user is (DEC-003). Null when not signed in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const provider = selectProvider(getConfig(), async () => (await cookies()).get(DEV_SESSION_COOKIE)?.value);
  return provider.getUser();
}

/** Like getCurrentUser() but throws UNAUTHENTICATED (401) when nobody is signed in. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}
