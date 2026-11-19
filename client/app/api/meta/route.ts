import { authorize } from "@/lib/server/auth/authorize";
import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute } from "@/lib/server/http/handler";
import { getMeta } from "@/lib/services/masters";

// GET /api/meta: active masters for the filters and forms (docs/spec/api.md).
export const GET = apiRoute(async () => {
  const user = await requireUser();
  authorize(user, "indent.view");
  return Response.json(await getMeta());
});
