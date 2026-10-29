import type { Prisma } from "@prisma/client";
import type { Indent, IndentItem, IndentStatus, Item } from "@/lib/types";
import { formatDate, formatTime } from "./dates";

// Prisma query shapes shared by the repositories and mappers.
export const indentInclude = {
  indentType: true,
  status: true,
  department: true,
  items: {
    include: { department: true, requiredUnit: true },
    orderBy: { lineNumber: "asc" },
  },
} satisfies Prisma.IndentInclude;

export const itemInclude = { defaultUnit: true } satisfies Prisma.ItemInclude;

export type IndentRow = Prisma.IndentGetPayload<{ include: typeof indentInclude }>;
export type ItemRow = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

// The API/UI contract (lib/types.ts) uses string ids and display names;
// the database uses integer keys and FKs. Conversion lives only here.
export function toItemDto(row: ItemRow): Item {
  return {
    id: String(row.id),
    itemCode: row.itemCode,
    itemName: row.itemName,
    specification: row.specification ?? "",
    drawingNumber: row.drawingNumber ?? "",
    unit: row.defaultUnit?.code ?? "",
  };
}

export function toIndentDto(row: IndentRow): Indent {
  const items: IndentItem[] = row.items.map((l) => ({
    indentItemId: String(l.id),
    itemId: String(l.itemId),
    itemCode: l.itemCodeSnapshot,
    itemName: l.itemNameSnapshot,
    specification: l.specificationSnapshot ?? "",
    drawingNumber: l.drawingNumberSnapshot ?? "",
    department: l.department.name,
    purpose: l.purpose ?? "",
    currentStockAtEntry: Number(l.currentStockSnapshot ?? 0),
    requiredQuantity: Number(l.requiredQuantity),
    requiredDate: formatDate(l.requiredDate),
    unit: l.requiredUnit.code,
  }));

  return {
    id: String(row.id),
    indentNumber: row.indentNumber,
    indentType: row.indentType.name,
    indentDate: formatDate(row.indentDate),
    time: formatTime(row.indentTime),
    department: row.department?.name ?? "",
    createdBy: row.createdByName,
    remark: row.remark ?? "",
    status: row.status.name as IndentStatus,
    items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parseId(value: string, what: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${what} not found.`);
  return n;
}
