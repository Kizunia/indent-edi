import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../server/errors";
import type { Meta } from "./types";

// Master data reads. Writes always reference active rows only (invariant 6).

export async function getMeta(): Promise<Meta> {
  const [departments, indentTypes, units, statuses] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
    prisma.indentType.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
    prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.indentStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    departments: departments.map(({ id, code, name }) => ({ id, code, name })),
    indentTypes: indentTypes.map(({ id, code, name }) => ({ id, code, name })),
    units: units.map(({ id, code, name, symbol }) => ({ id, code, name, symbol })),
    statuses: statuses.map(({ id, code, name, isEditable }) => ({ id, code, name, isEditable })),
  };
}

type Db = Prisma.TransactionClient;

const invalid = (path: string, message: string) =>
  new AppError("VALIDATION_FAILED", { fieldErrors: { [path]: message } });

export async function requireIndentType(db: Db, id: number, path = "indentTypeId") {
  const row = await db.indentType.findFirst({ where: { id, isActive: true } });
  if (!row) throw invalid(path, "Select a valid indent type.");
  return row;
}

export async function requireDepartment(db: Db, id: number, path: string) {
  const row = await db.department.findFirst({ where: { id, isActive: true } });
  if (!row) throw invalid(path, "Select a valid department.");
  return row;
}

export async function requireUnit(db: Db, id: number, path: string) {
  const row = await db.unit.findFirst({ where: { id, isActive: true } });
  if (!row) throw invalid(path, "Select a valid unit.");
  return row;
}

/** Status looked up by its stable code (DRAFT, SUBMITTED), never by display name. */
export async function requireStatusCode(db: Db, code: "DRAFT" | "SUBMITTED") {
  const row = await db.indentStatus.findUnique({ where: { code } });
  if (!row) throw new Error(`Status ${code} is missing from indent_status_master.`);
  return row;
}
