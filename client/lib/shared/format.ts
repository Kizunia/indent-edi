import { businessDate, businessTime } from "./datetime";

// Number and code formatting (DEC-010). Prefix and padding are PROVISIONAL
// configuration (SRS 7.2 / 8.4 formats are TBD).

/** Formats a sequence value, e.g. formatNumber("IND-", 6, 124) -> "IND-000124". */
export function formatSequenceNumber(prefix: string, pad: number, value: number): string {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`Invalid sequence value: ${value}`);
  return `${prefix}${String(value).padStart(pad, "0")}`;
}

/** DECIMAL(18,4) quantity written as text: up to 14 integer digits, up to 4 decimals. */
export const QUANTITY_PATTERN = /^\d{1,14}(\.\d{1,4})?$/;

/** True when the text is a valid quantity and greater than zero. */
export function isPositiveQuantity(value: string): boolean {
  return QUANTITY_PATTERN.test(value) && /[1-9]/.test(value);
}

// ---- Display helpers (shared by server and client components) ----

export const NOT_AVAILABLE = "Not available";

/** "12.5000" -> "12.5", "3.0000" -> "3". null (no stock row) -> "Not available", never 0 (DEC-013). */
export function displayQuantity(value: string | null | undefined): string {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** "14:05:09" -> "14:05". */
export function displayTime(value: string): string {
  return value.slice(0, 5);
}

/** ISO instant -> "2026-11-19 14:05" in the company time zone (deterministic on server and client). */
export function displayInstant(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${businessDate(d, timeZone)} ${businessTime(d, timeZone).slice(0, 5)}`;
}
