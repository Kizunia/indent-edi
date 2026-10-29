import { describe, expect, it } from "vitest";
import { formatSequenceNumber, isPositiveQuantity } from "@/lib/shared/format";

describe("formatSequenceNumber", () => {
  it("pads with the configured width", () => {
    expect(formatSequenceNumber("IND-", 6, 124)).toBe("IND-000124");
    expect(formatSequenceNumber("ITM-", 6, 1)).toBe("ITM-000001");
  });
  it("does not truncate when the value is wider than the padding", () => {
    expect(formatSequenceNumber("IND-", 3, 123456)).toBe("IND-123456");
  });
  it("rejects negative or fractional values", () => {
    expect(() => formatSequenceNumber("IND-", 6, -1)).toThrow(RangeError);
    expect(() => formatSequenceNumber("IND-", 6, 1.5)).toThrow(RangeError);
  });
});

describe("isPositiveQuantity", () => {
  it.each(["1", "0.5", "12.3456", "0.0001", "99999999999999.9999"])("accepts %s", (v) => {
    expect(isPositiveQuantity(v)).toBe(true);
  });
  it.each(["0", "0.0", "0.0000", "-1", "1.23456", "1e3", "abc", "", " 1", "100000000000000"])(
    "rejects %s",
    (v) => {
      expect(isPositiveQuantity(v)).toBe(false);
    }
  );
});
