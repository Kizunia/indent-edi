import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth/current-user";
import type { AuthUser } from "./auth/types";
import { isAppError } from "./errors";

// Server-rendered pages call the same services as the API and need the same
// outcomes as standard pages instead of JSON (docs/spec/ui.md section 1).

/** The signed-in user, or a redirect to the "not signed in" page. */
export async function pageUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/not-signed-in");
  return user;
}

/** Runs a service call and maps its AppErrors to the standard pages. Other errors reach error.tsx. */
export async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isAppError(err)) {
      if (err.code === "NOT_FOUND") notFound();
      if (err.code === "FORBIDDEN") redirect("/forbidden");
      if (err.code === "UNAUTHENTICATED") redirect("/not-signed-in");
    }
    throw err;
  }
}
