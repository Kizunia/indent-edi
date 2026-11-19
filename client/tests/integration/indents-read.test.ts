import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import * as indents from "@/lib/services/indents";
import * as items from "@/lib/services/items";
import { getMeta } from "@/lib/services/masters";
import { employee, expectCode, head, line, newIndent, setupFixtures, users, type Fixtures } from "./fixtures";

// List, search, filters, paging, scope, items and stock (FR-07, FR-11..FR-15, DEC-011, DEC-022).
let f: Fixtures;
const admin = users.admin;

beforeAll(async () => {
  f = await setupFixtures();
});

describe("list, filters and paging", () => {
  it("pages at 10, newest first, with a total", async () => {
    const creator = employee("t-emp-paging", f.deptA);
    for (let i = 0; i < 12; i++) await indents.createIndent(creator, newIndent(f));
    const p1 = await indents.listIndents(creator, { page: 1 });
    const p2 = await indents.listIndents(creator, { page: 2 });
    expect(p1.pageSize).toBe(10);
    expect(p1.total).toBe(12);
    expect(p1.items).toHaveLength(10);
    expect(p2.items).toHaveLength(2);
    const ids = [...p1.items, ...p2.items].map((i) => i.indentNumber);
    expect(new Set(ids).size).toBe(12);
    expect(ids).toEqual([...ids].sort().reverse()); // same date -> id desc
    expect(p1.items[0].itemCount).toBe(1);
  });

  it("combines filters (type, status, department) and matches a line department too (DEC-022)", async () => {
    const creator = employee("t-emp-filters", f.deptA);
    const draft = await indents.createIndent(creator, newIndent(f, { items: [{ ...line(f, f.stockedItemId), departmentId: f.deptB }] }));
    await indents.createIndent(creator, newIndent(f, { submit: true }));

    const meta = await getMeta();
    const draftStatus = meta.statuses.find((s) => s.code === "DRAFT")!;
    const byLineDept = await indents.listIndents(admin, { page: 1, createdBy: creator.id, departmentId: f.deptB });
    expect(byLineDept.items.map((i) => i.indentNumber)).toEqual([draft.indentNumber]); // header is A, line is B

    const byStatus = await indents.listIndents(admin, { page: 1, createdBy: creator.id, statusId: draftStatus.id, departmentId: f.deptA });
    expect(byStatus.total).toBe(1);
    expect(byStatus.items.every((i) => i.status.code === "DRAFT")).toBe(true);

    const byType = await indents.listIndents(admin, { page: 1, createdBy: creator.id, indentTypeId: f.typeId });
    expect(byType.total).toBe(2);
  });

  it("filters by a single Date, separately from the range (SRS 10.3)", async () => {
    const creator = employee("t-emp-date", f.deptA);
    const ind = await indents.createIndent(creator, newIndent(f));
    const day = ind.indentDate;
    expect((await indents.listIndents(creator, { page: 1, date: day })).total).toBe(1);
    expect((await indents.listIndents(creator, { page: 1, date: "2000-01-01" })).total).toBe(0);
    // Combined with the range and other filters the conditions all apply.
    expect((await indents.listIndents(creator, { page: 1, date: day, dateFrom: "2099-01-01" })).total).toBe(0);
    expect((await indents.listIndents(creator, { page: 1, date: day, indentTypeId: f.typeId })).total).toBe(1);
  });

  it("filters by date range (inclusive)", async () => {
    const creator = employee("t-emp-dates", f.deptA);
    const ind = await indents.createIndent(creator, newIndent(f));
    const day = ind.indentDate;
    expect((await indents.listIndents(creator, { page: 1, dateFrom: day, dateTo: day })).total).toBe(1);
    expect((await indents.listIndents(creator, { page: 1, dateFrom: "2000-01-01", dateTo: "2000-01-02" })).total).toBe(0);
    expect((await indents.listIndents(creator, { page: 1, dateFrom: "2099-01-01" })).total).toBe(0);
  });
});

