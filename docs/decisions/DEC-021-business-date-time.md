# DEC-021: Indent date and time are server-assigned in the company timezone

- **Status:** Accepted (rule); Provisional (`APP_TIMEZONE = Asia/Kolkata`, company to confirm)
- **Date:** 2026-10-29
- **Decided by:** user (timezone), team (rule)
- **SRS refs:** 7.1, FR-03, 11.2
- **Data model refs:** D-03, D-04
- **Review refs:** section 4 (header time row)
- **Work items:** WI-02, WI-04, WI-08

## Context

FR-03 lists Date and Time as indent fields entered by the user. The MVP takes both from the browser clock, which can be wrong or manipulated, and which differs across timezones.

## Decision

1. `indent_date` and `indent_time` are set by the **server** at creation, from "now" in `APP_TIMEZONE` (config, default `Asia/Kolkata`, **PROVISIONAL**). The Create form shows them read-only. They are immutable afterwards (BR-06).
2. All instants (`created_at`, `submitted_at`, `stock_checked_at`, ...) are UTC (D-03).
3. `DATE` values are built as UTC midnight of the local calendar date (`new Date("YYYY-MM-DD")`), never from a local `Date`, to avoid off-by-one days (D-04). `TIME` values are formatted from the time part only.
4. Date filters and the "Required Date >= indent date" rule compare calendar dates only.
5. Set the DB server and Node process to UTC (D-03). `TZ=UTC` in the runtime env.
6. A single module `lib/shared/datetime.ts` is the only place that converts between timezones.

## Consequences

Recorded in [`srs-errata.md`](../srs/srs-errata.md) (E-03): FR-03 says users enter Date/Time; the server assigns them instead.

## Revisit if

The company wants users to back-date indents or confirms another timezone.
