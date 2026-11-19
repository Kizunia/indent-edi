import { describe, expect, it } from "vitest";
import { safeText, wallClock } from "@/lib/server/export/indents-xlsx";
import { escapeLike } from "@/lib/services/items";
import { diffStock } from "@/components/indents/draft";
import { displayInstant, displayQuantity, displayTime } from "@/lib/shared/format";

describe("export helpers (DEC-018)", () => {
  it("prefixes text that could run as a formula", () => {
    for (const bad of ["=1+1", "+cmd", "-2", "@SUM(A1)", "\tx", "\rx"]) expect(safeText(bad)).toBe(`'${bad}`);
    expect(safeText("normal")).toBe("normal");
    expect(safeText("a=b")).toBe("a=b");
  });
  it("leaves empty values empty", () => {
    expect(safeText(null)).toBeNull();
    expect(safeText(undefined)).toBeNull();
    expect(safeText("")).toBeNull();
  });
  it("writes the company wall-clock time as if it were UTC", () => {
    // 2026-11-19T20:30Z is 02:00 the next day in Asia/Kolkata (UTC+5:30)
    expect(wallClock(new Date("2026-11-19T20:30:00Z"), "Asia/Kolkata").toISOString()).toBe("2026-11-20T02:00:00.000Z");
  });
});

describe("item search (DEC-011)", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("plain")).toBe("plain");
  });
});

describe("display helpers", () => {
  it("trims quantity zeros but never invents a 0 for unknown stock", () => {
    expect(displayQuantity("12.5000")).toBe("12.5");
    expect(displayQuantity("3.0000")).toBe("3");
    expect(displayQuantity("100")).toBe("100");
    expect(displayQuantity("0.0500")).toBe("0.05");
    expect(displayQuantity(null)).toBe("Not available");
  });
  it("formats time and instants in the company zone", () => {
    expect(displayTime("14:05:09")).toBe("14:05");
    expect(displayInstant("2026-11-19T20:30:00Z", "Asia/Kolkata")).toBe("2026-11-20 02:00");
    expect(displayInstant(null, "Asia/Kolkata")).toBe("");
  });
});

describe("stock freshness diff (DEC-013)", () => {
  const lines = [
    { itemId: 1, itemName: "A", stock: "5.0000" },
    { itemId: 2, itemName: "B", stock: null },
    { itemName: "New item", stock: null },
  ];
  it("lists only real changes, comparing numerically", () => {
    const current = [
      { itemId: 1, quantity: "5", updatedAt: null },
      { itemId: 2, quantity: "7.0000", updatedAt: null },
    ];
    expect(diffStock(lines, current)).toEqual([{ itemName: "B", was: null, now: "7.0000" }]);
  });
  it("reports stock that disappeared, and ignores new items", () => {
    const current = [{ itemId: 1, quantity: null, updatedAt: null }];
    expect(diffStock(lines, current)).toEqual([{ itemName: "A", was: "5.0000", now: null }]);
  });
});
