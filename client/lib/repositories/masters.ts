import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/db/errors";
import type { Department, IndentType } from "@/lib/types";

// SRS §7.3 / §7.4: Department and Indent Type masters are recreated locally
// until the company confirms the real source. Callers only see these functions.
export async function getDepartments(): Promise<Department[]> {
  const rows = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: String(r.id), name: r.name }));
}

export async function getIndentTypes(): Promise<IndentType[]> {
  const rows = await prisma.indentType.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: String(r.id), name: r.name }));
}

// --- name -> row resolvers used inside transactions -------------------------
// The UI sends display names, so we resolve them to FKs and reject unknowns
// (SRS §12.1: valid Department / Indent Type).
export async function requireIndentType(tx: Prisma.TransactionClient, name: string) {
  const row = await tx.indentType.findFirst({ where: { name, isActive: true } });
  if (!row) throw new AppError(`Invalid Indent Type: ${name}`);
  return row;
}

export async function requireDepartment(tx: Prisma.TransactionClient, name: string) {
  const row = await tx.department.findFirst({ where: { name, isActive: true } });
  if (!row) throw new AppError(`Invalid Department: ${name}`);
  return row;
}

// The UI takes Unit as free text and the official unit list is TBD, so an
// unknown unit is created on first use. Switch this to `throw` once the
// company supplies the unit list.
export async function findOrCreateUnit(tx: Prisma.TransactionClient, code: string) {
  const clean = code.trim();
  if (!clean) throw new AppError("Unit is required.");
  const existing = await tx.unit.findUnique({ where: { code: clean } });
  if (existing) return existing;
  return tx.unit.create({ data: { code: clean, name: clean } });
}

export async function requireStatus(tx: Prisma.TransactionClient, name: string) {
  const row = await tx.indentStatus.findFirst({ where: { name, isActive: true } });
  if (!row) throw new AppError(`Invalid Status: ${name}`);
  return row;
}
