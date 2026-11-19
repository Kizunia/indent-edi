import { z } from "zod";
import { parseValue } from "./handler";

// Dynamic route parameters. Next.js passes them as a Promise (v15+).

export const indentParamsSchema = z.object({ indentNumber: z.string().trim().min(1).max(30) });
export const lineParamsSchema = indentParamsSchema.extend({
  lineId: z.coerce.number({ error: "Line id is not valid." }).int("Line id is not valid.").positive("Line id is not valid."),
});

export type IndentRouteContext = { params: Promise<{ indentNumber: string }> };
export type LineRouteContext = { params: Promise<{ indentNumber: string; lineId: string }> };

export async function indentParams(ctx: IndentRouteContext) {
  return parseValue(await ctx.params, indentParamsSchema);
}

export async function lineParams(ctx: LineRouteContext) {
  return parseValue(await ctx.params, lineParamsSchema);
}