describe("search (DEC-011)", () => {
  it("is partial and case-insensitive, with an exact match first on page 1", async () => {
    const creator = employee("t-emp-search", f.deptA);
    const made = [];
    for (let i = 0; i < 3; i++) made.push(await indents.createIndent(creator, newIndent(f)));
    const oldest = made[0];

    const partial = await indents.listIndents(creator, { page: 1, search: oldest.indentNumber.slice(-3).toLowerCase() });
    expect(partial.items.some((i) => i.indentNumber === oldest.indentNumber)).toBe(true);

    // Exact match is pulled to the top although it is the oldest.
    const exact = await indents.listIndents(admin, { page: 1, search: oldest.indentNumber.toLowerCase() });
    expect(exact.items[0].indentNumber).toBe(oldest.indentNumber);

    // A term that matches many rows does not duplicate the exact row across pages.
    const num = Number(oldest.indentNumber.replace(/\D/g, ""));
    const broad = await indents.listIndents(admin, { page: 1, search: "IND-" });
    const broadNext = await indents.listIndents(admin, { page: 2, search: "IND-" });
    const seen = new Set([...broad.items, ...broadNext.items].map((i) => i.indentNumber));
    expect(seen.size).toBe(broad.items.length + broadNext.items.length);
    expect(num).toBeGreaterThan(0);

    expect((await indents.listIndents(admin, { page: 1, search: "ZZZ-NO-MATCH" })).total).toBe(0);
  });

  it("treats % and _ typed by the user literally", async () => {
    expect((await indents.listIndents(admin, { page: 1, search: "%" })).total).toBe(0);
    expect((await indents.listIndents(admin, { page: 1, search: "IND-00000_" })).total).toBe(0);
  });
});

describe("scope (permissions.md)", () => {
  it("shows employees only their own indents, heads their department, purchase/admin everything", async () => {
    const a = employee("t-emp-scope-a", f.deptA);
    const b = employee("t-emp-scope-b", f.deptA);
    const headA = head("t-head-scope-a", f.deptA);
    const headB = head("t-head-scope-b", f.deptB);
    const mine = await indents.createIndent(a, newIndent(f));
    const theirs = await indents.createIndent(b, newIndent(f));

    const numbers = async (u: Parameters<typeof indents.listIndents>[0]) =>
      (await indents.listIndents(u, { page: 1, search: "IND-" })).items.map((i) => i.indentNumber);
    // Narrow with createdBy so the 10-row page cannot hide results.
    const ownList = await indents.listIndents(a, { page: 1 });
    expect(ownList.items.every((i) => i.createdBy.id === a.id)).toBe(true);
    await expectCode(indents.getIndent(a, theirs.indentNumber), "NOT_FOUND");
    expect((await indents.getIndent(a, mine.indentNumber)).indentNumber).toBe(mine.indentNumber);

    expect((await indents.getIndent(headA, theirs.indentNumber)).indentNumber).toBe(theirs.indentNumber);
    await expectCode(indents.getIndent(headB, theirs.indentNumber), "NOT_FOUND");

    // A line in the other department makes the indent visible to that department's head.
    const cross = await indents.createIndent(a, newIndent(f, { items: [{ ...line(f, f.stockedItemId), departmentId: f.deptB }] }));
    expect((await indents.getIndent(headB, cross.indentNumber)).indentNumber).toBe(cross.indentNumber);

    expect((await indents.getIndent(users.purchase, theirs.indentNumber)).permissions).toEqual({
      canEdit: false, canSubmit: false, canDelete: false, canPrint: true,
    });
    expect((await indents.getIndent(admin, theirs.indentNumber)).permissions.canEdit).toBe(true);
    expect(await numbers(users.nobody).catch((e) => e.code)).toBe("FORBIDDEN");
    await expectCode(indents.listIndents(null, { page: 1 }), "UNAUTHENTICATED");
  });

  it("lists creators within the user's scope", async () => {
    const a = employee("t-emp-cr-a", f.deptA);
    await indents.createIndent(a, newIndent(f));
    await indents.createIndent(a, newIndent(f));
    expect(await indents.listCreators(a)).toEqual([{ id: a.id, name: a.name }]);
    const all = await indents.listCreators(admin);
    expect(all.filter((c) => c.id === a.id)).toHaveLength(1); // distinct
  });
});

describe("number preview (DEC-010)", () => {
  it("shows the next number without reserving it", async () => {
    const preview = await indents.getExpectedNumber(admin);
    expect(await indents.getExpectedNumber(admin)).toBe(preview);
    const made = await indents.createIndent(admin, newIndent(f));
    expect(made.indentNumber).toBe(preview);
    expect(await indents.getExpectedNumber(admin)).not.toBe(preview);
    await expectCode(indents.getExpectedNumber(users.purchase), "FORBIDDEN");
  });
});

