import { prisma } from "@/lib/db/client";
import { nextSequence } from "@/lib/db/sequence";
import { itemInclude, toItemDto } from "@/lib/db/mappers";
import { findOrCreateUnit } from "./masters";
import type { Item } from "@/lib/types";

// SRS §8.5: Item Master recreated locally, kept behind these functions so it
// can be swapped for an integration later.
export async function searchItems(query: string): Promise<Item[]> {
  const q = query.trim();
  const rows = await prisma.item.findMany({
    where: {
      isActive: true,
      ...(q && { OR: [{ itemName: { contains: q } }, { itemCode: { contains: q } }] }),
    },
    include: itemInclude,
    orderBy: { itemName: "asc" },
    take: 20,
  });
  return rows.map(toItemDto);
}

// Item Code format is TBD (SRS §14). Placeholder: ITM-##### from the ITEM counter.
export async function createItem(input: {
  itemName: string;
  specification?: string;
  drawingNumber?: string;
  unit: string;
}): Promise<Item> {
  const row = await prisma.$transaction(async (tx) => {
    const unit = await findOrCreateUnit(tx, input.unit);
    const seq = await nextSequence(tx, "ITEM");
    const item = await tx.item.create({
      data: {
        itemCode: `ITM-${String(seq).padStart(5, "0")}`,
        itemName: input.itemName.trim(),
        specification: input.specification || null,
        drawingNumber: input.drawingNumber || null,
        defaultUnitId: unit.id,
      },
      include: itemInclude,
    });
    // New item starts with zero recorded stock until the Stock/Inventory
    // system provides a real figure.
    await tx.stockBalance.create({
      data: { itemId: item.id, currentQuantity: 0, updatedAt: new Date() },
    });
    return item;
  });
  return toItemDto(row);
}
