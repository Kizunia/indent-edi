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
