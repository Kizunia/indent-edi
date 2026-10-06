import { NextRequest, NextResponse } from "next/server";
import { deleteIndent, getIndentById, updateIndent } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const indent = getIndentById(id);
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
    const indent = updateIndent(id, body);
    return NextResponse.json(indent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update Indent." }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    deleteIndent(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete Indent." }, { status: 400 });
  }
}
