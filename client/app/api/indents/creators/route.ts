import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute } from "@/lib/server/http/handler";
import { listCreators } from "@/lib/services/indents";

// GET /api/indents/creators: options for the Created By filter, within the user's scope.
export const GET = apiRoute(async () => {
  const user = await requireUser();
  return Response.json({ creators: await listCreators(user) });
});
