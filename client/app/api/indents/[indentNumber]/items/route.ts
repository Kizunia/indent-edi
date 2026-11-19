import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseJson } from "@/lib/server/http/handler";
import { indentParams, type IndentRouteContext } from "@/lib/server/http/params";
import { addLineSchema } from "@/lib/shared/schemas/indent";
import { addLine } from "@/lib/services/indents";

// POST /api/indents/{indentNumber}/items: add a line to a Draft.
export const POST = apiRoute<IndentRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber } = await indentParams(ctx);
  const body = await parseJson(req, addLineSchema);
  return Response.json(await addLine(user, indentNumber, body), { status: 201 });
});
