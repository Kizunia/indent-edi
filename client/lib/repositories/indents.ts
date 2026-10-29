import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/db/errors";
import { nextSequence } from "@/lib/db/sequence";
import { parseDate, parseTime } from "@/lib/db/dates";
import { indentInclude, parseId, toIndentDto } from "@/lib/db/mappers";
import { findOrCreateUnit, requireDepartment, requireIndentType, requireStatus } from "./masters";
import type { Indent, IndentFilters } from "@/lib/types";

// Soft-deleted indents (data model D-17) must never be returned.
const notDeleted = { deletedAt: null } satisfies Prisma.IndentWhereInput;

export async function getIndentById(id: string): Promise<Indent | undefined> {
  const row = await prisma.indent.findFirst({
    where: { id: parseId(id, "Indent"), ...notDeleted },
    include: indentInclude,
  });
  return row ? toIndentDto(row) : undefined;
}

export async function getIndentsByIds(ids: string[]): Promise<Indent[]> {
  const numeric = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const rows = await prisma.indent.findMany({
    where: { id: { in: numeric }, ...notDeleted },
    include: indentInclude,
    orderBy: { id: "asc" },
  });
  return rows.map(toIndentDto);
}

// Indent Number format is TBD (SRS §8: "PURC000123" was only an example).
// Placeholder kept from the prototype: IND-YYYYMMDD-#### sequential per day,
// with one counter row per day in number_sequence.
async function generateIndentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = await nextSequence(tx, `INDENT:${datePart}`);
  return `IND-${datePart}-${String(seq).padStart(4, "0")}`;
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
    department: string;
    purpose?: string;
    currentStockAtEntry: number;
    requiredQuantity: number;
    requiredDate: string;
    unit: string;
  }>;
}

// FR-08 / SRS §25: an Indent cannot be saved without at least one item.
export async function createIndent(input: CreateIndentInput): Promise<Indent> {
  if (!input.items || input.items.length === 0) {
    throw new AppError("An Indent cannot be saved without at least one Item.");
  }

  const id = await prisma.$transaction(async (tx) => {
    const [type, department, status] = await Promise.all([
      requireIndentType(tx, input.indentType),
      requireDepartment(tx, input.department),
      requireStatus(tx, input.status),
    ]);

    // Snapshot item fields from the catalogue (data model D-21), not from the
    // client, so a stale form cannot record wrong item data.
    const itemIds = input.items.map((i) => parseId(i.itemId, "Item"));
    const catalogue = await tx.item.findMany({ where: { id: { in: itemIds } } });
    const byId = new Map(catalogue.map((i) => [i.id, i]));

    const now = new Date();
    const lines: Prisma.IndentItemCreateWithoutIndentInput[] = [];
    for (const [idx, line] of input.items.entries()) {
      const item = byId.get(itemIds[idx]);
      if (!item) throw new AppError("Item not found.");
      if (!(line.requiredQuantity > 0)) throw new AppError("Required Quantity must be greater than 0.");
      const [lineDept, unit] = await Promise.all([
        requireDepartment(tx, line.department),
        findOrCreateUnit(tx, line.unit),
      ]);
      lines.push({
        lineNumber: idx + 1,
        item: { connect: { id: item.id } },
        itemCodeSnapshot: item.itemCode,
        itemNameSnapshot: item.itemName,
        specificationSnapshot: item.specification,
        drawingNumberSnapshot: item.drawingNumber,
        department: { connect: { id: lineDept.id } },
        purpose: line.purpose || null,
        currentStockSnapshot: line.currentStockAtEntry,
        stockCheckedAt: now,
        requiredQuantity: line.requiredQuantity,
        requiredUnit: { connect: { id: unit.id } },
        requiredDate: parseDate(line.requiredDate),
        createdByUserId: input.createdBy,
      });
    }

    // Take the number last so the counter row lock is held as briefly as possible.
    const indentNumber = await generateIndentNumber(tx);
    const created = await tx.indent.create({
      data: {
        indentNumber,
        indentType: { connect: { id: type.id } },
        status: { connect: { id: status.id } },
        department: { connect: { id: department.id } },
        indentDate: parseDate(input.indentDate),
        indentTime: parseTime(input.time),
        remark: input.remark || null,
        // Authentication is external (SRS §2.5); until its user id is wired in,
        // the submitted name doubles as the opaque user id.
        createdByUserId: input.createdBy,
        createdByName: input.createdBy,
        submittedAt: input.status === "Submitted" ? now : null,
        submittedByUserId: input.status === "Submitted" ? input.createdBy : null,
        items: { create: lines },
        history: {
          create: { toStatusId: status.id, source: "APP", changedByUserId: input.createdBy },
        },
      },
    });
    return created.id;
  });

  return (await getIndentById(String(id)))!;
}

export interface UpdateIndentInput {
  remark?: string;
  status?: Indent["status"];
  // Optional optimistic-lock token (data model D-19). When the client sends
  // the version it loaded, a concurrent change is rejected.
  version?: number;
  // SRS §29 / §39: exact editable item fields are TBD. Placeholder: purpose,
  // requiredQuantity, requiredDate, unit are editable.
  items?: Array<{
    indentItemId: string;
    purpose?: string;
    requiredQuantity?: number;
    requiredDate?: string;
    unit?: string;
  }>;
}

const CONFLICT = "This Indent was changed by someone else. Reload and try again.";

