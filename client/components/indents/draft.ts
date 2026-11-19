import type { CreateLineInput } from "@/lib/shared/schemas/indent";
import type { ItemOption, StockEntry } from "@/lib/services/types";

// A line while the user is still building the indent (client state only, BR-10).
export interface DraftLine {
  key: string;
  /** Existing item. Exactly one of itemId / newItem is set. */
  itemId?: number;
  newItem?: { itemName: string; specification?: string; drawingNumber?: string; defaultUnitId: number };
  /** null for a new item: "Assigned on save" (DEC-010). */
  itemCode: string | null;
  itemName: string;
  specification: string | null;
  drawingNumber: string | null;
  departmentId: number;
  purpose: string;
  requiredQuantity: string;
  requiredUnitId: number;
  requiredDate: string;
  /** Stock as displayed to the user; null = "Not available". The server re-reads it on save (DEC-013). */
  stock: string | null;
}

let counter = 0;
export const newLineKey = () => `line-${Date.now().toString(36)}-${counter++}`;

/** Request body for one line. Display-only fields (stock, names) are not sent. */
export function toCreateLine(l: DraftLine): CreateLineInput {
  return {
    ...(l.itemId !== undefined ? { itemId: l.itemId } : { newItem: l.newItem }),
    departmentId: l.departmentId,
    ...(l.purpose.trim() ? { purpose: l.purpose.trim() } : {}),
    requiredQuantity: l.requiredQuantity.trim(),
    requiredUnitId: l.requiredUnitId,
    requiredDate: l.requiredDate,
  };
}

export interface StockChange {
  itemName: string;
  was: string | null;
  now: string | null;
}

/**
 * Compares the stock shown to the user with the current stock (DEC-013 step 4).
 * Compared as numbers, so "5" and "5.0000" are the same.
 */
export function diffStock(
  lines: { itemId?: number; itemName: string; stock: string | null }[],
  current: StockEntry[]
): StockChange[] {
  const byId = new Map(current.map((c) => [c.itemId, c.quantity]));
  const same = (a: string | null, b: string | null) =>
    a === null || b === null ? a === b : Number(a) === Number(b);
  return lines.flatMap((l) => {
    if (l.itemId === undefined || !byId.has(l.itemId)) return [];
    const now = byId.get(l.itemId) ?? null;
    return same(l.stock, now) ? [] : [{ itemName: l.itemName, was: l.stock, now }];
  });
}

/**
 * The one item whose name (field "name") or code (field "code") equals the typed
 * text, ignoring case and surrounding spaces. Undefined when nothing or more than
 * one item matches, so an ambiguous name is never picked silently.
 */
export function matchOption(text: string, options: ItemOption[], field: "name" | "code"): ItemOption | undefined {
  const wanted = text.trim().toLowerCase();
  if (wanted === "") return undefined;
  const hits = options.filter((o) => (field === "name" ? o.itemName : o.itemCode).trim().toLowerCase() === wanted);
  return hits.length === 1 ? hits[0] : undefined;
}
