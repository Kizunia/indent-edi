import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseJson, parseQuery } from "@/lib/server/http/handler";
import { indentParams, type IndentRouteContext } from "@/lib/server/http/params";
import { updateIndentSchema, versionQuerySchema } from "@/lib/shared/schemas/indent";
import { deleteIndent, getIndent, updateRemark } from "@/lib/services/indents";

// GET /api/indents/{indentNumber}
export const GET = apiRoute<IndentRouteContext>(async (_req, ctx) => {
  const user = await requireUser();
  const { indentNumber } = await indentParams(ctx);
  return Response.json(await getIndent(user, indentNumber));
});

// PATCH /api/indents/{indentNumber}: remark of a Draft (DEC-007).
export const PATCH = apiRoute<IndentRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber } = await indentParams(ctx);
  const body = await parseJson(req, updateIndentSchema);
  return Response.json(await updateRemark(user, indentNumber, body));
});

// DELETE /api/indents/{indentNumber}?version=: soft delete of a Draft (DEC-008).
export const DELETE = apiRoute<IndentRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber } = await indentParams(ctx);
  const { version } = parseQuery(req, versionQuerySchema);
  await deleteIndent(user, indentNumber, version);
  return new Response(null, { status: 204 });
});
