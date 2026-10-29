// The only place that converts between time zones (DEC-021, D-03, D-04).
//
// - Instants are UTC.
// - Business date/time (indent_date, indent_time) are wall-clock values in
//   APP_TIMEZONE, stored in DATE / TIME(0) columns.
// - DATE values are built as UTC midnight of the calendar date, never from a
//   local Date, so a day can't be lost to the server's timezone.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2}):(\d{2})$/;

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export function isValidCalendarDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function partsInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Calendar date "now" in the given time zone, as YYYY-MM-DD. */
export function businessDate(now: Date, timeZone: string): string {
  const p = partsInZone(now, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Wall-clock time "now" in the given time zone, as HH:mm:ss. */
export function businessTime(now: Date, timeZone: string): string {
  const p = partsInZone(now, timeZone);
  return `${p.hour}:${p.minute}:${p.second}`;
}

/** Compact stamp for file names, e.g. 20261029-1342 (DEC-018). */
export function fileTimestamp(now: Date, timeZone: string): string {
  const p = partsInZone(now, timeZone);
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

/** "YYYY-MM-DD" -> Date at UTC midnight, for @db.Date columns. */
export function toDbDate(value: string): Date {
  if (!isValidCalendarDate(value)) throw new RangeError(`Invalid calendar date: ${value}`);
  return new Date(`${value}T00:00:00.000Z`);
}

/** @db.Date value -> "YYYY-MM-DD". */
export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** "HH:mm:ss" -> Date on 1970-01-01 (UTC), for @db.Time columns. */
export function toDbTime(value: string): Date {
  const m = TIME_RE.exec(value);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3]) > 59) {
    throw new RangeError(`Invalid time: ${value}`);
  }
  return new Date(`1970-01-01T${value}.000Z`);
}

/** @db.Time value (Date on 1970-01-01) -> "HH:mm:ss"; only the time part is used. */
export function fromDbTime(value: Date): string {
  return value.toISOString().slice(11, 19);
}

/** True if the IANA time zone name is known to this runtime. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}
