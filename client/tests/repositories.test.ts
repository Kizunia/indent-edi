// Integration tests for the MySQL-backed repositories (lib/repositories/*).
//
// They need a real MySQL database that already has the migration applied:
//   TEST_DATABASE_URL="mysql://USER:PASS@HOST:PORT/indent_test" npm test
// The database name must end in "_test"; otherwise every test is skipped so
// that real data can never be touched. Run with `npm test` (tsx + node:test).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const URL = process.env.TEST_DATABASE_URL ?? "";
const dbName = URL.split("?")[0].split("/").pop() ?? "";
const enabled = URL !== "" && dbName.endsWith("_test");
const it = enabled ? test : test.skip;
if (!enabled) {
  console.warn('Skipping repository tests: set TEST_DATABASE_URL to a database whose name ends in "_test".');
}

const WHO = "repo-test-user";
let prisma: PrismaClient;
let indents: typeof import("@/lib/repositories/indents");
let items: typeof import("@/lib/repositories/items");
let stock: typeof import("@/lib/repositories/stock");
let itemId = "";
let itemCode = "";

before(async () => {
  if (!enabled) return;
  process.env.DATABASE_URL = URL; // the app's Prisma client reads this on first import
  prisma = new PrismaClient({ datasources: { db: { url: URL } } });
  indents = await import("@/lib/repositories/indents");
  items = await import("@/lib/repositories/items");
  stock = await import("@/lib/repositories/stock");

  await prisma.department.upsert({ where: { code: "TEST_STORES" }, update: {}, create: { code: "TEST_STORES", name: "Test Stores" } });
  await prisma.department.upsert({ where: { code: "TEST_PROD" }, update: {}, create: { code: "TEST_PROD", name: "Test Production" } });
  await prisma.indentType.upsert({ where: { code: "TEST_PURCHASE" }, update: {}, create: { code: "TEST_PURCHASE", name: "Test Purchase" } });
  const unit = await prisma.unit.upsert({ where: { code: "Nos" }, update: {}, create: { code: "Nos", name: "Nos" } });
  const item = await prisma.item.upsert({
    where: { itemCode: "TST-00001" },
    update: {},
    create: { itemCode: "TST-00001", itemName: "Test Motor Starter", specification: "spec", defaultUnitId: unit.id },
  });
  await prisma.stockBalance.upsert({
    where: { itemId: item.id },
    update: { currentQuantity: 5 },
    create: { itemId: item.id, currentQuantity: 5, updatedAt: new Date() },
  });
  itemId = String(item.id);
  itemCode = item.itemCode;
});

after(async () => {
  if (!enabled) return;
  await prisma.indent.deleteMany({ where: { createdByName: WHO } }); // lines and history cascade
  const created = await prisma.item.findMany({ where: { itemName: { startsWith: "Test New " } } });
  for (const i of created) {
    await prisma.stockBalance.deleteMany({ where: { itemId: i.id } });
    await prisma.item.delete({ where: { id: i.id } });
  }
  await prisma.$disconnect();
  const mod = await import("@/lib/db/client");
  await mod.prisma.$disconnect();
});

function line(qty = 1) {
  return { itemId, department: "Test Stores", currentStockAtEntry: 5, requiredQuantity: qty, requiredDate: "2026-12-01", unit: "Nos" };
}

function newIndent(
  lines = [line()],
  status: "Draft" | "Submitted" = "Draft",
  over: Partial<Parameters<typeof indents.createIndent>[0]> = {}
) {
  return indents.createIndent({
    indentType: "Test Purchase",
    indentDate: "2026-11-17",
    time: "10:00",
    department: "Test Stores",
    createdBy: WHO,
    status,
    items: lines,
    ...over,
  });
}

// --- Black-box: equivalence partitioning / boundary values on item count (FR-08) ---
it("TC-01 an Indent with 0 items is rejected", async () => {
  await assert.rejects(() => newIndent([]), /at least one Item/);
});
it("TC-02 an Indent with 1 item (lower boundary) is accepted", async () => {
  assert.equal((await newIndent([line()])).items.length, 1);
});
it("TC-03 an Indent with several items keeps all of them", async () => {
  assert.equal((await newIndent([line(1), line(2), line(3)])).items.length, 3);
});

// --- Draft / Submit and numbering (FR-02, FR-09, FR-10) ---
it("TC-04 Save creates a Draft and Submit creates a Submitted Indent", async () => {
  assert.equal((await newIndent([line()], "Draft")).status, "Draft");
  assert.equal((await newIndent([line()], "Submitted")).status, "Submitted");
});
it("TC-05 Indent Numbers follow IND-YYYYMMDD-#### and are unique", async () => {
  const a = await newIndent();
  const b = await newIndent();
  assert.match(a.indentNumber, /^IND-\d{8}-\d{4}$/);
  assert.notEqual(a.indentNumber, b.indentNumber);
});
it("TC-06 five Indents created at the same time all get different numbers", async () => {
  const made = await Promise.all([1, 2, 3, 4, 5].map(() => newIndent()));
  assert.equal(new Set(made.map((i) => i.indentNumber)).size, 5);
});

