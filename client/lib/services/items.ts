import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { authorize, can } from "../server/auth/authorize";
import type { AuthUser } from "../server/auth/types";
import { getStockProvider } from "./stock-provider";
import type { ItemOption, StockEntry } from "./types";

export const ITEM_SEARCH_LIMIT = 20;

/** Escapes LIKE wildcards so a typed % or _ matches literally (DEC-011 point 4). */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

function requireItemAccess(user: AuthUser | null): asserts user is AuthUser {
  if (user && (can(user, "indent.create") || can(user, "indent.edit"))) return;
  authorize(user, "indent.create");
}

const include = { defaultUnit: true } satisfies Prisma.ItemInclude;

function toOption(i: Prisma.ItemGetPayload<{ include: typeof include }>): ItemOption {
  return {
    id: i.id,
    itemCode: i.itemCode,
    itemName: i.itemName,
    specification: i.specification,
    drawingNumber: i.drawingNumber,
    defaultUnit: i.defaultUnit
      ? { id: i.defaultUnit.id, code: i.defaultUnit.code, name: i.defaultUnit.name, symbol: i.defaultUnit.symbol }
      : null,
  };
}

/** Item picker (DEC-025): active items, names/codes starting with the term first, max 20. */
export async function searchItems(
  user: AuthUser | null,
  q: string
): Promise<{ items: ItemOption[]; hasMore: boolean }> {
  requireItemAccess(user);
  const term = escapeLike(q.trim());
  const limit = ITEM_SEARCH_LIMIT + 1; // one extra row tells us whether there are more
  const active = { isActive: true } satisfies Prisma.ItemWhereInput;
  const order = [{ itemName: "asc" }, { id: "asc" }] satisfies Prisma.ItemOrderByWithRelationInput[];

  if (term === "") {
    const rows = await prisma.item.findMany({ where: active, include, orderBy: order, take: limit });
    return { items: rows.slice(0, ITEM_SEARCH_LIMIT).map(toOption), hasMore: rows.length > ITEM_SEARCH_LIMIT };
  }

  const starts = await prisma.item.findMany({
    where: { ...active, OR: [{ itemName: { startsWith: term } }, { itemCode: { startsWith: term } }] },
    include,
    orderBy: order,
    take: limit,
  });
  let rows = starts;
  if (rows.length < limit) {
    const rest = await prisma.item.findMany({
      where: {
        ...active,
        id: { notIn: starts.map((r) => r.id) },
        OR: [{ itemName: { contains: term } }, { itemCode: { contains: term } }],
      },
      include,
      orderBy: order,
      take: limit - rows.length,
    });
    rows = [...starts, ...rest];
  }
  return { items: rows.slice(0, ITEM_SEARCH_LIMIT).map(toOption), hasMore: rows.length > ITEM_SEARCH_LIMIT };
}

/** Current stock for items (FR-07). Never writes (BR-04). Failure -> STOCK_UNAVAILABLE. */
export async function getStock(user: AuthUser | null, itemIds: number[]): Promise<StockEntry[]> {
  requireItemAccess(user);
  const map = await getStockProvider().getStock(itemIds);
  return itemIds.map((id) => map.get(id) ?? { itemId: id, quantity: null, updatedAt: null });
}
