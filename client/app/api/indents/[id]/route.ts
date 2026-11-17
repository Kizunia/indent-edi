import { NextRequest, NextResponse } from "next/server";
import { deleteIndent, getIndentById, updateIndent } from "@/lib/repositories/indents";
import { userMessage } from "@/lib/db/errors";
import { legacyIdParamSchema, legacyUpdateIndentSchema } from "@/lib/shared/schemas/legacy";
import { validate, validateBody, validationResponse } from "@/lib/server/http/legacy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = validate(await params, legacyIdParamSchema);
    const indent = await getIndentById(id).catch(() => undefined);
    if (!indent) return NextResponse.json({ error: "Indent not found." }, { status: 404 });
    return NextResponse.json(indent);
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to load Indent.") }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = validate(await params, legacyIdParamSchema);
    const body = await validateBody(req, legacyUpdateIndentSchema);
    const indent = await updateIndent(id, body);
    return NextResponse.json(indent);
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to update Indent.") }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = validate(await params, legacyIdParamSchema);
    await deleteIndent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to delete Indent.") }, { status: 400 });
  }
}
