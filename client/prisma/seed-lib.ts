// Shared helpers for prisma/seed.ts and prisma/seed-sample.ts.
// SAMPLE data only: nothing here is company data (SRS 7.3 / 7.4 are TBD).
import { Prisma } from "@prisma/client";
import { nextSequence } from "../lib/db/sequence";
import { formatSequenceNumber } from "../lib/shared/format";
import { getConfig } from "../lib/server/config";

/**
 * Seeded indents are created by the dev auth users (lib/server/auth/dev-users.ts)
 * so that every role in the dev user switcher has data to see (DEC-003, DEC-004).
 * `id` must equal a dev user id; `name` is the readable name shown in the UI.
 */
export const CREATORS = {
  "Amit Patil": { id: "dev-emp-1", name: "Amit Patil" },
  "Neha Kulkarni": { id: "dev-emp-2", name: "Neha Kulkarni" },
  "Sneha Joshi": { id: "dev-head-1", name: "Sneha Joshi" },
  "Rohit Deshmukh": { id: "dev-admin", name: "Rohit Deshmukh" },
  "Vikram Rane": { id: "dev-store", name: "Vikram Rane" },
  "Soham Kale": { id: "dev-purchase", name: "Soham Kale" },
} as const;
export type CreatorName = keyof typeof CREATORS;

/**
 * Department order matters: the dev users reference department ids 1 and 2
 * (Production, Maintenance). Explicit ids keep that true on a fresh database.
 */
export const DEPARTMENTS = ["Production", "Maintenance", "Quality Control", "Stores", "Administration"];
export const INDENT_TYPES = ["Purchase", "Maintenance", "Production", "Consumables"];

export const slug = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");

export const utc = (date: string, time = "00:00") => new Date(`${date}T${time}:00.000Z`);

export async function ensureUnit(tx: Prisma.TransactionClient, code: string) {
  return tx.unit.upsert({ where: { code }, update: {}, create: { code, name: code } });
}

/** Next Indent Number from the single INDENT counter, in the configured format (DEC-010). */
export async function nextIndentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const { prefix, pad } = getConfig().indentNumber;
  return formatSequenceNumber(prefix, pad, await nextSequence(tx, "INDENT"));
}

/** Next Item Code from the ITEM counter, in the configured format (DEC-010). */
export async function nextItemCode(tx: Prisma.TransactionClient): Promise<string> {
  const { prefix, pad } = getConfig().itemCode;
  return formatSequenceNumber(prefix, pad, await nextSequence(tx, "ITEM"));
}

/** Creates an item and its stock row unless an item with this name already exists. */
export async function ensureItem(
  tx: Prisma.TransactionClient,
  def: { name: string; specification: string; drawingNumber: string; unit: string; stock: number; stockAt: Date }
) {
  const existing = await tx.item.findFirst({ where: { itemName: def.name } });
  if (existing) return existing;
  const unit = await ensureUnit(tx, def.unit);
  const item = await tx.item.create({
    data: {
      itemCode: await nextItemCode(tx),
      itemName: def.name,
      specification: def.specification || null,
      drawingNumber: def.drawingNumber || null,
      defaultUnitId: unit.id,
    },
  });
  await tx.stockBalance.create({
    data: { itemId: item.id, currentQuantity: def.stock, updatedAt: def.stockAt },
  });
  return item;
}
