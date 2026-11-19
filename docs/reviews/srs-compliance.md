# SRS compliance review

Date: 2026-11-19. Branch: `integration/complete`. The SRS ([SRS-v1.0.md](../srs/SRS-v1.0.md)) is the source of truth; this page compares the built system with it, requirement by requirement. It supersedes nothing: deliberate differences stay in [srs-errata.md](../srs/srs-errata.md), and the earlier [app-vs-srs-review.md](app-vs-srs-review.md) is a frozen snapshot of the first prototype.

**How it was checked.** An independent read-only audit of the code against SRS sections 5, 7 to 13, 16 and 19, then fixes, then tests: 289 unit tests, 35 integration tests on MySQL, and a scripted headless-Chrome run of the real app (12 interactive checks plus an add-item run, no console errors). Not covered: Playwright suites (deferred), a screen reader, real printing, and phone-width layout.

**Status key.** **Met**: behaves as the SRS says. **Errata**: met in a documented, deliberate way. **Fixed**: was a gap, corrected in this change. **TBD**: the SRS leaves it open, so a provisional default is used (see [open-questions.md](../open-questions.md)). **Open**: a known remaining difference.

## 1. Functional requirements (section 5)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-01 | Authorized users create an indent | Met | `createIndent` authorizes `indent.create`; roles without it have no "New Indent" entry |
| FR-02 | Unique, read-only, generated Indent Number | Met / Errata E-01 | `nextIndentNumber` (single counter, `IND-000001`); expected number previewed on the form |
| FR-03 | Enter Type, Date, Time, Department, Created By, Remark | Errata E-03 | Type, Department, Remark are inputs; Date, Time and Created By are shown read-only and set by the server (user confirmed this on 2026-11-19) |
| FR-04 | Add Item to the current indent | Met / Fixed | Add Item with Item Name and Item Code inputs ([DEC-027](../decisions/DEC-027-item-entry-name-and-code.md)); Specification and Drawing Number now shown |
| FR-05 | Multiple items per indent | Met | Current Item List; integration tests with 1 to 3 lines |
| FR-06 | Generated Item Code | Met | `nextItemCode` inside the save transaction; the code input is read-only for a new item |
| FR-07 | Current Stock by Item Code | Met / Errata E-07 | `/api/stock`, "Not available" never 0; refreshed on focus and before Add (9.4) |
| FR-08 | No save without an item | Met | Save buttons disabled, `INDENT_EMPTY` on the server, tested |
| FR-09 | Save Draft | Met | `createIndent` always creates DRAFT |
| FR-10 | Separate Submit | Met / Errata E-06 | `POST /submit`; Save & Submit runs both steps in one transaction |
| FR-11 | View indents and details | Met | list and detail pages |
| FR-12 | Search by Indent Number | Met / TBD | partial, case-insensitive, exact match first (BR-13 is TBD) |
| FR-13 | Filters: Type, Department, Date, Date Range, Created By, Status | Fixed / Errata E-14 | separate **Date** filter added next to the range; all combine |
| FR-14 | Select an indent, see details and items | Met | indent number link; expandable item grid |
| FR-15 | 10 per page, Prev/Next/page numbers | Met | `PAGE_SIZE = 10`, `Pagination` |
| FR-16 | Edit permitted information | Met / TBD | Remark and line fields on a Draft (DEC-007, SRS 7.10 and 8.10 are TBD) |
| FR-17 | Delete an item when permitted | Met | Draft only, never the last line |
| FR-18 | Delete an indent when permitted | Met | Draft only, soft delete |
| FR-19 | Export one, many or all | Met | selected rows or all matching the filters; 20 columns |
| FR-20 | Print the whole page | Met / Fixed | print header block; landscape page; edit controls hidden when printing |
| FR-21 | Confirm Delete, Save, Update, Submit | Met | dialog wording matches 12.2 |
| FR-22 | Errors as popup/dialog, no raw errors | Met / Fixed / Errata E-13 | form and action errors in the dialog; invalid input and stock failure now also open it |

## 2. Business rules (section 19)

