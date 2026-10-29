import { prisma } from "@/lib/db/client";

// FR-07 / SRS §19: Current Stock by Item Code. Backed by the local
// stock_balance table; replace the body with a call to the Inventory/Stock
// system when it is available. Nothing in the indent flow ever writes stock
// (BR-04).
export async function getCurrentStock(itemCode: string): Promise<number> {
  const row = await prisma.stockBalance.findFirst({
    where: { item: { itemCode } },
  });
  return row ? Number(row.currentQuantity) : 0;
}
