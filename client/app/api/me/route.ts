import { allowedActions } from "@/lib/server/auth/authorize";
import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute } from "@/lib/server/http/handler";

// GET /api/me (docs/spec/api.md): who is signed in and what they may do.
// The UI uses this to hide controls; the server still checks every request.
export const GET = apiRoute(async () => {
  const user = await requireUser();
  return Response.json({
    user: { id: user.id, name: user.name, roles: user.roles, departmentId: user.departmentId ?? null },
    actions: allowedActions(user),
  });
});