| ID | Rule | Status | Evidence |
|---|---|---|---|
| BR-01 | At least one item | Met | UI, API and database transaction |
| BR-02 | Indent Number generated, unique, read-only | Met | unique key plus counter, no number in any request |
| BR-03 | Item Code generated, never typed | Met | read-only code for new items; an unknown typed code is rejected |
| BR-04 | Creating an indent never reduces stock | Met | services never write stock; tested |
| BR-05 | Save = Draft, Submit separate | Met | tested |
| BR-06 | Indent-level attributes immutable | Met / Errata E-02 | strict schemas reject other fields; only Remark editable on a Draft |
| BR-07 | Confirm Delete, Save, Update, Submit | Met | dialogs |
| BR-08 | Actions restricted by authorization | Met / TBD | permission matrix is provisional (SRS 6.1 is TBD) |
| BR-09 | Duplicate items | TBD | blocked by default, config flag `ALLOW_DUPLICATE_ITEMS` |
| BR-10 | Remove an item before saving | TBD | allowed |
| BR-11 | Editable item fields | TBD | Department, Purpose, Quantity, Date, Unit on a Draft |
| BR-12 | Editable after submission | TBD | nothing |
| BR-13 | Search behaviour | TBD | exact first, then partial |
| BR-14 | Stock-change warning | TBD | shown, never blocks (SRS says it may not be required; remove the notice only if the company says so) |

## 3. Item and list field lists

| SRS list | Required fields | Status |
|---|---|---|
| 8.2 item fields (entry form) | Item Name, Item Code, Specification, Drawing Number, Department, Purpose, Current Stock, Required Quantity, Required Date, Unit | **Fixed**: all ten visible in the entry form; Specification and Drawing Number were missing for existing items |
| 8.2 / 10.1 item fields (Current Item List, detail table) | same ten | **Fixed**: the Current Item List lacked Specification and Drawing No.; the detail table already had all |
| 11.2 Excel, indent information | Number, Type, Date, Time, Department, Created By, Remark, Status | Met |
| 11.2 Excel, item information | the ten item fields | Met (plus Line No. and Stock Checked At) |
| 7.1 indent fields | Number, Type, Date, Time, Remark, Created By, Department, items | Met |

## 4. Validation (12.1) and error situations (12.3)

| SRS | Status | Note |
|---|---|---|
| Required indent information | Met | client and server |
| At least one item | Met | |
| Valid item information / valid Item Code | Fixed | "Select an item." / "Enter a valid Item Code." |
| Valid quantities | Met | greater than 0, up to 4 decimals (column size, not a business limit) |
| Valid dates | Met / Errata E-12 | real calendar date and not before the indent date (user chose to keep this) |
| Valid Department, Indent Type | Met | checked against active masters on the server |
| Saving without an item; invalid input | Fixed | dialog plus inline |
| Database failure | Met / Errata E-13 | generic message with a reference number |
| Stock retrieval failure | Fixed | dialog; value stays "Not available" |
| Unauthorized operation, invalid indent | Met / Errata E-13 | dialog for actions, standard pages for page loads |
| Failed export, update, deletion | Met | dialog |

## 5. Other sections

| Requirement | Status | Note |
|---|---|---|
| 9.3 retrieve stock when an item is selected | Met | name or code selection |
| 9.4 stock should not rely on an old value | Fixed | refreshed on focus and just before Add; re-checked at Save/Submit; the SRS leaves the mechanism TBD |
| 9.5 stock unchanged by an indent | Met | |
| 10.1 list is an indent summary with an item grid | Met / Errata E-08 | |
| 10.4 selecting an indent shows details, items and permitted actions | Met | |
| NFR-01 desktop first | Met | |
| NFR-02 responsive | Met in CSS, not verified at phone width | tables scroll, grids stack below `md` |
| NFR-03 accessible | Partly verified | labels, roles, focus handling, skip link; no automated axe run (deferred) and no screen reader test; standard is TBD |
| NFR-04 server-side rendering | Met | list, new and detail pages are Server Components |
| NFR-05, NFR-06 dialogs and confirmation | Met | |
| NFR-07 reusable components | Met | `components/ui`, `components/indents` |
| NFR-08 swappable database/ERP | Met | `lib/services`, `StockProvider` |
| NFR-09 authorization | Met | every handler and page; authentication itself is external |
| NFR-10 data integrity | Met | foreign keys, CHECKs, transactions |
| UC-01 to UC-08 | Met | main flows exercised through the services and, for create/add/list, in a browser run |

## 6. Remaining differences and limits

- **Phone-width layout**, real printing and screen-reader use were not tested.
- **TBD items** (SRS section 24) keep their provisional defaults until the company answers.
- **Playwright and axe** suites are deferred, so none of the above is protected by an automated browser test yet. The headless-Chrome script used for this review lived outside the repository.
- **Dev tools in the UI:** the "Signed in as (dev)" switcher and the expected-number preview are not in the SRS; the first is hidden outside development, the second is errata E-01.
- **Stock-change notice** (BR-14) is not required by the SRS while it is TBD; it can be removed without other changes.
