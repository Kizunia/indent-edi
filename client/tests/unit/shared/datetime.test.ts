import { describe, expect, it } from "vitest";
import {
  businessDate,
  businessTime,
  fileTimestamp,
  fromDbDate,
  fromDbTime,
  isValidCalendarDate,
  isValidTimeZone,
  toDbDate,
  toDbTime,
} from "@/lib/shared/datetime";

describe("isValidCalendarDate", () => {
  it.each(["2026-10-29", "2024-02-29", "2026-12-31"])("accepts %s", (v) => {
    expect(isValidCalendarDate(v)).toBe(true);
  });
  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-00-10", "29-10-2026", "2026-1-1", ""])(
    "rejects %s",
    (v) => {
      expect(isValidCalendarDate(v)).toBe(false);
    }
  );
});

describe("business date and time in APP_TIMEZONE", () => {
  // 20:00 UTC on 29 Oct is already 01:30 on 30 Oct in India (UTC+5:30).
  const lateEvening = new Date("2026-10-29T20:00:00Z");

  it("rolls the calendar date forward in Asia/Kolkata", () => {
    expect(businessDate(lateEvening, "Asia/Kolkata")).toBe("2026-10-30");
    expect(businessTime(lateEvening, "Asia/Kolkata")).toBe("01:30:00");
  });

  it("keeps the UTC date in UTC", () => {
    expect(businessDate(lateEvening, "UTC")).toBe("2026-10-29");
    expect(businessTime(lateEvening, "UTC")).toBe("20:00:00");
  });

  it("uses 00 (not 24) at midnight", () => {
    expect(businessTime(new Date("2026-10-29T18:30:00Z"), "Asia/Kolkata")).toBe("00:00:00");
  });

  it("builds a file timestamp", () => {
    expect(fileTimestamp(lateEvening, "Asia/Kolkata")).toBe("20261030-0130");
  });
});

describe("database date and time conversion", () => {
  it("stores a DATE as UTC midnight and reads it back unchanged", () => {
    const d = toDbDate("2026-10-29");
    expect(d.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(fromDbDate(d)).toBe("2026-10-29");
  });

  it("rejects an invalid date", () => {
    expect(() => toDbDate("2026-02-30")).toThrow(RangeError);
  });

  it("stores TIME on 1970-01-01 and reads only the time part", () => {
    const t = toDbTime("13:42:05");
    expect(t.toISOString()).toBe("1970-01-01T13:42:05.000Z");
    expect(fromDbTime(t)).toBe("13:42:05");
  });

  it.each(["24:00:00", "12:60:00", "12:00:60", "1:00:00", "noon"])("rejects time %s", (v) => {
    expect(() => toDbTime(v)).toThrow(RangeError);
  });
});

describe("isValidTimeZone", () => {
  it("knows real zones and rejects unknown ones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
