import { NextRequest, NextResponse } from "next/server";
import { deleteIndentItem } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; indentItemId: string }> }
) {
  const { id, indentItemId } = await params;
  try {
    const indent = deleteIndentItem(id, indentItemId);
    return NextResponse.json(indent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete Item." }, { status: 400 });
  }
}
