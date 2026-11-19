import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { authorize } from "../server/auth/authorize";
import type { AuthUser } from "../server/auth/types";
import { getConfig } from "../server/config";
import { AppError } from "../server/errors";
import { businessDate, businessTime, toDbDate, toDbTime } from "../shared/datetime";
import {
  PAGE_SIZE,
  requiredDateErrors,
  type AddLineInput,
  type CreateIndentInput,
  type CreateLineInput,
  type IndentFilters,
  type ListQuery,
  type UpdateIndentInput,
  type UpdateLineInput,
} from "../shared/schemas/indent";
import { escapeLike } from "./items";
import { authorizable, detailInclude, summaryInclude, toDetail, toSummary, type DetailRow } from "./mappers";
import { requireDepartment, requireIndentType, requireStatusCode, requireUnit } from "./masters";
import { nextIndentNumber, nextItemCode, previewIndentNumber } from "./numbering";
import { NOT_DELETED, scopeWhere } from "./scope";
import { getStockProvider } from "./stock-provider";
import type { IndentDetail, IndentPage, StockEntry } from "./types";

// The indent domain (docs/spec/domain-rules.md). Routes and pages call these
// functions; they authorize, enforce every business rule and own the
// transactions. Clients never send status, creator, number, date/time, stock or
// item snapshots (BR-06, DEC-005).

type Tx = Prisma.TransactionClient;

const fail = (path: string, message: string) =>
  new AppError("VALIDATION_FAILED", { fieldErrors: { [path]: message } });

// ---------------------------------------------------------------- loading

/** Loads an indent inside the user's view scope. Missing, deleted or out of scope -> NOT_FOUND. */
async function loadVisible(user: AuthUser, indentNumber: string, db: Tx | typeof prisma = prisma): Promise<DetailRow> {
  const row = await db.indent.findFirst({
    where: { indentNumber, ...scopeWhere(user, "indent.view") },
    include: detailInclude,
  });
  if (!row) throw new AppError("NOT_FOUND");
  return row;
}

async function reload(user: AuthUser, id: number): Promise<IndentDetail> {
  const row = await prisma.indent.findFirstOrThrow({ where: { id, ...NOT_DELETED }, include: detailInclude });
  return toDetail(user, row);
}

// ---------------------------------------------------------------- locking

/**
 * Optimistic lock + write in one statement (DEC-016). Succeeds only if the
 * indent is not deleted, still editable and at the version the client saw; the
 * row stays locked until the transaction ends. On failure it tells the three
 * causes apart so the user gets the right message.
 */
async function lockedUpdate(
  tx: Tx,
  id: number,
  version: number,
  userId: string,
  data: Prisma.IndentUncheckedUpdateManyInput = {}
): Promise<void> {
  const result = await tx.indent.updateMany({
    where: { id, version, deletedAt: null, status: { isEditable: true } },
    data: { ...data, version: { increment: 1 }, updatedByUserId: userId },
  });
  if (result.count === 1) return;
  const current = await tx.indent.findUnique({ where: { id }, include: { status: true } });
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND");
  if (!current.status.isEditable) throw new AppError("NOT_EDITABLE");
  throw new AppError("VERSION_CONFLICT");
}

// ---------------------------------------------------------------- lines

interface ResolvedItem {
  id: number;
  itemCode: string;
  itemName: string;
  specification: string | null;
  drawingNumber: string | null;
}

async function resolveItem(tx: Tx, user: AuthUser, line: CreateLineInput, path: string): Promise<ResolvedItem> {
  if (line.itemId !== undefined) {
    const item = await tx.item.findFirst({ where: { id: line.itemId, isActive: true } });
    if (!item) throw fail(`${path}.itemId`, "Select a valid item.");
    return item;
  }
  // New item entered on the form: created in this transaction, so nothing is
  // left behind if the save fails (DEC-025, BR-03). It has no stock row (DEC-013).
  const n = line.newItem!;
  await requireUnit(tx, n.defaultUnitId, `${path}.newItem.defaultUnitId`);
  return tx.item.create({
    data: {
      itemCode: await nextItemCode(tx),
      itemName: n.itemName,
      specification: n.specification ?? null,
      drawingNumber: n.drawingNumber ?? null,
      defaultUnitId: n.defaultUnitId,
      createdByUserId: user.id,
    },
  });
}

