import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseJson, parseQuery } from "@/lib/server/http/handler";
import { createIndentSchema, listQuerySchema } from "@/lib/shared/schemas/indent";
import { createIndent, listIndents } from "@/lib/services/indents";

// GET /api/indents: filtered, searched, paged list (FR-11..FR-15).
export const GET = apiRoute(async (req) => {
  const user = await requireUser();
  const query = parseQuery(req, listQuerySchema);
  return Response.json(await listIndents(user, query));
});

// POST /api/indents: create a Draft, or Draft + Submit when `submit` is true (DEC-006).
export const POST = apiRoute(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, createIndentSchema);
  return Response.json(await createIndent(user, body), { status: 201 });
});
