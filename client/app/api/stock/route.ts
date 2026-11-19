import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseQuery } from "@/lib/server/http/handler";
import { stockQuerySchema } from "@/lib/shared/schemas/item";
import { getStock } from "@/lib/services/items";

// GET /api/stock?itemIds=1,2,3: null quantity means "Not available" (DEC-013).
export const GET = apiRoute(async (req) => {
  const user = await requireUser();
  const { itemIds } = parseQuery(req, stockQuerySchema);
  return Response.json({ stock: await getStock(user, itemIds) });
});
