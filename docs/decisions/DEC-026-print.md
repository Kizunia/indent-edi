# DEC-026: Print the whole page with a print header block

- **Status:** Accepted (template Provisional: SRS 11.3 company format TBD)
- **Date:** 2026-10-29
- **Decided by:** team default
- **SRS refs:** 11.3, FR-20, UC-08
- **Review refs:** feature 18
- **Work items:** WI-11

## Decision

1. Print is the browser print of the indent detail page (`window.print()` from a Print button; requires `indent.print`). It prints the complete visible indent and all lines (SRS 11.3).
2. A print stylesheet hides navigation, buttons, filters and dialogs, uses black on white, and shows the header block on every printout: system name, Indent Number, status, indent date/time, and "Printed on" (date/time in `APP_TIMEZONE`) and the printing user's name.
3. The item table repeats its header row on each page and avoids splitting a row across pages (`break-inside: avoid`).
4. The list page is not printed as a unit; only the detail page is (UC-08 precondition).
5. If the company provides a template, it replaces the header block and layout; the data shown stays the same.
