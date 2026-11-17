// Run by Node's built-in test runner (`npm test`), not by the Next.js build.
// Each run works on a throw-away copy of /data, so the seed files are never modified.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ORIGINAL_CWD = process.cwd();
let tmp: string;
let store: typeof import("../lib/store");

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "indent-test-"));
  fs.cpSync(path.join(ORIGINAL_CWD, "data"), path.join(tmp, "data"), { recursive: true });
  process.chdir(tmp); // lib/store.ts resolves its data folder from process.cwd()
  // @ts-expect-error Node's runner needs the .ts extension, which tsc rejects
  store = await import("../lib/store.ts");
});

after(() => {
  process.chdir(ORIGINAL_CWD);
  fs.rmSync(tmp, { recursive: true, force: true });
});

function lineItem(n = 1) {
  const item = store.getItems()[0];
  return {
    itemId: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    department: "Stores",
    currentStockAtEntry: 5,
    requiredQuantity: n,
    requiredDate: "2026-12-01",
    unit: item.unit,
  };
}

function newIndent(items = [lineItem()], status: "Draft" | "Submitted" = "Draft") {
  return store.createIndent({
    indentType: "Purchase",
    indentDate: "2026-11-17",
    time: "10:00",
    department: "Stores",
    createdBy: "tester",
    status,
    items,
  });
}

// --- Black-box: equivalence partitioning / boundary value analysis (FR-08) ---
test("TC-01 an Indent with 0 items is rejected", () => {
  assert.throws(() => newIndent([]), /at least one Item/);
});

test("TC-02 an Indent with 1 item (lower boundary) is accepted", () => {
  assert.equal(newIndent([lineItem()]).items.length, 1);
});

test("TC-03 an Indent with several items keeps all of them", () => {
  assert.equal(newIndent([lineItem(1), lineItem(2), lineItem(3)]).items.length, 3);
});

// --- Draft / Submit, Indent Number (FR-02, FR-09, FR-10) ---
test("TC-04 Save creates a Draft and Submit creates a Submitted Indent", () => {
  assert.equal(newIndent([lineItem()], "Draft").status, "Draft");
  assert.equal(newIndent([lineItem()], "Submitted").status, "Submitted");
});

test("TC-05 Indent Numbers follow IND-YYYYMMDD-#### and are unique", () => {
  const a = newIndent();
  const b = newIndent();
  assert.match(a.indentNumber, /^IND-\d{8}-\d{4}$/);
  assert.notEqual(a.indentNumber, b.indentNumber);
});

// --- Editing and deleting (FR-16 to FR-18, BR-06) ---
test("TC-06 editable item fields change; immutable fields do not", () => {
  const ind = newIndent();
  const row = ind.items[0];
  const updated = store.updateIndent(ind.id, {
    remark: "urgent",
    items: [{ indentItemId: row.indentItemId, requiredQuantity: 40 }],
  });
  assert.equal(updated.remark, "urgent");
  assert.equal(updated.items[0].requiredQuantity, 40);
  assert.equal(updated.items[0].itemName, row.itemName);
  assert.equal(updated.indentNumber, ind.indentNumber);
});

test("TC-07 the last remaining item cannot be removed, but one of two can", () => {
  const ind = newIndent([lineItem(1), lineItem(2)]);
  const after1 = store.deleteIndentItem(ind.id, ind.items[0].indentItemId);
  assert.equal(after1.items.length, 1);
  assert.throws(
    () => store.deleteIndentItem(ind.id, after1.items[0].indentItemId),
    /last remaining Item/
  );
});

test("TC-08 an Indent can be deleted, and deleting an unknown id fails cleanly", () => {
  const ind = newIndent();
  store.deleteIndent(ind.id);
  assert.equal(store.getIndentById(ind.id), undefined);
  assert.throws(() => store.deleteIndent("no-such-id"), /Indent not found/);
});

// --- Search, filters, pagination (FR-12, FR-13, FR-15) ---
test("TC-09 search is a partial, case-insensitive match on Indent Number", () => {
  const ind = newIndent();
  const hit = store.queryIndents({ search: ind.indentNumber.slice(-8).toLowerCase() });
  assert.ok(hit.results.some((i) => i.id === ind.id));
  assert.equal(store.queryIndents({ search: "ZZZ-NO-MATCH" }).total, 0);
});

test("TC-10 filters combine (status AND department)", () => {
  newIndent([lineItem()], "Draft");
  const r = store.queryIndents({ status: "Draft", department: "Stores" });
  assert.ok(r.total >= 1);
  assert.ok(r.results.every((i) => i.status === "Draft" && i.department === "Stores"));
});

test("TC-11 the list is paged at 10 records per page", () => {
  for (let i = 0; i < 12; i++) newIndent();
  const p1 = store.queryIndents({ page: 1 });
  const p2 = store.queryIndents({ page: 2 });
  assert.equal(p1.pageSize, 10);
  assert.equal(p1.results.length, 10);
  assert.ok(p2.results.length >= 1);
  assert.ok(p1.total > 10);
});

// --- Items and stock (FR-06, FR-07, BR-04) ---
test("TC-12 a new Item gets an ITM-##### code and a zero stock record", () => {
  const item = store.createItem({ itemName: "Test Bolt M8", unit: "Nos" });
  assert.match(item.itemCode, /^ITM-\d{5}$/);
  assert.equal(store.getCurrentStock(item.itemCode), 0);
});

test("TC-13 creating an Indent does not reduce Current Stock", () => {
  const li = lineItem(3);
  const before = store.getCurrentStock(li.itemCode);
  newIndent([li]);
  assert.equal(store.getCurrentStock(li.itemCode), before);
});

// --- Regression: Indent Numbers must stay unique after a delete (FR-02, BR-02) ---
test("TC-14 an Indent Number is never reused after an earlier Indent is deleted", () => {
  const a = newIndent();
  const b = newIndent();
  store.deleteIndent(a.id);
  const c = newIndent();
  assert.notEqual(c.indentNumber, b.indentNumber);
});
