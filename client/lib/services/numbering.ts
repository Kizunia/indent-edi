import type { Prisma } from "@prisma/client";
import { nextSequence } from "../db/sequence";
import { getConfig } from "../server/config";
import { formatSequenceNumber } from "../shared/format";

// Number and code allocation (DEC-010). Call as late as possible in the
// transaction: the counter row stays locked until it commits.

/** Next Indent Number from the single INDENT counter, in the configured format. */
export async function nextIndentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const { prefix, pad } = getConfig().indentNumber;
  return formatSequenceNumber(prefix, pad, await nextSequence(tx, "INDENT"));
}

/** Next Item Code from the ITEM counter, in the configured format. */
export async function nextItemCode(tx: Prisma.TransactionClient): Promise<string> {
  const { prefix, pad } = getConfig().itemCode;
  return formatSequenceNumber(prefix, pad, await nextSequence(tx, "ITEM"));
}

/** The number the next indent would get. Preview only: reserves nothing (DEC-010). */
export async function previewIndentNumber(db: Prisma.TransactionClient): Promise<string> {
  const { prefix, pad } = getConfig().indentNumber;
  const row = await db.numberSequence.findUnique({ where: { scope: "INDENT" } });
  return formatSequenceNumber(prefix, pad, (row?.lastValue ?? 0) + 1);
}
