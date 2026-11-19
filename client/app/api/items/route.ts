import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseQuery } from "@/lib/server/http/handler";
import { itemSearchQuerySchema } from "@/lib/shared/schemas/item";
import { searchItems } from "@/lib/services/items";

// GET /api/items?q=: item picker, max 20 results (DEC-025).
export const GET = apiRoute(async (req) => {
  const user = await requireUser();
  const { q } = parseQuery(req, itemSearchQuerySchema);
  return Response.json(await searchItems(user, q));
});
