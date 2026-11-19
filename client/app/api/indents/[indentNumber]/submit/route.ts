import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute, parseJson } from "@/lib/server/http/handler";
import { indentParams, type IndentRouteContext } from "@/lib/server/http/params";
import { submitSchema } from "@/lib/shared/schemas/indent";
import { submitIndent } from "@/lib/services/indents";

// POST /api/indents/{indentNumber}/submit: the only way out of Draft (BR-05).
export const POST = apiRoute<IndentRouteContext>(async (req, ctx) => {
  const user = await requireUser();
  const { indentNumber } = await indentParams(ctx);
  const { version } = await parseJson(req, submitSchema);
  return Response.json(await submitIndent(user, indentNumber, version));
});