/** Builds the line row. Snapshots come from the item master and the stock provider, never the client (D-21). */
async function buildLine(
  tx: Tx,
  user: AuthUser,
  line: CreateLineInput,
  ctx: { path: string; lineNumber: number; headerDepartmentId: number; stock: Map<number, StockEntry>; now: Date }
): Promise<Prisma.IndentItemCreateWithoutIndentInput> {
  const { path } = ctx;
  const departmentId = line.departmentId ?? ctx.headerDepartmentId;
  if (line.departmentId !== undefined) await requireDepartment(tx, line.departmentId, `${path}.departmentId`);
  await requireUnit(tx, line.requiredUnitId, `${path}.requiredUnitId`);
  const item = await resolveItem(tx, user, line, path);
  const stock = line.itemId !== undefined ? ctx.stock.get(item.id) : undefined;
  const hasStock = stock?.quantity != null;
  return {
    lineNumber: ctx.lineNumber,
    item: { connect: { id: item.id } },
    itemCodeSnapshot: item.itemCode,
    itemNameSnapshot: item.itemName,
    specificationSnapshot: item.specification,
    drawingNumberSnapshot: item.drawingNumber,
    department: { connect: { id: departmentId } },
    purpose: line.purpose ?? null,
    currentStockSnapshot: hasStock ? stock!.quantity : null, // null = "Not available", never 0
    stockCheckedAt: hasStock ? ctx.now : null,
    requiredQuantity: line.requiredQuantity,
    requiredUnit: { connect: { id: line.requiredUnitId } },
    requiredDate: toDbDate(line.requiredDate),
    createdByUserId: user.id,
  };
}

function assertNoDuplicates(lines: CreateLineInput[], existingItemIds: number[], basePath: string): void {
  if (getConfig().allowDuplicateItems) return;
  const seen = new Set(existingItemIds);
  lines.forEach((l, i) => {
    if (l.itemId === undefined) return;
    if (seen.has(l.itemId)) {
      throw new AppError("DUPLICATE_ITEM", { fieldErrors: { [`${basePath}.${i}.itemId`]: "This item is already in the indent." } });
    }
    seen.add(l.itemId);
  });
}

// ---------------------------------------------------------------- create

