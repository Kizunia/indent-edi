import { NextRequest, NextResponse } from "next/server";
import { createItem, searchItems } from "@/lib/store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  return NextResponse.json(searchItems(q));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.itemName || !body.unit) {
      return NextResponse.json({ error: "Item Name and Unit are required." }, { status: 400 });
    }
    const item = createItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create Item." }, { status: 400 });
  }
}
