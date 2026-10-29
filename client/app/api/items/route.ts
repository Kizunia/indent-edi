import { NextRequest, NextResponse } from "next/server";
import { createItem, searchItems } from "@/lib/repositories/items";
import { userMessage } from "@/lib/db/errors";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    return NextResponse.json(await searchItems(q));
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to search Items.") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.itemName || !body.unit) {
      return NextResponse.json({ error: "Item Name and Unit are required." }, { status: 400 });
    }
    const item = await createItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to create Item.") }, { status: 400 });
  }
}
