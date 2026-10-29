import { NextRequest, NextResponse } from "next/server";
import { deleteIndent, getIndentById, updateIndent } from "@/lib/repositories/indents";
import { userMessage } from "@/lib/db/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const indent = await getIndentById(id).catch(() => undefined);
  if (!indent) return NextResponse.json({ error: "Indent not found." }, { status: 404 });
  return NextResponse.json(indent);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const indent = await updateIndent(id, body);
    return NextResponse.json(indent);
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to update Indent.") }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteIndent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to delete Indent.") }, { status: 400 });
  }
}
