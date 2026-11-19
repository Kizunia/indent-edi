import { prisma } from "../db/client";
import { AppError } from "../server/errors";
import type { StockEntry } from "./types";

// Stock is read only through this interface (DEC-013, BR-04): the indent
// services never write stock. The default implementation reads stock_balance;
// a real Inventory DB would be a second implementation (backlog B-06).
export interface StockProvider {
  /** One entry per requested id. Unknown items map to a null quantity ("Not available"). */
  getStock(itemIds: number[]): Promise<Map<number, StockEntry>>;
}

export const dbStockProvider: StockProvider = {
  async getStock(itemIds) {
    const ids = [...new Set(itemIds)];
    const result = new Map<number, StockEntry>(
      ids.map((itemId) => [itemId, { itemId, quantity: null, updatedAt: null }])
    );
    if (ids.length === 0) return result;
    try {
      const rows = await prisma.stockBalance.findMany({ where: { itemId: { in: ids } } });
      for (const r of rows) {
        result.set(r.itemId, {
          itemId: r.itemId,
          quantity: r.currentQuantity.toFixed(4),
          updatedAt: r.updatedAt.toISOString(),
        });
      }
      return result;
    } catch (cause) {
      throw new AppError("STOCK_UNAVAILABLE", { cause });
    }
  },
};

let current: StockProvider = dbStockProvider;

export const getStockProvider = (): StockProvider => current;

/** Test seam: swap the provider (pass nothing to restore the default). */
export function setStockProviderForTests(provider?: StockProvider): void {
  current = provider ?? dbStockProvider;
}
