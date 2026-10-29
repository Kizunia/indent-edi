import { NextRequest, NextResponse } from "next/server";
import { deleteIndentItem } from "@/lib/repositories/indents";
import { userMessage } from "@/lib/db/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; indentItemId: string }> }
) {
  const { id, indentItemId } = await params;
  try {
    const indent = await deleteIndentItem(id, indentItemId);
    return NextResponse.json(indent);
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to delete Item.") }, { status: 400 });
  }
}
