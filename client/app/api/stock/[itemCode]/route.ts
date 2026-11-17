import { NextRequest, NextResponse } from "next/server";
import { getCurrentStock } from "@/lib/repositories/stock";
import { userMessage } from "@/lib/db/errors";
import { legacyItemCodeSchema } from "@/lib/shared/schemas/legacy";
import { validate, validationResponse } from "@/lib/server/http/legacy";

// FR-07 / SRS §19: retrieve Current Stock using the Item's unique Item Code.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemCode: string }> }
) {
  try {
    const { itemCode } = validate(await params, legacyItemCodeSchema);
    const quantity = await getCurrentStock(decodeURIComponent(itemCode));
    return NextResponse.json({ itemCode, currentQuantity: quantity });
  } catch (err) {
    return validationResponse(err) ?? NextResponse.json({ error: userMessage(err, "Failed to retrieve Current Stock.") }, { status: 500 });
  }
}
