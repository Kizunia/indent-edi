import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { authorize } from "../server/auth/authorize";
import type { AuthUser } from "../server/auth/types";
import { AppError } from "../server/errors";
import type { ExportInput } from "../shared/schemas/indent";
import { listWhere } from "./indents";
import { scopeWhere } from "./scope";

// Data side of the Excel export (DEC-018, docs/spec/export-print.md). Selecting
// the ids is cheap (integers only); the heavy rows are loaded in small batches
// by the workbook writer, so memory stays flat for large exports.

export const EXPORT_BATCH_SIZE = 500;

const exportInclude = {
  indentType: true,
  department: true,
  status: true,
  items: { orderBy: { lineNumber: "asc" }, include: { department: true, requiredUnit: true } },
} satisfies Prisma.IndentInclude;

export type ExportIndent = Prisma.IndentGetPayload<{ include: typeof exportInclude }>;

/**
 * Authorizes and resolves which indents to export, newest first (indent_date
 * DESC, id DESC). Only indents inside the user's export scope are returned;
 * soft-deleted ones never are.
 */
export async function selectExportIds(user: AuthUser | null, input: ExportInput): Promise<number[]> {
  authorize(user, "indent.export");
  const where: Prisma.IndentWhereInput =
    "indentNumbers" in input
      ? { AND: [scopeWhere(user, "indent.export"), { indentNumber: { in: input.indentNumbers } }] }
      : listWhere(user, "indent.export", input.filters);
  const rows = await prisma.indent.findMany({
    where,
    select: { id: true },
    orderBy: [{ indentDate: "desc" }, { id: "desc" }],
  });
  if (rows.length === 0 && "indentNumbers" in input) throw new AppError("NOT_FOUND");
  return rows.map((r) => r.id);
}

/** Loads one batch of full indents, keeping the order of `ids`. */
export async function loadExportBatch(ids: number[]): Promise<ExportIndent[]> {
  const rows = await prisma.indent.findMany({ where: { id: { in: ids }, deletedAt: null }, include: exportInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