/** FR-01, FR-08..FR-10: always creates a Draft; `submit` adds the submit step in the same transaction (DEC-006). */
export async function createIndent(user: AuthUser | null, input: CreateIndentInput): Promise<IndentDetail> {
  authorize(user, "indent.create");
  if (input.items.length === 0) throw new AppError("INDENT_EMPTY"); // BR-01, also enforced by the schema
  if (input.submit) {
    authorize(user, "indent.submit", {
      createdByUserId: user.id,
      departmentIds: [input.departmentId, ...input.items.map((l) => l.departmentId ?? input.departmentId)],
    });
  }

  const config = getConfig();
  const now = new Date();
  const indentDate = businessDate(now, config.appTimezone);
  const indentTime = businessTime(now, config.appTimezone);

  const dateErrors = requiredDateErrors(input.items, indentDate);
  if (Object.keys(dateErrors).length > 0) throw new AppError("VALIDATION_FAILED", { fieldErrors: dateErrors });
  assertNoDuplicates(input.items, [], "items");

  // The server reads stock itself and ignores anything the client displayed (DEC-013).
  const stock = await getStockProvider().getStock(input.items.flatMap((l) => (l.itemId !== undefined ? [l.itemId] : [])));

  const run = () =>
    prisma.$transaction(async (tx) => {
      await requireIndentType(tx, input.indentTypeId);
      await requireDepartment(tx, input.departmentId, "departmentId");
      const draft = await requireStatusCode(tx, "DRAFT");
      const submitted = input.submit ? await requireStatusCode(tx, "SUBMITTED") : null;

      const lines: Prisma.IndentItemCreateWithoutIndentInput[] = [];
      for (const [i, line] of input.items.entries()) {
        lines.push(
          await buildLine(tx, user, line, {
            path: `items.${i}`,
            lineNumber: i + 1,
            headerDepartmentId: input.departmentId,
            stock,
            now,
          })
        );
      }

      // Allocated last so the counter row is locked as briefly as possible (DEC-010).
      const indentNumber = await nextIndentNumber(tx);
      const created = await tx.indent.create({
        data: {
          indentNumber,
          indentTypeId: input.indentTypeId,
          statusId: (submitted ?? draft).id,
          departmentId: input.departmentId,
          indentDate: toDbDate(indentDate),
          indentTime: toDbTime(indentTime),
          remark: input.remark ?? null,
          createdByUserId: user.id,
          createdByName: user.name,
          submittedAt: submitted ? now : null,
          submittedByUserId: submitted ? user.id : null,
          items: { create: lines },
          history: {
            create: [
              { toStatusId: draft.id, changedAt: now, changedByUserId: user.id, source: "APP", note: "Created" },
              ...(submitted
                ? [{ fromStatusId: draft.id, toStatusId: submitted.id, changedAt: now, changedByUserId: user.id, source: "APP" }]
                : []),
            ],
          },
        },
        select: { id: true },
      });
      return created.id;
    });

  let id: number;
  try {
    id = await run();
  } catch (err) {
    // Backstop for a duplicate number or code (D-12): retry the whole save once.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") id = await run();
    else throw err;
  }
  return reload(user, id);
}

// ---------------------------------------------------------------- read

export async function getIndent(user: AuthUser | null, indentNumber: string): Promise<IndentDetail> {
  authorize(user, "indent.view");
  return toDetail(user, await loadVisible(user, indentNumber));
}

/** Filters shared by the list and the export (FR-13). The department filter matches header or any line (DEC-022). */
export function filterWhere(f: IndentFilters): Prisma.IndentWhereInput[] {
  const and: Prisma.IndentWhereInput[] = [];
  if (f.indentTypeId) and.push({ indentTypeId: f.indentTypeId });
  if (f.statusId) and.push({ statusId: f.statusId });
  if (f.departmentId) and.push({ OR: [{ departmentId: f.departmentId }, { items: { some: { departmentId: f.departmentId } } }] });
  if (f.createdBy) and.push({ createdByUserId: f.createdBy });
  if (f.dateFrom) and.push({ indentDate: { gte: toDbDate(f.dateFrom) } });
  if (f.dateTo) and.push({ indentDate: { lte: toDbDate(f.dateTo) } });
  return and;
}

/** Scope + filters + search, ready for findMany/count. Used by list and export. */
export function listWhere(user: AuthUser, action: "indent.view" | "indent.export", filters: IndentFilters): Prisma.IndentWhereInput {
  const and = [scopeWhere(user, action), ...filterWhere(filters)];
  const term = filters.search?.trim();
  if (term) and.push({ indentNumber: { contains: escapeLike(term) } });
  return { AND: and };
}

const LIST_ORDER = [{ indentDate: "desc" }, { id: "desc" }] satisfies Prisma.IndentOrderByWithRelationInput[];

