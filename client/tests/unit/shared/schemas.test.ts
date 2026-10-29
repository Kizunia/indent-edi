import { describe, expect, it } from "vitest";
import {
  addLineSchema,
  createIndentSchema,
  indentFiltersSchema,
  listQuerySchema,
  exportSchema,
  requiredDateErrors,
  submitSchema,
  updateIndentSchema,
  updateLineSchema,
  versionQuerySchema,
} from "@/lib/shared/schemas";
import { itemSearchQuerySchema, stockQuerySchema } from "@/lib/shared/schemas";

const line = {
  itemId: 5,
  requiredQuantity: "10",
  requiredUnitId: 1,
  requiredDate: "2026-11-15",
};
const indent = { indentTypeId: 1, departmentId: 2, items: [line] };

describe("createIndentSchema", () => {
  it("accepts a minimal valid indent", () => {
    expect(createIndentSchema.safeParse(indent).success).toBe(true);
  });

  it("trims text and turns empty optional text into undefined", () => {
    const r = createIndentSchema.parse({ ...indent, remark: "   " });
    expect(r.remark).toBeUndefined();
    const r2 = createIndentSchema.parse({ ...indent, remark: "  hello  " });
    expect(r2.remark).toBe("hello");
  });

  it("strips control characters but keeps line breaks", () => {
    const r = createIndentSchema.parse({ ...indent, remark: "a\u0000b\nc" });
    expect(r.remark).toBe("ab\nc");
  });

  it.each(["status", "createdBy", "indentNumber", "indentDate", "indentTime", "version"])(
    "rejects the server-owned field %s",
    (field) => {
      const r = createIndentSchema.safeParse({ ...indent, [field]: "x" });
      expect(r.success).toBe(false);
    }
  );

  it.each(["currentStock", "itemCode", "itemName", "currentStockAtEntry"])(
    "rejects the client-supplied line field %s",
    (field) => {
      const r = createIndentSchema.safeParse({ ...indent, items: [{ ...line, [field]: "x" }] });
      expect(r.success).toBe(false);
    }
  );

  it("requires an indent type and a department", () => {
    expect(createIndentSchema.safeParse({ ...indent, indentTypeId: undefined }).success).toBe(false);
    expect(createIndentSchema.safeParse({ ...indent, departmentId: undefined }).success).toBe(false);
  });

  it("requires at least one line with the dedicated message (FR-08)", () => {
    const r = createIndentSchema.safeParse({ ...indent, items: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("An Indent cannot be saved without at least one Item.");
  });
});

describe("line rules", () => {
  const parse = (l: object) => createIndentSchema.safeParse({ ...indent, items: [l] });

  it.each(["0", "0.0000", "-5", "abc", "1.00001", "", "1e3"])("rejects quantity %s", (q) => {
    expect(parse({ ...line, requiredQuantity: q }).success).toBe(false);
  });

  it("rejects a numeric quantity: it must be sent as text", () => {
    expect(parse({ ...line, requiredQuantity: 10 }).success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(parse({ ...line, requiredDate: "2026-02-30" }).success).toBe(false);
    expect(parse({ ...line, requiredDate: "15/11/2026" }).success).toBe(false);
  });

  it("needs exactly one of itemId or newItem", () => {
    const neither = parse({ requiredQuantity: "1", requiredUnitId: 1, requiredDate: "2026-11-15" });
    expect(neither.success).toBe(false);
    const both = parse({
      ...line,
      newItem: { itemName: "Bolt", defaultUnitId: 1 },
    });
    expect(both.success).toBe(false);
  });

  it("accepts a new item and validates its name and unit", () => {
    const { itemId, ...rest } = line;
    void itemId;
    expect(parse({ ...rest, newItem: { itemName: "  Hex bolt  ", defaultUnitId: 1 } }).success).toBe(true);
    expect(parse({ ...rest, newItem: { itemName: "   ", defaultUnitId: 1 } }).success).toBe(false);
    expect(parse({ ...rest, newItem: { itemName: "x".repeat(256), defaultUnitId: 1 } }).success).toBe(false);
    expect(parse({ ...rest, newItem: { itemName: "Bolt" } }).success).toBe(false);
  });

  it("limits drawing number to the column size", () => {
    const { itemId, ...rest } = line;
    void itemId;
    const newItem = { itemName: "Bolt", defaultUnitId: 1, drawingNumber: "d".repeat(101) };
    expect(parse({ ...rest, newItem }).success).toBe(false);
  });

  it("rejects non-integer and non-positive ids", () => {
    expect(parse({ ...line, itemId: 0 }).success).toBe(false);
    expect(parse({ ...line, itemId: 1.5 }).success).toBe(false);
    expect(parse({ ...line, requiredUnitId: -1 }).success).toBe(false);
  });
});

describe("requiredDateErrors", () => {
  it("flags only lines dated before the indent date, by path", () => {
    const errs = requiredDateErrors(
      [{ requiredDate: "2026-10-28" }, { requiredDate: "2026-10-29" }, { requiredDate: "2026-11-01" }],
      "2026-10-29"
    );
    expect(Object.keys(errs)).toEqual(["items.0.requiredDate"]);
  });
});

describe("edit schemas", () => {
  it("updateIndentSchema accepts only version and remark, and allows clearing the remark", () => {
    expect(updateIndentSchema.parse({ version: 3, remark: "" })).toEqual({ version: 3, remark: "" });
    expect(updateIndentSchema.safeParse({ version: 3, remark: "x", indentTypeId: 2 }).success).toBe(false);
    expect(updateIndentSchema.safeParse({ remark: "x" }).success).toBe(false);
    expect(updateIndentSchema.safeParse({ version: 0, remark: "x" }).success).toBe(false);
  });

  it("updateLineSchema needs at least one editable field", () => {
    expect(updateLineSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(updateLineSchema.safeParse({ version: 1, purpose: "" }).success).toBe(true);
    expect(updateLineSchema.safeParse({ version: 1, requiredQuantity: "2.5" }).success).toBe(true);
  });

  it("updateLineSchema does not allow changing the item", () => {
    expect(updateLineSchema.safeParse({ version: 1, itemId: 9, purpose: "x" }).success).toBe(false);
  });

  it("addLineSchema wraps a line with the version", () => {
    expect(addLineSchema.safeParse({ version: 2, line }).success).toBe(true);
    expect(addLineSchema.safeParse({ line }).success).toBe(false);
  });

  it("submitSchema takes only the version", () => {
    expect(submitSchema.safeParse({ version: 1 }).success).toBe(true);
    expect(submitSchema.safeParse({ version: 1, status: "SUBMITTED" }).success).toBe(false);
  });

  it("versionQuerySchema reads ?version= text", () => {
    expect(versionQuerySchema.parse({ version: "4" }).version).toBe(4);
    expect(versionQuerySchema.safeParse({}).success).toBe(false);
    expect(versionQuerySchema.safeParse({ version: "abc" }).success).toBe(false);
  });
});

describe("list filters", () => {
  it("treats empty query values as not provided and defaults to page 1", () => {
    const r = listQuerySchema.parse({ search: "", indentTypeId: "", dateFrom: "" });
    expect(r.search).toBeUndefined();
    expect(r.indentTypeId).toBeUndefined();
    expect(r.page).toBe(1);
  });

  it("coerces numbers from text", () => {
    const r = listQuerySchema.parse({ indentTypeId: "2", statusId: "1", page: "3" });
    expect(r).toMatchObject({ indentTypeId: 2, statusId: 1, page: 3 });
  });

  it("rejects bad pages and over-long search", () => {
    expect(listQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ search: "x".repeat(31) }).success).toBe(false);
  });

  it("rejects a reversed date range", () => {
    const r = indentFiltersSchema.safeParse({ dateFrom: "2026-10-30", dateTo: "2026-10-01" });
    expect(r.success).toBe(false);
    expect(indentFiltersSchema.safeParse({ dateFrom: "2026-10-01", dateTo: "2026-10-01" }).success).toBe(true);
  });
});

describe("export", () => {
  it("accepts selected numbers or a filtered mode, nothing else", () => {
    expect(exportSchema.safeParse({ indentNumbers: ["IND-000001"] }).success).toBe(true);
    expect(exportSchema.safeParse({ mode: "filtered", filters: {} }).success).toBe(true);
    expect(exportSchema.safeParse({ indentNumbers: [] }).success).toBe(false);
    expect(exportSchema.safeParse({ mode: "all" }).success).toBe(false);
  });
});

describe("item and stock queries", () => {
  it("item search defaults to an empty query", () => {
    expect(itemSearchQuerySchema.parse({}).q).toBe("");
    expect(itemSearchQuerySchema.parse({ q: "  bolt " }).q).toBe("bolt");
  });

  it("stock query parses a comma list of ids", () => {
    expect(stockQuerySchema.parse({ itemIds: "1, 2,3" }).itemIds).toEqual([1, 2, 3]);
    expect(stockQuerySchema.safeParse({ itemIds: "" }).success).toBe(false);
    expect(stockQuerySchema.safeParse({ itemIds: "1,x" }).success).toBe(false);
    expect(stockQuerySchema.safeParse({ itemIds: "0" }).success).toBe(false);
  });
});
