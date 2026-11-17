import { NextRequest, NextResponse } from "next/server";
import { deleteIndentItem } from "@/lib/repositories/indents";
import { userMessage } from "@/lib/db/errors";
import { legacyLineParamsSchema } from "@/lib/shared/schemas/legacy";
import { validate, validationResponse } from "@/lib/server/http/legacy";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; indentItemId: string }> }
) {
  try {
    const { id, indentItemId } = validate(await params, legacyLineParamsSchema);
    const indent = await deleteIndentItem(id, indentItemId);
    return NextResponse.json(indent);
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to delete Item.") }, { status: 400 });
  }
}
