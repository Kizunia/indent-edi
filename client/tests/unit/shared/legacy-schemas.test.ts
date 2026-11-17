import { describe, expect, it } from "vitest";
import {
  legacyCreateIndentSchema,
  legacyExportSchema,
  legacyItemEntrySchema,
  legacyListQuerySchema,
  legacyUpdateIndentSchema,
} from "@/lib/shared/schemas/legacy";
import { LegacyValidationError, validate, validationResponse } from "@/lib/server/http/legacy";

const line = {
  itemId: "1",
  department: "Stores",
  currentStockAtEntry: 0,
  requiredQuantity: 5,
  requiredDate: "2026-11-01",
  unit: "Kg",
};
const indent = {
  indentType: "Purchase",
  indentDate: "2026-10-29",
  time: "10:30",
  department: "Stores",
  createdBy: "Asha",
  status: "Draft",
  items: [line],
};

describe("legacyCreateIndentSchema", () => {
  it("accepts a valid indent and trims text", () => {
    const r = legacyCreateIndentSchema.safeParse({ ...indent, createdBy: "  Asha ", remark: "  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.createdBy).toBe("Asha");
      expect(r.data.remark).toBeUndefined();
    }
  });

  it("rejects an empty item list", () => {
    const r = legacyCreateIndentSchema.safeParse({ ...indent, items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects bad status, date, time and quantity", () => {
    for (const bad of [
      { status: "Approved" },
      { indentDate: "2026-02-30" },
      { time: "25:00" },
      { items: [{ ...line, requiredQuantity: 0 }] },
      { items: [{ ...line, requiredQuantity: 1.00001 }] },
      { items: [{ ...line, itemId: "abc" }] },
    ]) {
      expect(legacyCreateIndentSchema.safeParse({ ...indent, ...bad }).success).toBe(false);
    }
  });

  it("rejects a required date before the indent date", () => {
    const r = legacyCreateIndentSchema.safeParse({ ...indent, items: [{ ...line, requiredDate: "2026-10-01" }] });
    expect(r.success).toBe(false);
  });
});

describe("legacyUpdateIndentSchema", () => {
  it("needs at least one change", () => {
    expect(legacyUpdateIndentSchema.safeParse({}).success).toBe(false);
    expect(legacyUpdateIndentSchema.safeParse({ status: "Submitted" }).success).toBe(true);
  });
  it("validates line patches", () => {
    const bad = legacyUpdateIndentSchema.safeParse({ items: [{ indentItemId: "3", requiredQuantity: -1 }] });
    expect(bad.success).toBe(false);
  });
});

describe("legacyItemEntrySchema", () => {
  const entry = { itemName: "Bolt", unit: "Nos", department: "Stores", requiredQuantity: "2.5", requiredDate: "2026-11-01" };
  it("accepts a valid entry", () => expect(legacyItemEntrySchema.safeParse(entry).success).toBe(true));
  it("rejects blank name and non-positive quantity", () => {
    expect(legacyItemEntrySchema.safeParse({ ...entry, itemName: "   " }).success).toBe(false);
    expect(legacyItemEntrySchema.safeParse({ ...entry, requiredQuantity: "0" }).success).toBe(false);
    expect(legacyItemEntrySchema.safeParse({ ...entry, requiredQuantity: "abc" }).success).toBe(false);
  });
});

describe("list and export", () => {
  it("defaults paging and ignores empty filters", () => {
    const r = legacyListQuerySchema.parse({ search: "", dateFrom: "" });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(10);
    expect(r.search).toBeUndefined();
  });
  it("rejects a reversed date range and a bad page", () => {
    expect(legacyListQuerySchema.safeParse({ dateFrom: "2026-02-01", dateTo: "2026-01-01" }).success).toBe(false);
    expect(legacyListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
  it("requires ids when exporting a selection", () => {
    expect(legacyExportSchema.safeParse({ mode: "selected", ids: [] }).success).toBe(false);
    expect(legacyExportSchema.safeParse({ mode: "selected", ids: ["1"] }).success).toBe(true);
    expect(legacyExportSchema.safeParse({ mode: "all", filters: { status: "" } }).success).toBe(true);
  });
});

describe("legacy route helper", () => {
  it("turns a failure into a 400 with a string error", async () => {
    let caught: unknown;
    try {
      validate({ ...indent, items: [] }, legacyCreateIndentSchema);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LegacyValidationError);
    const res = validationResponse(caught)!;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.fieldErrors.items).toBeTruthy();
  });
  it("ignores other errors", () => expect(validationResponse(new Error("x"))).toBeNull());
});
