import { NextRequest, NextResponse } from "next/server";
import { createItem, searchItems } from "@/lib/repositories/items";
import { userMessage } from "@/lib/db/errors";
import { legacyCreateItemSchema, legacyItemSearchSchema } from "@/lib/shared/schemas/legacy";
import { validateBody, validateQuery, validationResponse } from "@/lib/server/http/legacy";

export async function GET(req: NextRequest) {
  try {
    const { q } = validateQuery(req, legacyItemSearchSchema);
    return NextResponse.json(await searchItems(q));
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to search Items.") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await validateBody(req, legacyCreateItemSchema);
    const item = await createItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to create Item.") }, { status: 400 });
  }
}
