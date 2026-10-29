import { NextRequest, NextResponse } from "next/server";
import { getCurrentStock } from "@/lib/repositories/stock";
import { userMessage } from "@/lib/db/errors";

// FR-07 / SRS §19: retrieve Current Stock using the Item's unique Item Code.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemCode: string }> }
) {
  const { itemCode } = await params;
  try {
    const quantity = await getCurrentStock(decodeURIComponent(itemCode));
    return NextResponse.json({ itemCode, currentQuantity: quantity });
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to retrieve Current Stock.") }, { status: 500 });
  }
}
