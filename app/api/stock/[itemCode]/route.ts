import { NextRequest, NextResponse } from "next/server";
import { getCurrentStock } from "@/lib/store";

// FR-07 / SRS §19: retrieve Current Stock using the Item's unique Item Code.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemCode: string }> }
) {
  const { itemCode } = await params;
  const quantity = getCurrentStock(decodeURIComponent(itemCode));
  return NextResponse.json({ itemCode, currentQuantity: quantity });
}
