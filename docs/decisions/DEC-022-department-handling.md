# DEC-022: Department on header and on lines

- **Status:** Provisional (SRS 7.4, 8.2: where Department lives and whether it is mandatory is TBD)
- **Date:** 2026-10-29
- **Decided by:** team (adopts D-16, D-26)
- **SRS refs:** 7.1, 7.4, 8.2, FR-03, FR-13, 15.1, 15.2
- **Data model refs:** D-16, D-26
- **Work items:** WI-04, WI-07, WI-08

## Decision

1. The header department (nullable in the DB) is **required by the app form** for now, because the MVP and SRS FR-03 treat it as a header field. The line department (`NOT NULL`) defaults to the header's department and may be changed per line.
2. The Department filter (FR-13) matches the header department **or** any line department (D-16).
3. Dept Head scope (DEC-004) uses the same rule.
4. Departments come from `department_master`, only active ones are offered for new entries, and inactive ones still display on old indents (D-10).
5. `purpose` and `department` are line attributes, not item-master attributes (D-26).

## Revisit if

The company confirms header-only or line-only department (D-16 lists the migration needed for "mandatory").
