import { NextRequest, NextResponse } from "next/server";
import { createIndent, queryIndents } from "@/lib/repositories/indents";
import { userMessage } from "@/lib/db/errors";
import { legacyCreateIndentSchema, legacyListQuerySchema } from "@/lib/shared/schemas/legacy";
import { validateBody, validateQuery, validationResponse } from "@/lib/server/http/legacy";

export async function GET(req: NextRequest) {
  try {
    const filters = validateQuery(req, legacyListQuerySchema);
    return NextResponse.json(await queryIndents(filters));
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to load Indents.") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await validateBody(req, legacyCreateIndentSchema);
    const indent = await createIndent(body);
    return NextResponse.json(indent, { status: 201 });
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to create Indent.") }, { status: 400 });
  }
}
