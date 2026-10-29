import { Prisma } from "@prisma/client";

// Concurrency-safe counter (data model D-12). The UPDATE takes an InnoDB row
// lock held until the surrounding transaction commits, so two saves can never
// receive the same value; a rolled-back save also rolls the counter back.
// Call this as late as possible in the transaction to keep the lock short.
export async function nextSequence(
  tx: Prisma.TransactionClient,
  scope: string
): Promise<number> {
  const bump = () =>
    tx.numberSequence.update({
      where: { scope },
      data: { lastValue: { increment: 1 } },
    });
  try {
    return (await bump()).lastValue;
  } catch (err) {
    // First use of a scoped counter (e.g. a new day): create it, then retry.
    // UPDATE is attempted first so existing rows never take a shared lock,
    // which would deadlock two concurrent callers. (`last_value` is a reserved
    // word in MySQL 8, so the identifiers must stay backtick-quoted.)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      await tx.$executeRaw(
        Prisma.sql`${Prisma.raw("INSERT IGNORE INTO `number_sequence` (`scope`, `last_value`, `updated_at`)")} VALUES (${scope}, 0, CURRENT_TIMESTAMP(3))`
      );
      return (await bump()).lastValue;
    }
    throw err;
  }
}
