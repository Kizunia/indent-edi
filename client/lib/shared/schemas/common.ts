import { z } from "zod";
import { isValidCalendarDate } from "../datetime";
import { isPositiveQuantity } from "../format";

// Shared building blocks for the request schemas (DEC-014, docs/spec/validation.md).
// No business limits are invented (SRS 12.1): the only bounds here are the
// database column sizes.

/**
 * TEXT columns hold 65 535 bytes; utf8mb4 characters take up to 4 bytes, so
 * 16 383 characters always fit. This is a column-safety bound, not a business rule.
 */
export const TEXT_MAX = 16_383;

// Control characters other than tab, line feed and carriage return.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function clean(value: string): string {
  return value.replace(CONTROL_CHARS, "").trim();
}

/** Required text: trimmed, non-empty, at most `max` characters. */
export function requiredText(label: string, max: number) {
  return z
    .string({ error: `${label} is required.` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .max(max, `${label} must be at most ${max} characters.`)
    );
}

/** Optional text: trimmed; empty or whitespace-only becomes undefined. */
export function optionalText(label: string, max: number) {
  return z
    .string({ error: `${label} must be text.` })
    .transform(clean)
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`))
    .transform((v) => (v === "" ? undefined : v))
    .optional();
}

/** Text that may be cleared: trimmed, empty string allowed (used by edits). */
export function editableText(label: string, max: number) {
  return z
    .string({ error: `${label} must be text.` })
    .transform(clean)
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`));
}

/** Positive integer id of a master or item row. */
export const id = (label: string) =>
  z
    .number({ error: `${label} is required.` })
    .int(`${label} is not valid.`)
    .positive(`${label} is not valid.`);

/** Indent version used for optimistic locking (DEC-016). */
export const version = z
  .number({ error: "Version is required." })
  .int("Version is not valid.")
  .min(1, "Version is not valid.");

/** Real calendar date as YYYY-MM-DD. */
export const isoDate = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .refine(isValidCalendarDate, `Enter a valid ${label.toLowerCase()}.`);

/** Required quantity: decimal text, up to 4 decimals, greater than zero (D-06, D-07). */
export const quantity = z
  .string({ error: "Required quantity is required." })
  .refine(isPositiveQuantity, "Enter a quantity greater than 0 (up to 4 decimal places).");

/** Query-string helper: empty string means "not provided". */
export const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