export async function updateIndent(idStr: string, input: UpdateIndentInput): Promise<Indent> {
  const id = parseId(idStr, "Indent");

  await prisma.$transaction(async (tx) => {
    const current = await tx.indent.findFirst({
      where: { id, ...notDeleted },
      include: { status: true },
    });
    if (!current) throw new AppError("Indent not found.");

    const editsContent = input.remark !== undefined || (input.items?.length ?? 0) > 0;
    if (editsContent && !current.status.isEditable) {
      throw new AppError(`An Indent in status "${current.status.name}" cannot be edited.`);
    }

    const newStatus =
      input.status !== undefined && input.status !== current.status.name
        ? await requireStatus(tx, input.status)
        : null;
    if (newStatus && !current.status.isEditable) {
      throw new AppError(`An Indent in status "${current.status.name}" cannot be changed to "${newStatus.name}".`);
    }

    // The version bump doubles as the header row lock: the guard on statusId
    // and version makes the write fail if anyone else got there first.
    const { count } = await tx.indent.updateMany({
      where: {
        id,
        statusId: current.statusId,
        ...(input.version !== undefined && { version: input.version }),
        ...notDeleted,
      },
      data: {
        version: { increment: 1 },
        ...(input.remark !== undefined && { remark: input.remark || null }),
        ...(newStatus && {
          statusId: newStatus.id,
          ...(newStatus.code === "SUBMITTED" && { submittedAt: new Date() }),
        }),
      },
    });
    if (count === 0) throw new AppError(CONFLICT);

    if (newStatus) {
      await tx.indentStatusHistory.create({
        data: {
          indentId: id,
          fromStatusId: current.statusId,
          toStatusId: newStatus.id,
          source: "APP",
        },
      });
    }

    for (const patch of input.items ?? []) {
      const lineId = parseId(patch.indentItemId, "Item");
      if (patch.requiredQuantity !== undefined && !(patch.requiredQuantity > 0)) {
        throw new AppError("Required Quantity must be greater than 0.");
      }
      const unit = patch.unit !== undefined ? await findOrCreateUnit(tx, patch.unit) : null;
      await tx.indentItem.updateMany({
        where: { id: lineId, indentId: id },
        data: {
          ...(patch.purpose !== undefined && { purpose: patch.purpose || null }),
          ...(patch.requiredQuantity !== undefined && { requiredQuantity: patch.requiredQuantity }),
          ...(patch.requiredDate !== undefined && { requiredDate: parseDate(patch.requiredDate) }),
          ...(unit && { requiredUnitId: unit.id }),
        },
      });
    }
  });

  return (await getIndentById(idStr))!;
}

export async function deleteIndentItem(indentIdStr: string, lineIdStr: string): Promise<Indent> {
  const indentId = parseId(indentIdStr, "Indent");
  const lineId = parseId(lineIdStr, "Item");

  await prisma.$transaction(async (tx) => {
    const current = await tx.indent.findFirst({
      where: { id: indentId, ...notDeleted },
      include: { status: true },
    });
    if (!current) throw new AppError("Indent not found.");
    if (!current.status.isEditable) {
      throw new AppError(`An Indent in status "${current.status.name}" cannot be edited.`);
    }

    const { count: locked } = await tx.indent.updateMany({
      where: { id: indentId, statusId: current.statusId, ...notDeleted },
      data: { version: { increment: 1 } },
    });
    if (locked === 0) throw new AppError(CONFLICT);

    const { count } = await tx.indentItem.deleteMany({ where: { id: lineId, indentId } });
    if (count === 0) throw new AppError("Item not found on this Indent.");

    // FR-08: an Indent must retain at least one item. Throwing rolls back the delete.
    if ((await tx.indentItem.count({ where: { indentId } })) === 0) {
      throw new AppError("Cannot remove the last remaining Item from an Indent.");
    }
  });

  return (await getIndentById(indentIdStr))!;
}

// Soft delete (data model D-17): the row and its number are kept.
export async function deleteIndent(idStr: string): Promise<void> {
  const { count } = await prisma.indent.updateMany({
    where: { id: parseId(idStr, "Indent"), ...notDeleted },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
  if (count === 0) throw new AppError("Indent not found.");
}

// FR-12 / FR-13: search + filters. Search behavior (exact vs partial) is TBD
// (SRS §33); partial match is used (case-insensitive via the column collation).
export async function queryIndents(filters: IndentFilters): Promise<{
  results: Indent[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const and: Prisma.IndentWhereInput[] = [];
  if (filters.search?.trim()) and.push({ indentNumber: { contains: filters.search.trim() } });
  if (filters.indentType) and.push({ indentType: { name: filters.indentType } });
  if (filters.status) and.push({ status: { name: filters.status } });
  if (filters.createdBy?.trim()) and.push({ createdByName: { contains: filters.createdBy.trim() } });
  if (filters.department) {
    // Matches the header department or any line's department (data model D-16).
    and.push({
      OR: [
        { department: { name: filters.department } },
        { items: { some: { department: { name: filters.department } } } },
      ],
    });
  }
  if (filters.dateFrom) and.push({ indentDate: { gte: parseDate(filters.dateFrom) } });
  if (filters.dateTo) and.push({ indentDate: { lte: parseDate(filters.dateTo) } });

  const where: Prisma.IndentWhereInput = { ...notDeleted, AND: and };
  // FR-15: confirmed page size of 10 records per page.
  const pageSize = filters.pageSize || 10;
  const page = filters.page || 1;

  const [total, rows] = await prisma.$transaction([
    prisma.indent.count({ where }),
    prisma.indent.findMany({
      where,
      include: indentInclude,
      orderBy: [{ indentDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { results: rows.map(toIndentDto), total, page, pageSize };
}
