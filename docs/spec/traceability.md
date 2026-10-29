# Traceability: SRS requirement -> decision -> spec -> work item -> test

Every requirement id in the SRS appears here. When a work item is completed, tick its status in [roadmap.md](../plan/roadmap.md) and make sure the Test column names a real test. Test kinds: **U** unit, **I** integration (MySQL test DB), **E** end-to-end (Playwright).

## Functional requirements

| ID | Requirement | Decision | Spec | WI | Test |
|---|---|---|---|---|---|
| FR-01 | Create indent (authorized) | DEC-003, DEC-004 | permissions, api | WI-03, WI-04 | I create allowed/forbidden per role; E create |
| FR-02 | Unique read-only indent number | DEC-010 | domain-rules, api | WI-04 | I parallel creates -> distinct, gap-free; U formatter |
| FR-03 | Header fields | DEC-003, DEC-021, DEC-022 | validation, ui | WI-04, WI-08 | I server sets date/time/created by; U datetime |
| FR-04 | Add Item | DEC-025, DEC-009 | ui, api | WI-08 | E add item |
| FR-05 | Multiple items | DEC-025 | api | WI-04 | I create with 3 lines |
| FR-06 | Auto item code | DEC-010, DEC-025 | domain-rules | WI-04 | I new item gets code in tx; rollback leaves none |
| FR-07 | Current stock by item code | DEC-013 | api | WI-04, WI-09 | I stock lookup; "Not available" case |
| FR-08 | Prevent empty indent | DEC-008, DEC-012 | domain-rules, validation | WI-05 | U/I empty create, delete last line |
| FR-09 | Save as Draft | DEC-005, DEC-006 | api | WI-05 | I status DRAFT + history |
| FR-10 | Separate Submit | DEC-005, DEC-006 | domain-rules | WI-05 | I submit transitions; client cannot send status |
| FR-11 | View indents | DEC-017 | api, ui | WI-07 | E list |
| FR-12 | Search by number | DEC-011 | api, validation | WI-04, WI-07 | I exact first, partial, escaping |
| FR-13 | Filters, combinable | DEC-022 | api, ui | WI-04, WI-07 | I filter combinations incl. dept header OR line |
| FR-14 | Select an indent, see details | DEC-017 | ui | WI-07 | E open detail |
| FR-15 | 10 per page | DEC-017 | api, ui | WI-04, WI-07 | I page size 10, totals |
| FR-16 | Edit permitted info | DEC-007, DEC-016 | domain-rules | WI-05 | I editable fields; non-editable rejected |
| FR-17 | Delete item | DEC-008 | domain-rules | WI-05 | I Draft only; last line blocked |
| FR-18 | Delete indent | DEC-008 | domain-rules | WI-05 | I soft delete hides everywhere |
| FR-19 | Excel export (one/many/all) | DEC-018 | export-print | WI-10 | I rows; E download |
| FR-20 | Print whole page | DEC-026 | export-print | WI-11 | E print stylesheet check |
| FR-21 | Confirmations | DEC-019 | ui | WI-08 | E each dialog appears |
| FR-22 | Error dialogs, no raw errors | DEC-015 | api, ui | WI-02, WI-06, WI-08 | U envelope mapping; I no leakage; E dialogs |

## Non-functional requirements

| ID | Requirement | Decision | Spec | WI | Test |
|---|---|---|---|---|---|
| NFR-01 | Desktop first | DEC-019 | ui | WI-08 | E 1280px layout |
| NFR-02 | Responsive | DEC-019 | ui | WI-08 | E narrow viewport, no page overflow |
| NFR-03 | Accessibility | DEC-020 | ui | WI-07, WI-08 | E axe + keyboard pass |
| NFR-04 | SSR with Next.js | DEC-017 | ui | WI-07 | E first HTML contains data |
| NFR-05 | Clear error popups | DEC-015 | ui | WI-08 | E |
| NFR-06 | Confirmation of important actions | DEC-019 | ui | WI-08 | E |
| NFR-07 | Reusable components | DEC-019 | ui | WI-08 | review |
| NFR-08 | Swap DB/ERP without rewrite | DEC-002 | architecture/overview | WI-04 | review (no Prisma imports outside repositories) |
| NFR-09 | Authorization | DEC-003, DEC-004 | permissions | WI-03, WI-06 | U matrix table; I every route 401/403 |
| NFR-10 | Data integrity | DEC-002, DEC-014, DEC-016 | validation, domain-rules | WI-04 | I FK/active-master checks |

## Business rules

| ID | Rule | Decision | Spec | WI | Test |
|---|---|---|---|---|---|
| BR-01 | No save without items | DEC-008 | domain-rules | WI-05 | U/I |
| BR-02 | Indent number generated, unique, read-only | DEC-010 | domain-rules | WI-04 | I |
| BR-03 | Item code generated | DEC-025 | domain-rules | WI-04 | I |
| BR-04 | Creating does not reduce stock | DEC-013 | domain-rules | WI-04 | I stock unchanged after create |
| BR-05 | Save = Draft; Submit separate | DEC-005, DEC-006 | domain-rules | WI-05 | I |
| BR-06 | Header immutable | DEC-007 | domain-rules | WI-05 | U strict schema; I |
| BR-07 | Confirmations | DEC-019 | ui | WI-08 | E |
| BR-08 | Authorization | DEC-004 | permissions | WI-03 | U/I |
| BR-09 | Duplicate items (TBD) | DEC-009 | domain-rules | WI-05 | I |
| BR-10 | Remove before save (TBD) | DEC-012 | ui | WI-08 | E |
| BR-11 | Editable item fields (TBD) | DEC-007 | domain-rules | WI-05 | I |
| BR-12 | Editable after submit (TBD) | DEC-007 | domain-rules | WI-05 | I |
| BR-13 | Search behaviour (TBD) | DEC-011 | api | WI-04 | I |
| BR-14 | Stock warning (TBD) | DEC-013 | ui | WI-09 | E |

## Use cases

| ID | Use case | Decision | Spec | WI | Test |
|---|---|---|---|---|---|
| UC-01 | Create Indent | DEC-010, DEC-021 | ui, api | WI-04, WI-08 | E (note E-01 in errata) |
| UC-02 | Add Item | DEC-025, DEC-009 | ui | WI-08 | E |
| UC-03 | Save Draft | DEC-005, DEC-013 | ui, api | WI-05, WI-09 | E |
| UC-04 | Submit Indent | DEC-005, DEC-006 | domain-rules | WI-05 | E (note E-06 in errata) |
| UC-05 | View / Select Indent | DEC-017 | ui | WI-07 | E |
| UC-06 | Search / Filter | DEC-011 | api, ui | WI-07 | E empty state |
| UC-07 | Export to Excel | DEC-018 | export-print | WI-10 | E |
| UC-08 | Print Indent | DEC-026 | export-print | WI-11 | E |

## Other SRS sections

| SRS | Topic | Decision | WI |
|---|---|---|---|
| 4.3, 9.5 | Stock behaviour (no reduction) | DEC-013 | WI-04 |
| 7.9, 18.4 | Status model | DEC-005 | WI-05 |
| 9.4, 9.6 | Stock refresh and warning | DEC-013 | WI-09 |
| 10.1 | Summary rows + expandable items | DEC-019 | WI-07, WI-08 |
| 11.2 | Export content | DEC-018 | WI-10 |
| 12.1 | Validation | DEC-014 | WI-02, WI-06 |
| 12.3 | Error situations | DEC-015 | WI-06, WI-08 |
| 15, 25 | Data requirements; ERP-ready layers | DEC-002 | WI-04 |
