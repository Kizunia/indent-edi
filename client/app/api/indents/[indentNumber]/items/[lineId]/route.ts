import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseJson, parseQuery } from "@/lib/server/http/handler";
import { lineParams, type LineRouteContext } from "@/lib/server/http/params";
import { updateLineSchema, versionQuerySchema } from "@/lib/shared/schemas/indent";
import { deleteLine, updateLine } from "@/lib/services/indents";

// PATCH /api/indents/{indentNumber}/items/{lineId}: editable line fields of a Draft (DEC-007).
export const PATCH = apiRoute<LineRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber, lineId } = await lineParams(ctx);
  const body = await parseJson(req, updateLineSchema);
  return Response.json(await updateLine(user, indentNumber, lineId, body));
});

// DELETE /api/indents/{indentNumber}/items/{lineId}?version=: never the last line (BR-01).
export const DELETE = apiRoute<LineRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber, lineId } = await lineParams(ctx);
  const { version } = parseQuery(req, versionQuerySchema);
  return Response.json(await deleteLine(user, indentNumber, lineId, version));
});