/** FR-11..FR-15: filtered, searched, paged list. Exact number match comes first on page 1 (DEC-011). */
export async function listIndents(user: AuthUser | null, query: ListQuery): Promise<IndentPage> {
  authorize(user, "indent.view");
  const page = query.page;
  const where = listWhere(user, "indent.view", query);
  const term = query.search?.trim();

  const exact = term
    ? await prisma.indent.findFirst({
        where: { AND: [scopeWhere(user, "indent.view"), ...filterWhere(query), { indentNumber: term }] },
        include: summaryInclude,
      })
    : null;

  const rest: Prisma.IndentWhereInput = exact ? { AND: [where, { id: { not: exact.id } }] } : where;
  const offset = (page - 1) * PAGE_SIZE - (exact ? 1 : 0);
  const [total, rows] = await Promise.all([
    prisma.indent.count({ where }),
    prisma.indent.findMany({
      where: rest,
      include: summaryInclude,
      orderBy: LIST_ORDER,
      skip: Math.max(offset, 0),
      take: page === 1 && exact ? PAGE_SIZE - 1 : PAGE_SIZE,
    }),
  ]);

  const ordered = page === 1 && exact ? [exact, ...rows] : rows;
  return { items: ordered.map((r) => toSummary(user, r)), total, page, pageSize: PAGE_SIZE };
}

/** Distinct creators within the user's view scope, for the Created By filter. */
export async function listCreators(user: AuthUser | null): Promise<{ id: string; name: string }[]> {
  authorize(user, "indent.view");
  const rows = await prisma.indent.findMany({
    where: scopeWhere(user, "indent.view"),
    distinct: ["createdByUserId"],
    select: { createdByUserId: true, createdByName: true },
    orderBy: [{ createdByName: "asc" }, { createdByUserId: "asc" }],
  });
  return rows.map((r) => ({ id: r.createdByUserId, name: r.createdByName }));
}

/** Preview only (DEC-010): reserves nothing, may differ from the number finally assigned. */
export async function getExpectedNumber(user: AuthUser | null): Promise<string> {
  authorize(user, "indent.create");
  return previewIndentNumber(prisma);
}

// ---------------------------------------------------------------- edit (Draft only, DEC-007)

export async function updateRemark(user: AuthUser | null, indentNumber: string, input: UpdateIndentInput): Promise<IndentDetail> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.edit", authorizable(row));
  await prisma.$transaction((tx) =>
    lockedUpdate(tx, row.id, input.version, user.id, { remark: input.remark === "" ? null : input.remark })
  );
  return reload(user, row.id);
}

export async function addLine(user: AuthUser | null, indentNumber: string, input: AddLineInput): Promise<IndentDetail> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.edit", authorizable(row));

  const indentDate = row.indentDate.toISOString().slice(0, 10);
  if (input.line.requiredDate < indentDate) {
    throw fail("line.requiredDate", "Required date cannot be before the indent date.");
  }
  assertNoDuplicates([input.line], row.items.map((l) => l.itemId), "line");
  if (row.departmentId === null) throw fail("departmentId", "The indent has no department.");

  const now = new Date();
  const stock = await getStockProvider().getStock(input.line.itemId !== undefined ? [input.line.itemId] : []);
  await prisma.$transaction(async (tx) => {
    await lockedUpdate(tx, row.id, input.version, user.id);
    const last = await tx.indentItem.aggregate({ where: { indentId: row.id }, _max: { lineNumber: true } });
    const data = await buildLine(tx, user, input.line, {
      path: "line",
      lineNumber: (last._max.lineNumber ?? 0) + 1,
      headerDepartmentId: row.departmentId!,
      stock,
      now,
    });
    await tx.indentItem.create({ data: { ...data, indent: { connect: { id: row.id } } } });
  });
  return reload(user, row.id);
}