describe("items and stock (FR-07, DEC-013, DEC-025)", () => {
  it("searches active items, prefix matches first, max 20 with hasMore", async () => {
    for (let i = 1; i <= 22; i++) {
      await prisma.item.upsert({
        where: { itemCode: `ZSR-${String(i).padStart(3, "0")}` },
        update: { isActive: true },
        create: { itemCode: `ZSR-${String(i).padStart(3, "0")}`, itemName: `Zsearch Widget ${i}`, defaultUnitId: f.unitId },
      });
    }
    await prisma.item.upsert({
      where: { itemCode: "ZSR-X" },
      update: { isActive: true },
      create: { itemCode: "ZSR-X", itemName: "Alpha Zsearch Trailing", defaultUnitId: f.unitId },
    });
    const r = await items.searchItems(admin, "zsearch");
    expect(r.items).toHaveLength(20);
    expect(r.hasMore).toBe(true);
    expect(r.items.every((i) => i.itemName.startsWith("Zsearch"))).toBe(true); // prefix matches fill the page first

    const small = await items.searchItems(admin, "Alpha Zsearch");
    expect(small.items.map((i) => i.itemCode)).toEqual(["ZSR-X"]);
    expect(small.hasMore).toBe(false);
    expect(small.items[0].defaultUnit?.id).toBe(f.unitId);

    await prisma.item.update({ where: { itemCode: "ZSR-X" }, data: { isActive: false } });
    expect((await items.searchItems(admin, "Alpha Zsearch")).items).toHaveLength(0);
    expect((await items.searchItems(admin, "%")).items).toHaveLength(0);
    await expectCode(items.searchItems(users.purchase, "x"), "FORBIDDEN");
  });

  it("limits the search to the name or the code input (DEC-027)", async () => {
    await prisma.item.upsert({
      where: { itemCode: "FLD-000100" },
      update: { isActive: true, itemName: "Fldtest Widget" },
      create: { itemCode: "FLD-000100", itemName: "Fldtest Widget", defaultUnitId: f.unitId },
    });
    await prisma.item.upsert({
      where: { itemCode: "FLDTEST-9" },
      update: { isActive: true, itemName: "Other Thing" },
      create: { itemCode: "FLDTEST-9", itemName: "Other Thing", defaultUnitId: f.unitId },
    });
    const codes = (r: { items: { itemCode: string }[] }) => r.items.map((i) => i.itemCode).sort();
    // Without a field both columns are searched: the name of one and the code of the other.
    expect(codes(await items.searchItems(admin, "fldtest"))).toEqual(["FLD-000100", "FLDTEST-9"]);
    // The Name input only looks at names, the Code input only at codes.
    expect(codes(await items.searchItems(admin, "fldtest", "name"))).toEqual(["FLD-000100"]);
    expect(codes(await items.searchItems(admin, "fldtest", "code"))).toEqual(["FLDTEST-9"]);
    // The linked field comes back with the item: picking by name gives the code and vice versa.
    const byName = (await items.searchItems(admin, "Fldtest Widget", "name")).items[0];
    expect(byName.itemCode).toBe("FLD-000100");
    const byCode = (await items.searchItems(admin, "FLD-000100", "code")).items[0];
    expect(byCode.itemName).toBe("Fldtest Widget");
  });

  it("returns stock, null for items without a stock row and for unknown ids", async () => {
    const stock = await items.getStock(admin, [f.stockedItemId, f.unstockedItemId, 999_999_999]);
    expect(stock[0]).toMatchObject({ itemId: f.stockedItemId, quantity: "5.0000" });
    expect(stock[0].updatedAt).not.toBeNull();
    expect(stock[1]).toEqual({ itemId: f.unstockedItemId, quantity: null, updatedAt: null });
    expect(stock[2].quantity).toBeNull();
  });

  it("serves active masters, units and every status", async () => {
    const meta = await getMeta();
    expect(meta.departments.some((d) => d.id === f.deptA)).toBe(true);
    expect(meta.units.some((u) => u.id === f.unitId)).toBe(true);
    expect(meta.statuses.map((s) => s.code)).toEqual(expect.arrayContaining(["DRAFT", "SUBMITTED"]));
    expect(meta.statuses.find((s) => s.code === "DRAFT")!.isEditable).toBe(true);
  });
});