// --- Editing and deleting (FR-16 to FR-18, BR-06) ---
it("TC-07 editable fields change on a Draft; immutable fields do not", async () => {
  const ind = await newIndent();
  const row = ind.items[0];
  const updated = await indents.updateIndent(ind.id, {
    remark: "urgent",
    items: [{ indentItemId: row.indentItemId, requiredQuantity: 40 }],
  });
  assert.equal(updated.remark, "urgent");
  assert.equal(updated.items[0].requiredQuantity, 40);
  assert.equal(updated.items[0].itemName, row.itemName);
  assert.equal(updated.indentNumber, ind.indentNumber);
});
it("TC-08 the last remaining item cannot be removed, but one of two can", async () => {
  const ind = await newIndent([line(1), line(2)]);
  const after1 = await indents.deleteIndentItem(ind.id, ind.items[0].indentItemId);
  assert.equal(after1.items.length, 1);
  await assert.rejects(() => indents.deleteIndentItem(ind.id, after1.items[0].indentItemId), /last remaining Item/);
});
it("TC-09 deleting an Indent hides it but keeps the row; an unknown id fails cleanly", async () => {
  const ind = await newIndent();
  await indents.deleteIndent(ind.id);
  assert.equal(await indents.getIndentById(ind.id), undefined);
  const raw = await prisma.indent.findUnique({ where: { id: Number(ind.id) } });
  assert.ok(raw?.deletedAt, "row is soft-deleted, not removed");
  await assert.rejects(() => indents.deleteIndent("999999999"), /Indent not found/);
});
it("TC-10 a number is never reused after an earlier Indent is deleted", async () => {
  const a = await newIndent();
  const b = await newIndent();
  await indents.deleteIndent(a.id);
  const c = await newIndent();
  assert.notEqual(c.indentNumber, b.indentNumber);
  assert.notEqual(c.indentNumber, a.indentNumber);
});

// --- Rules the server now enforces itself (BR-12, FR-08, NFR-10) ---
it("TC-11 a Submitted Indent cannot be edited or have an item removed", async () => {
  const ind = await newIndent([line(1), line(2)], "Submitted");
  await assert.rejects(() => indents.updateIndent(ind.id, { remark: "x" }), /cannot be edited/);
  await assert.rejects(() => indents.deleteIndentItem(ind.id, ind.items[0].indentItemId), /cannot be edited/);
});
it("TC-12 a Draft moves to Submitted, and then stays Submitted", async () => {
  const ind = await newIndent();
  assert.equal((await indents.updateIndent(ind.id, { status: "Submitted" })).status, "Submitted");
  await assert.rejects(() => indents.updateIndent(ind.id, { status: "Draft" }), /cannot be changed/);
});
it("TC-13 an unknown Department or Indent Type is rejected", async () => {
  await assert.rejects(() => newIndent([line()], "Draft", { department: "No Such Dept" }), /Invalid Department/);
  await assert.rejects(() => newIndent([line()], "Draft", { indentType: "No Such Type" }), /Invalid Indent Type/);
});
it("TC-14 a required quantity of 0 is rejected (boundary)", async () => {
  await assert.rejects(() => newIndent([line(0)]), /greater than 0/);
});
it("TC-15 a change made with an out-of-date version is rejected (optimistic lock)", async () => {
  const ind = await newIndent();
  const v = (await prisma.indent.findUniqueOrThrow({ where: { id: Number(ind.id) } })).version;
  await indents.updateIndent(ind.id, { remark: "first", version: v });
  await assert.rejects(() => indents.updateIndent(ind.id, { remark: "second", version: v }), /changed by someone else/);
});

// --- Search, filters, pagination (FR-12, FR-13, FR-15) ---
it("TC-16 search is a partial, case-insensitive match on Indent Number", async () => {
  const ind = await newIndent();
  const hit = await indents.queryIndents({ search: ind.indentNumber.slice(-8).toLowerCase() });
  assert.ok(hit.results.some((i) => i.id === ind.id));
  assert.equal((await indents.queryIndents({ search: "ZZZ-NO-MATCH" })).total, 0);
});
it("TC-17 filters combine (status AND department)", async () => {
  await newIndent([line()], "Draft");
  const r = await indents.queryIndents({ status: "Draft", department: "Test Stores", createdBy: WHO });
  assert.ok(r.total >= 1);
  assert.ok(r.results.every((i) => i.status === "Draft"));
});
it("TC-18 the list is paged at 10 records per page", async () => {
  for (let i = 0; i < 12; i++) await newIndent();
  const p1 = await indents.queryIndents({ page: 1, createdBy: WHO });
  const p2 = await indents.queryIndents({ page: 2, createdBy: WHO });
  assert.equal(p1.pageSize, 10);
  assert.equal(p1.results.length, 10);
  assert.ok(p2.results.length >= 1);
});

// --- Items and stock (FR-06, FR-07, BR-04) ---
it("TC-19 a new Item gets an ITM-##### code and a zero stock record", async () => {
  const item = await items.createItem({ itemName: "Test New Bolt M8", unit: "Nos" });
  assert.match(item.itemCode, /^ITM-\d{5}$/);
  assert.equal(await stock.getCurrentStock(item.itemCode), 0);
});
it("TC-20 creating an Indent does not reduce Current Stock", async () => {
  const before = await stock.getCurrentStock(itemCode);
  await newIndent([line(3)]);
  assert.equal(await stock.getCurrentStock(itemCode), before);
});