export async function updateLine(
  user: AuthUser | null,
  indentNumber: string,
  lineId: number,
  input: UpdateLineInput
): Promise<IndentDetail> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.edit", authorizable(row));
  if (!row.items.some((l) => l.id === lineId)) throw new AppError("NOT_FOUND");

  const indentDate = row.indentDate.toISOString().slice(0, 10);
  if (input.requiredDate !== undefined && input.requiredDate < indentDate) {
    throw fail("requiredDate", "Required date cannot be before the indent date.");
  }

  await prisma.$transaction(async (tx) => {
    await lockedUpdate(tx, row.id, input.version, user.id);
    if (input.departmentId !== undefined) await requireDepartment(tx, input.departmentId, "departmentId");
    if (input.requiredUnitId !== undefined) await requireUnit(tx, input.requiredUnitId, "requiredUnitId");
    await tx.indentItem.update({
      where: { id: lineId },
      data: {
        ...(input.purpose !== undefined ? { purpose: input.purpose === "" ? null : input.purpose } : {}),
        ...(input.requiredQuantity !== undefined ? { requiredQuantity: input.requiredQuantity } : {}),
        ...(input.requiredDate !== undefined ? { requiredDate: toDbDate(input.requiredDate) } : {}),
        ...(input.requiredUnitId !== undefined ? { requiredUnitId: input.requiredUnitId } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        updatedByUserId: user.id,
      },
    });
  });
  return reload(user, row.id);
}

/** FR-17: removes a line but never the last one (BR-01, checked after the header is locked, D-23). */
export async function deleteLine(
  user: AuthUser | null,
  indentNumber: string,
  lineId: number,
  version: number
): Promise<IndentDetail> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.edit", authorizable(row));
  if (!row.items.some((l) => l.id === lineId)) throw new AppError("NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await lockedUpdate(tx, row.id, version, user.id);
    const remaining = await tx.indentItem.findMany({
      where: { indentId: row.id, id: { not: lineId } },
      orderBy: { lineNumber: "asc" },
      select: { id: true, lineNumber: true },
    });
    if (remaining.length === 0) throw new AppError("INDENT_EMPTY"); // rolls back the lock too
    await tx.indentItem.delete({ where: { id: lineId } });
    // Keep line numbers 1..n; ascending order never collides with the unique key.
    for (const [i, l] of remaining.entries()) {
      if (l.lineNumber !== i + 1) await tx.indentItem.update({ where: { id: l.id }, data: { lineNumber: i + 1 } });
    }
  });
  return reload(user, row.id);
}

// ---------------------------------------------------------------- submit / delete

/** FR-10 / BR-05: the only way an indent leaves Draft. Stamps submitted_at/by and writes history. */
export async function submitIndent(user: AuthUser | null, indentNumber: string, version: number): Promise<IndentDetail> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.submit", authorizable(row));
  const now = new Date();
  // Submitting records the stock as it is now (DEC-013 point 5), read before the transaction.
  const stock = await getStockProvider().getStock(row.items.map((l) => l.itemId));
  await prisma.$transaction(async (tx) => {
    const submitted = await requireStatusCode(tx, "SUBMITTED");
    await lockedUpdate(tx, row.id, version, user.id, {
      statusId: submitted.id,
      submittedAt: now,
      submittedByUserId: user.id,
    });
    for (const l of row.items) {
      const quantity = stock.get(l.itemId)?.quantity ?? null;
      await tx.indentItem.update({
        where: { id: l.id },
        data: { currentStockSnapshot: quantity, stockCheckedAt: quantity === null ? null : now },
      });
    }
    await tx.indentStatusHistory.create({
      data: {
        indentId: row.id,
        fromStatusId: row.statusId,
        toStatusId: submitted.id,
        changedAt: now,
        changedByUserId: user.id,
        source: "APP",
      },
    });
  });
  return reload(user, row.id);
}

/** FR-18: soft delete of a Draft (DEC-008). The row and its number stay (invariant 2). */
export async function deleteIndent(user: AuthUser | null, indentNumber: string, version: number): Promise<void> {
  authorize(user, "indent.view");
  const row = await loadVisible(user, indentNumber);
  authorize(user, "indent.delete", authorizable(row));
  await prisma.$transaction((tx) =>
    lockedUpdate(tx, row.id, version, user.id, { deletedAt: new Date(), deletedByUserId: user.id })
  );
}
