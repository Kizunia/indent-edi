import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import type {
  Indent,
  IndentFilters,
  IndentItem,
  Item,
  StockRecord,
  Department,
  IndentType,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string): T {
  const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

function writeJson<T>(file: string, data: T) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Reference / master data
// SRS §7.4, §7.3: Department Master source and full Indent Type governance
// are TBD. These are read from local seed files as a stand-in for the
// eventual Department Master / Indent Type Master integration.
// ---------------------------------------------------------------------------
export function getDepartments(): Department[] {
  return readJson<Department[]>("departments.json");
}

export function getIndentTypes(): IndentType[] {
  return readJson<IndentType[]>("indent-types.json");
}

// ---------------------------------------------------------------------------
// Item Master (SRS §8.5: TBD whether recreated, integrated, or used directly.
// Implemented here as a recreated local table, kept behind functions so it
// can be swapped for an integration call later without touching callers.)
// ---------------------------------------------------------------------------
export function getItems(): Item[] {
  return readJson<Item[]>("items.json");
}

export function findItemByCode(itemCode: string): Item | undefined {
  return getItems().find((i) => i.itemCode === itemCode);
}

export function searchItems(query: string): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return getItems().slice(0, 20);
  return getItems()
    .filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q)
    )
    .slice(0, 20);
}

// Item Code generation format is TBD (SRS §14). Placeholder: ITM-##### sequential.
export function createItem(input: {
  itemName: string;
  specification?: string;
  drawingNumber?: string;
  unit: string;
}): Item {
  const items = getItems();
  const nextSeq = items.length + 1;
  const itemCode = `ITM-${String(nextSeq).padStart(5, "0")}`;
  const item: Item = {
    id: uuid(),
    itemCode,
    itemName: input.itemName,
    specification: input.specification || "",
    drawingNumber: input.drawingNumber || "",
    unit: input.unit,
  };
  items.push(item);
  writeJson("items.json", items);

  // New item starts with zero recorded stock until the Stock/Inventory
  // system provides a real figure (SRS §18: Current Stock source).
  const stock = readJson<StockRecord[]>("stock.json");
  stock.push({ itemCode, currentQuantity: 0, updatedAt: new Date().toISOString() });
  writeJson("stock.json", stock);

  return item;
}

// ---------------------------------------------------------------------------
// Current Stock (SRS §17–§22)
// ---------------------------------------------------------------------------
export function getCurrentStock(itemCode: string): number {
  const stock = readJson<StockRecord[]>("stock.json");
  const rec = stock.find((s) => s.itemCode === itemCode);
  return rec ? rec.currentQuantity : 0;
}

// ---------------------------------------------------------------------------
// Indents
// ---------------------------------------------------------------------------
export function getAllIndents(): Indent[] {
  return readJson<Indent[]>("indents.json");
}

function saveAllIndents(indents: Indent[]) {
  writeJson("indents.json", indents);
}

// Indent Number format is TBD (SRS §8: "PURC000123" was only an example).
// Placeholder used here: IND-YYYYMMDD-#### sequential per day.
export function generateIndentNumber(): string {
  const indents = getAllIndents();
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const todaysCount = indents.filter((i) => i.indentNumber.includes(datePart)).length;
  const seq = String(todaysCount + 1).padStart(4, "0");
  return `IND-${datePart}-${seq}`;
}

export function getIndentById(id: string): Indent | undefined {
  return getAllIndents().find((i) => i.id === id);
}

export interface CreateIndentInput {
  indentType: string;
  indentDate: string;
  time: string;
  department: string;
  createdBy: string;
  remark?: string;
  status: "Draft" | "Submitted";
  items: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    specification?: string;
    drawingNumber?: string;
    department: string;
    purpose?: string;
    currentStockAtEntry: number;
    requiredQuantity: number;
    requiredDate: string;
    unit: string;
  }>;
}

