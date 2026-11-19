import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import * as indents from "@/lib/services/indents";
import { setStockProviderForTests } from "@/lib/services/stock-provider";
import { AppError } from "@/lib/server/errors";
import { employee, expectCode, head, line, newIndent, setupFixtures, users, type Fixtures } from "./fixtures";

// Create / edit / submit / delete rules (docs/spec/domain-rules.md sections 1-5).
let f: Fixtures;
const admin = users.admin;

beforeAll(async () => {
  f = await setupFixtures();
});
afterEach(() => setStockProviderForTests());

const lastSeq = async (scope: string) =>
  (await prisma.numberSequence.findUnique({ where: { scope } }))?.lastValue ?? 0;

describe("create (FR-01, FR-08..FR-10, BR-01..BR-05)", () => {
  it("creates a Draft owned by the user with a server-assigned number, date, time and version", async () => {
    const user = employee("t-emp-create", f.deptA);
    const ind = await indents.createIndent(user, newIndent(f));
    expect(ind.indentNumber).toMatch(/^IND-\d{6}$/);
    expect(ind.status.code).toBe("DRAFT");
    expect(ind.status.isEditable).toBe(true);
    expect(ind.version).toBe(1);
    expect(ind.createdBy).toEqual({ id: user.id, name: user.name });
    expect(ind.indentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ind.indentTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(ind.itemCount).toBe(1);
    expect(ind.items[0].lineNumber).toBe(1);
    expect(ind.permissions).toEqual({ canEdit: true, canSubmit: true, canDelete: true, canPrint: true });
  });

  it("rejects an indent with no lines (BR-01)", async () => {
    await expectCode(indents.createIndent(admin, newIndent(f, { items: [] })), "INDENT_EMPTY");
  });

  it("create + submit makes a Submitted indent with two history rows (DEC-006)", async () => {
    const ind = await indents.createIndent(admin, newIndent(f, { submit: true }));
    expect(ind.status.code).toBe("SUBMITTED");
    expect(ind.submittedAt).not.toBeNull();
    expect(ind.permissions.canEdit).toBe(false);
    const row = await prisma.indent.findFirstOrThrow({
      where: { indentNumber: ind.indentNumber },
      include: { history: { orderBy: { id: "asc" }, include: { toStatus: true } } },
    });
    expect(row.history.map((h) => h.toStatus.code)).toEqual(["DRAFT", "SUBMITTED"]);
    expect(row.submittedByUserId).toBe(admin.id);
  });

  it("refuses create+submit when the user may not submit it (department scope)", async () => {
    const otherHead = head("t-head-b", f.deptB);
    await expectCode(indents.createIndent(otherHead, newIndent(f, { departmentId: f.deptA, submit: true })), "FORBIDDEN");
  });

  it("refuses users that cannot create, and anonymous callers", async () => {
    await expectCode(indents.createIndent(users.purchase, newIndent(f)), "FORBIDDEN");
    await expectCode(indents.createIndent(users.nobody, newIndent(f)), "FORBIDDEN");
    await expectCode(indents.createIndent(null, newIndent(f)), "UNAUTHENTICATED");
  });

  it("gives parallel creates distinct, gap-free numbers (D-12)", async () => {
    const before = await lastSeq("INDENT");
    const made = await Promise.all(Array.from({ length: 8 }, () => indents.createIndent(admin, newIndent(f))));
    const numbers = made.map((m) => Number(m.indentNumber.replace(/\D/g, ""))).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(8);
    expect(numbers).toEqual(Array.from({ length: 8 }, (_, i) => before + 1 + i));
  });

  it("a failed save consumes no number and leaves no new item behind", async () => {
    const seqBefore = await lastSeq("INDENT");
    const itemSeqBefore = await lastSeq("ITEM");
    const itemsBefore = await prisma.item.count();
    await expectCode(
      indents.createIndent(
        admin,
        newIndent(f, {
          items: [
            { newItem: { itemName: "Test Rollback Item", defaultUnitId: f.unitId }, requiredQuantity: "1", requiredUnitId: f.unitId, requiredDate: "2099-12-31" },
            { itemId: f.stockedItemId, requiredQuantity: "1", requiredUnitId: 999_999, requiredDate: "2099-12-31" },
          ],
        })
      ),
      "VALIDATION_FAILED"
    );
    expect(await lastSeq("INDENT")).toBe(seqBefore);
    expect(await lastSeq("ITEM")).toBe(itemSeqBefore);
    expect(await prisma.item.count()).toBe(itemsBefore);
  });

  it("creates a new item inside the save, with a generated code and no stock row (BR-03, DEC-013)", async () => {
    const ind = await indents.createIndent(
      admin,
      newIndent(f, {
        items: [{ newItem: { itemName: "Test New Bolt M8", specification: "spec", defaultUnitId: f.unitId }, requiredQuantity: "3", requiredUnitId: f.unitId, requiredDate: "2099-12-31" }],
      })
    );
    const l = ind.items[0];
    expect(l.itemCode).toMatch(/^ITM-\d{6}$/);
    expect(l.itemName).toBe("Test New Bolt M8");
    expect(l.currentStock).toBeNull();
    expect(l.stockCheckedAt).toBeNull();
    expect(await prisma.stockBalance.count({ where: { itemId: l.itemId } })).toBe(0);
    expect((await prisma.item.findUniqueOrThrow({ where: { id: l.itemId } })).createdByUserId).toBe(admin.id);
  });

  it("snapshots stock from the database, 'Not available' as null, and never changes stock (BR-04)", async () => {
    const ind = await indents.createIndent(
      admin,
      newIndent(f, { items: [line(f, f.stockedItemId, "3"), line(f, f.unstockedItemId, "1")] })
    );
    expect(ind.items[0].currentStock).toBe("5.0000");
    expect(ind.items[0].stockCheckedAt).not.toBeNull();
    expect(ind.items[1].currentStock).toBeNull();
    expect(ind.items[1].stockCheckedAt).toBeNull();
    expect(ind.items[0].requiredQuantity).toBe("3.0000");
    const stock = await prisma.stockBalance.findUniqueOrThrow({ where: { itemId: f.stockedItemId } });
    expect(stock.currentQuantity.toFixed(4)).toBe("5.0000");
  });

  it("reports STOCK_UNAVAILABLE when the provider fails, and saves nothing", async () => {
    setStockProviderForTests({
      getStock: async () => {
        throw new AppError("STOCK_UNAVAILABLE");
      },
    });
    const before = await lastSeq("INDENT");
    await expectCode(indents.createIndent(admin, newIndent(f)), "STOCK_UNAVAILABLE");
    expect(await lastSeq("INDENT")).toBe(before);
  });

  it("validates masters, required date and duplicates", async () => {
    await expectCode(indents.createIndent(admin, newIndent(f, { departmentId: 999_999 })), "VALIDATION_FAILED");
    await expectCode(indents.createIndent(admin, newIndent(f, { indentTypeId: 999_999 })), "VALIDATION_FAILED");
    await expectCode(
      indents.createIndent(admin, newIndent(f, { items: [{ ...line(f, f.stockedItemId), requiredDate: "2000-01-01" }] })),
      "VALIDATION_FAILED"
    );
    await expectCode(
      indents.createIndent(admin, newIndent(f, { items: [line(f, f.stockedItemId), line(f, f.stockedItemId)] })),
      "DUPLICATE_ITEM"
    );
  });

  it("uses the header department for lines without one, and honours a line department", async () => {
    const ind = await indents.createIndent(
      admin,
      newIndent(f, { items: [line(f, f.stockedItemId), { ...line(f, f.secondItemId), departmentId: f.deptB }] })
    );
    expect(ind.items[0].department.id).toBe(f.deptA);
    expect(ind.items[1].department.id).toBe(f.deptB);
  });
});

describe("edit a Draft (FR-16, FR-17, DEC-007, DEC-016)", () => {
  it("edits the remark and bumps the version", async () => {
    const ind = await indents.createIndent(admin, newIndent(f));
    const updated = await indents.updateRemark(admin, ind.indentNumber, { version: ind.version, remark: "urgent" });
    expect(updated.remark).toBe("urgent");
    expect(updated.version).toBe(ind.version + 1);
    const cleared = await indents.updateRemark(admin, ind.indentNumber, { version: updated.version, remark: "" });
    expect(cleared.remark).toBeNull();
  });

  it("rejects a stale version with VERSION_CONFLICT (optimistic lock)", async () => {
    const ind = await indents.createIndent(admin, newIndent(f));
    await indents.updateRemark(admin, ind.indentNumber, { version: ind.version, remark: "first" });
    await expectCode(indents.updateRemark(admin, ind.indentNumber, { version: ind.version, remark: "second" }), "VERSION_CONFLICT");
  });

  it("edits line fields but not the item snapshot", async () => {
    const ind = await indents.createIndent(admin, newIndent(f));
    const l = ind.items[0];
    const updated = await indents.updateLine(admin, ind.indentNumber, l.id, {
      version: ind.version,
      requiredQuantity: "40.5",
      purpose: "new purpose",
      departmentId: f.deptB,
    });
    expect(updated.items[0].requiredQuantity).toBe("40.5000");
    expect(updated.items[0].purpose).toBe("new purpose");
    expect(updated.items[0].department.id).toBe(f.deptB);
    expect(updated.items[0].itemName).toBe(l.itemName);
    expect(updated.indentNumber).toBe(ind.indentNumber);
    await expectCode(
      indents.updateLine(admin, ind.indentNumber, l.id, { version: updated.version, requiredDate: "2000-01-01" }),
      "VALIDATION_FAILED"
    );
    await expectCode(indents.updateLine(admin, ind.indentNumber, 999_999_999, { version: updated.version, purpose: "x" }), "NOT_FOUND");
  });

  it("adds a line (numbered after the last), blocking duplicates", async () => {
    const ind = await indents.createIndent(admin, newIndent(f));
    const added = await indents.addLine(admin, ind.indentNumber, { version: ind.version, line: line(f, f.secondItemId, "7") });
    expect(added.items.map((i) => i.lineNumber)).toEqual([1, 2]);
    expect(added.version).toBe(ind.version + 1);
    await expectCode(
      indents.addLine(admin, ind.indentNumber, { version: added.version, line: line(f, f.secondItemId) }),
      "DUPLICATE_ITEM"
    );
  });

  it("removes a line and renumbers, but never the last one (BR-01)", async () => {
    const ind = await indents.createIndent(
      admin,
      newIndent(f, { items: [line(f, f.stockedItemId), line(f, f.secondItemId), line(f, f.unstockedItemId)] })
    );
    const after = await indents.deleteLine(admin, ind.indentNumber, ind.items[0].id, ind.version);
    expect(after.items.map((i) => i.lineNumber)).toEqual([1, 2]);
    expect(after.items.map((i) => i.itemId)).toEqual([f.secondItemId, f.unstockedItemId]);
    const one = await indents.deleteLine(admin, ind.indentNumber, after.items[0].id, after.version);
    await expectCode(indents.deleteLine(admin, ind.indentNumber, one.items[0].id, one.version), "INDENT_EMPTY");
    const still = await indents.getIndent(admin, ind.indentNumber);
    expect(still.items).toHaveLength(1);
    expect(still.version).toBe(one.version); // the failed attempt rolled back, including the lock
  });
});

describe("submit and delete (BR-05, BR-06, BR-12, DEC-008)", () => {
  it("submits a Draft, stamps it, and then it is read-only (NOT_EDITABLE)", async () => {
    const ind = await indents.createIndent(admin, newIndent(f, { items: [line(f, f.stockedItemId), line(f, f.secondItemId)] }));
    const sub = await indents.submitIndent(admin, ind.indentNumber, ind.version);
    expect(sub.status.code).toBe("SUBMITTED");
    expect(sub.submittedAt).not.toBeNull();
    expect(sub.permissions).toEqual({ canEdit: false, canSubmit: false, canDelete: false, canPrint: true });

    await expectCode(indents.submitIndent(admin, ind.indentNumber, sub.version), "NOT_EDITABLE");
    await expectCode(indents.updateRemark(admin, ind.indentNumber, { version: sub.version, remark: "x" }), "NOT_EDITABLE");
    await expectCode(indents.updateLine(admin, ind.indentNumber, sub.items[0].id, { version: sub.version, purpose: "x" }), "NOT_EDITABLE");
    await expectCode(indents.deleteLine(admin, ind.indentNumber, sub.items[0].id, sub.version), "NOT_EDITABLE");
    await expectCode(indents.addLine(admin, ind.indentNumber, { version: sub.version, line: line(f, f.unstockedItemId) }), "NOT_EDITABLE");
    await expectCode(indents.deleteIndent(admin, ind.indentNumber, sub.version), "NOT_EDITABLE");
    // The Submitted indent is still there, untouched.
    expect((await indents.getIndent(admin, ind.indentNumber)).version).toBe(sub.version);
  });

  it("submit needs the current version", async () => {
    const ind = await indents.createIndent(admin, newIndent(f));
    await expectCode(indents.submitIndent(admin, ind.indentNumber, ind.version + 5), "VERSION_CONFLICT");
  });

  it("soft-deletes a Draft: hidden everywhere, row and number kept (invariant 2)", async () => {
    const a = await indents.createIndent(admin, newIndent(f));
    await indents.deleteIndent(admin, a.indentNumber, a.version);
    await expectCode(indents.getIndent(admin, a.indentNumber), "NOT_FOUND");
    const raw = await prisma.indent.findUniqueOrThrow({ where: { indentNumber: a.indentNumber } });
    expect(raw.deletedAt).not.toBeNull();
    expect(raw.deletedByUserId).toBe(admin.id);
    const list = await indents.listIndents(admin, { page: 1, search: a.indentNumber });
    expect(list.items.some((i) => i.indentNumber === a.indentNumber)).toBe(false);
    const b = await indents.createIndent(admin, newIndent(f));
    expect(b.indentNumber).not.toBe(a.indentNumber);
    await expectCode(indents.deleteIndent(admin, a.indentNumber, a.version), "NOT_FOUND");
  });
});

describe("authorization on writes (BR-08)", () => {
  it("keeps other users' indents invisible (NOT_FOUND) and refuses view-only roles (FORBIDDEN)", async () => {
    const owner = employee("t-emp-owner", f.deptA);
    const other = employee("t-emp-other", f.deptA);
    const ind = await indents.createIndent(owner, newIndent(f));
    await expectCode(indents.updateRemark(other, ind.indentNumber, { version: 1, remark: "x" }), "NOT_FOUND");
    await expectCode(indents.deleteIndent(other, ind.indentNumber, 1), "NOT_FOUND");
    // Purchase can see everything but may not edit, submit or delete.
    await expectCode(indents.updateRemark(users.purchase, ind.indentNumber, { version: 1, remark: "x" }), "FORBIDDEN");
    await expectCode(indents.submitIndent(users.purchase, ind.indentNumber, 1), "FORBIDDEN");
    await expectCode(indents.deleteIndent(users.purchase, ind.indentNumber, 1), "FORBIDDEN");
    // A department head in the same department can edit (department scope).
    const edited = await indents.updateRemark(head("t-head-a", f.deptA), ind.indentNumber, { version: 1, remark: "by head" });
    expect(edited.remark).toBe("by head");
    await expectCode(indents.updateRemark(null, ind.indentNumber, { version: 1, remark: "x" }), "UNAUTHENTICATED");
  });
});
