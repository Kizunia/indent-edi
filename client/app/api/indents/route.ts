import { NextRequest, NextResponse } from "next/server";
import { createIndent, queryIndents } from "@/lib/store";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters = {
    search: sp.get("search") || undefined,
    indentType: sp.get("indentType") || undefined,
    department: sp.get("department") || undefined,
    status: sp.get("status") || undefined,
    createdBy: sp.get("createdBy") || undefined,
    dateFrom: sp.get("dateFrom") || undefined,
    dateTo: sp.get("dateTo") || undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 10,
  };
  const data = queryIndents(filters);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "An Indent cannot be saved without at least one Item." },
        { status: 400 }
      );
    }
    if (!body.indentType || !body.department || !body.createdBy || !body.indentDate) {
      return NextResponse.json(
        { error: "Indent Type, Department, Created By, and Indent Date are required." },
        { status: 400 }
      );
    }

    const indent = createIndent(body);
    return NextResponse.json(indent, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create Indent." }, { status: 400 });
  }
}