// FR-08 / SRS §25: an Indent cannot be saved without at least one item.
export function createIndent(input: CreateIndentInput): Indent {
  if (!input.items || input.items.length === 0) {
    throw new Error("An Indent cannot be saved without at least one Item.");
  }

  const now = new Date().toISOString();
  const indent: Indent = {
    id: uuid(),
    indentNumber: generateIndentNumber(),
    indentType: input.indentType,
    indentDate: input.indentDate,
    time: input.time,
    department: input.department,
    createdBy: input.createdBy,
    remark: input.remark || "",
    status: input.status,
    items: input.items.map((it) => ({
      indentItemId: uuid(),
      ...it,
    })) as IndentItem[],
    createdAt: now,
    updatedAt: now,
  };

  const indents = getAllIndents();
  indents.unshift(indent);
  saveAllIndents(indents);
  return indent;
}

export interface UpdateIndentInput {
  remark?: string;
  status?: Indent["status"];
  // SRS §29 / §39: exact editable item fields (before and after submission)
  // are TBD. Placeholder: purpose, requiredQuantity, requiredDate, unit are
  // editable; itemName/itemCode/specification/drawingNumber are not, and
  // Indent-level fields other than remark/status are immutable (SRS §28).
  items?: Array<{
    indentItemId: string;
    purpose?: string;
    requiredQuantity?: number;
    requiredDate?: string;
    unit?: string;
  }>;
}

export function updateIndent(id: string, input: UpdateIndentInput): Indent {
  const indents = getAllIndents();
  const idx = indents.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error("Indent not found.");

  const indent = indents[idx];

  if (input.remark !== undefined) indent.remark = input.remark;
  if (input.status !== undefined) indent.status = input.status;

  if (input.items) {
    for (const patch of input.items) {
      const item = indent.items.find((i) => i.indentItemId === patch.indentItemId);
      if (!item) continue;
      if (patch.purpose !== undefined) item.purpose = patch.purpose;
      if (patch.requiredQuantity !== undefined) item.requiredQuantity = patch.requiredQuantity;
      if (patch.requiredDate !== undefined) item.requiredDate = patch.requiredDate;
      if (patch.unit !== undefined) item.unit = patch.unit;
    }
  }

  indent.updatedAt = new Date().toISOString();
  indents[idx] = indent;
  saveAllIndents(indents);
  return indent;
}

export function deleteIndentItem(indentId: string, indentItemId: string): Indent {
  const indents = getAllIndents();
  const idx = indents.findIndex((i) => i.id === indentId);
  if (idx === -1) throw new Error("Indent not found.");
  const indent = indents[idx];

  // FR-08: an Indent must retain at least one item.
  if (indent.items.length <= 1) {
    throw new Error("Cannot remove the last remaining Item from an Indent.");
  }
  indent.items = indent.items.filter((i) => i.indentItemId !== indentItemId);
  indent.updatedAt = new Date().toISOString();
  indents[idx] = indent;
  saveAllIndents(indents);
  return indent;
}

export function deleteIndent(id: string): void {
  const indents = getAllIndents();
  const next = indents.filter((i) => i.id !== id);
  if (next.length === indents.length) throw new Error("Indent not found.");
  saveAllIndents(next);
}

// FR-12 / FR-13: search + filters. Search behavior (exact vs partial) is
// TBD (SRS §33); partial, case-insensitive "contains" match is used here.
export function queryIndents(filters: IndentFilters): {
  results: Indent[];
  total: number;
  page: number;
  pageSize: number;
} {
  let indents = getAllIndents();

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    indents = indents.filter((i) => i.indentNumber.toLowerCase().includes(q));
  }
  if (filters.indentType) {
    indents = indents.filter((i) => i.indentType === filters.indentType);
  }
  if (filters.department) {
    indents = indents.filter((i) => i.department === filters.department);
  }
  if (filters.status) {
    indents = indents.filter((i) => i.status === filters.status);
  }
  if (filters.createdBy && filters.createdBy.trim()) {
    const q = filters.createdBy.trim().toLowerCase();
    indents = indents.filter((i) => i.createdBy.toLowerCase().includes(q));
  }
  if (filters.dateFrom) {
    indents = indents.filter((i) => i.indentDate >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    indents = indents.filter((i) => i.indentDate <= filters.dateTo!);
  }

  indents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const total = indents.length;
  // FR-15: confirmed page size of 10 records per page.
  const pageSize = filters.pageSize || 10;
  const page = filters.page || 1;
  const start = (page - 1) * pageSize;
  const results = indents.slice(start, start + pageSize);

  return { results, total, page, pageSize };
}
