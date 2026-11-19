import type { Prisma } from "@prisma/client";
import { can } from "../server/auth/authorize";
import type { AuthUser, AuthorizableIndent } from "../server/auth/types";
import { fromDbDate, fromDbTime } from "../shared/datetime";
import type { IndentDetail, IndentPermissions, IndentSummary, Line, Ref, UnitRef } from "./types";

// Prisma rows -> API shapes (docs/spec/api.md). The only place that knows both.

export const summaryInclude = {
  indentType: true,
  department: true,
  status: true,
  items: { select: { departmentId: true } },
} satisfies Prisma.IndentInclude;

export const detailInclude = {
  indentType: true,
  department: true,
  status: true,
  items: {
    orderBy: { lineNumber: "asc" },
    include: { department: true, requiredUnit: true },
  },
} satisfies Prisma.IndentInclude;

export type SummaryRow = Prisma.IndentGetPayload<{ include: typeof summaryInclude }>;
export type DetailRow = Prisma.IndentGetPayload<{ include: typeof detailInclude }>;

const ref = (r: { id: number; code: string; name: string }): Ref => ({ id: r.id, code: r.code, name: r.name });
const unitRef = (u: { id: number; code: string; name: string; symbol: string | null }): UnitRef => ({
  ...ref(u),
  symbol: u.symbol,
});

/** What can() needs for ownership/department checks: header + every line department (DEC-022). */
export function authorizable(row: SummaryRow | DetailRow): AuthorizableIndent {
  const ids = new Set<number>();
  if (row.departmentId !== null) ids.add(row.departmentId);
  for (const l of row.items) ids.add(l.departmentId);
  return { createdByUserId: row.createdByUserId, departmentIds: [...ids] };
}

/** Permission is necessary but not sufficient: edit/submit/delete also need an editable status. */
export function permissionsFor(user: AuthUser, row: SummaryRow | DetailRow): IndentPermissions {
  const target = authorizable(row);
  const editable = row.status.isEditable;
  return {
    canEdit: editable && can(user, "indent.edit", target),
    canSubmit: editable && can(user, "indent.submit", target),
    canDelete: editable && can(user, "indent.delete", target),
    canPrint: can(user, "indent.print", target),
  };
}

function summaryFields(user: AuthUser, row: SummaryRow | DetailRow): IndentSummary {
  return {
    indentNumber: row.indentNumber,
    version: row.version,
    indentType: ref(row.indentType),
    department: row.department ? ref(row.department) : null,
    status: { ...ref(row.status), isEditable: row.status.isEditable },
    indentDate: fromDbDate(row.indentDate),
    indentTime: fromDbTime(row.indentTime),
    createdBy: { id: row.createdByUserId, name: row.createdByName },
    remark: row.remark,
    itemCount: row.items.length,
    createdAt: row.createdAt.toISOString(),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    permissions: permissionsFor(user, row),
  };
}

export const toSummary = (user: AuthUser, row: SummaryRow): IndentSummary => summaryFields(user, row);

export function toLine(l: DetailRow["items"][number]): Line {
  return {
    id: l.id,
    lineNumber: l.lineNumber,
    itemId: l.itemId,
    itemCode: l.itemCodeSnapshot,
    itemName: l.itemNameSnapshot,
    specification: l.specificationSnapshot,
    drawingNumber: l.drawingNumberSnapshot,
    department: ref(l.department),
    purpose: l.purpose,
    currentStock: l.currentStockSnapshot ? l.currentStockSnapshot.toFixed(4) : null,
    stockCheckedAt: l.stockCheckedAt ? l.stockCheckedAt.toISOString() : null,
    requiredQuantity: l.requiredQuantity.toFixed(4),
    unit: unitRef(l.requiredUnit),
    requiredDate: fromDbDate(l.requiredDate),
  };
}

export const toDetail = (user: AuthUser, row: DetailRow): IndentDetail => ({
  ...summaryFields(user, row),
  items: row.items.map(toLine),
});
