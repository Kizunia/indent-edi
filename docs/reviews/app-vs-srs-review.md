# Indent App (client/) vs SRS v1.0: Feature and Optimization Review

> **Frozen snapshot (2026-10-29).** This is the starting point and is not updated. Resolution of each issue is tracked in [`../plan/roadmap.md`](../plan/roadmap.md) (see "Coverage of the review"). Decisions taken in response are in [`../decisions/`](../decisions/README.md).

Review only. No code was changed. The database layer is excluded (the app currently uses JSON files in `client/data/` through `lib/store.ts`, and a parallel thread is designing the MySQL + Prisma model). Where the app will have to change for that model, it is flagged as **[DB-impact]**.

Scope reviewed: Next.js 16 app in `client/` (6 API routes, 3 pages, 6 components, `lib/store.ts`, `lib/types.ts`), about 2,000 lines.

## 1. Verdict

The MVP covers most of the functional requirements (create, draft, submit, list, filter, paginate, edit, delete, export, print) and the UI flow matches the SRS well. It is demo-grade in four areas that matter before real use:

1. **No authentication or authorization** at all (NFR-09, FR-01, Permission Matrix).
2. **Server-side rendering is not used** (NFR-04). Every page is `"use client"` and fetches after load.
3. **Server-side validation and state rules are thin.** The server trusts the client for status, stock, item data and Created By, and does not enforce the Draft-only edit/delete rules the UI shows.
4. **The store is not concurrency-safe or scalable.** Every request reads and rewrites whole JSON files, and generated numbers can collide.

## 2. Requirement-by-requirement status

Legend: Done = implemented as the SRS says. Partial = works but with a gap. Missing = not implemented. N/A = TBD in the SRS.

| SRS | Requirement | Status | Evidence and notes |
|---|---|---|---|
| FR-01 | Create indent (authorized users) | Partial | `app/indents/new/page.tsx` works; no authorization check anywhere |
| FR-02 | Auto, unique, read-only Indent Number | Partial | Generated server-side (`generateIndentNumber`, `IND-YYYYMMDD-####`); read-only in UI. Counts today's rows, so a delete then create can reuse a number, and concurrent requests can collide. UC-01 expects the number to be shown before save; the UI shows "Generated automatically on save". **[DB-impact]** |
| FR-03 | Header fields: Type, Date, Time, Department, Created By, Remark | Done | All present. Created By is a free-text box, not the authenticated user (SRS 1.4 says it is the authenticated user). Time is taken from the browser clock. |
| FR-04 / UC-02 | Add Item to current indent | Done | `ItemEntryForm` with item search, "new item" path, and validation |
| FR-05 | Multiple items per indent | Done | |
| FR-06 / BR-03 | Auto-generated Item Code | Partial | `ITM-#####` from `items.length + 1`. Collides after any item deletion or concurrent create. **[DB-impact]**: use a DB sequence/generated code |
| FR-07 | Current Stock from stock table by Item Code | Partial | `/api/stock/[itemCode]` reads `stock.json`. Works. Unknown code silently returns 0 instead of an error. **[DB-impact]**: becomes a join/lookup on the new stock table |
| 9.4 | Refresh stock while creating | Partial | Fetched when an item is selected only. Never re-fetched before Save/Submit, and the stored value is a snapshot (`currentStockAtEntry`) |
| 9.6 | Stock-outdated warning | Missing | TBD in SRS (not confirmed as a requirement). Easy to add once stock has `updatedAt` |
| FR-08 / BR-01 | No save without items | Done | Enforced in UI, route, and `createIndent`; last-item delete also blocked |
| FR-09 | Save as Draft | Done | Sends `status: "Draft"` |
| FR-10 / BR-05 | Separate Submit action | Partial | Create-time "Save & Submit" and detail-page "Submit" both exist. But the server accepts any `status` string from the client and any transition (`updateIndent` sets status unvalidated) |
| FR-11 / FR-14 / 10.4 | View indents, select and see details + items | Done | List page and `[id]` detail page |
| FR-12 | Search by indent number | Done | Case-insensitive contains match (behaviour TBD in SRS) |
| FR-13 | Filters: Type, Dept, Date, Range, Created By, Status (combinable) | Mostly done | All present and combinable. "Date" and "Date Range" are one from/to pair (acceptable). Department filter only matches the header department; fine once header dept is the source |
| FR-15 / 10.5 | 10 per page, Prev/Next, page numbers | Done | `Pagination.tsx` has a sliding page window |
| FR-16 / 7.7 | Edit permitted fields; header immutable | Partial | Header immutability is only in the UI: `PUT` accepts only remark/status/items, which is fine, but remark is editable via API even though the UI never edits it. Item edit is Draft only (placeholder for TBD 7.10/8.10) |
| FR-17 / 8.11 | Delete item (permission + status) | Partial | UI limits to Draft with more than 1 item. Server `deleteIndentItem` checks only the item count, **not status**, so a submitted indent's item can be deleted by calling the API |
| FR-18 / 7.8 | Delete indent (permission) | Partial | UI shows Delete only for Draft on the detail page, but the **list page shows Delete for every row regardless of status**, and the server has no status or permission check |
| FR-19 / 11.1-11.2 | Export one / many / all with full content | Done | `POST /api/indents/export`; columns match 11.2. Gaps: "selected" only covers the current page's checkboxes (selection survives paging but "select all" only selects the page), file name is always `indents-export.xlsx` for list exports |
| FR-20 / 11.3 | Print the whole page | Done | `window.print()` plus `@media print` hiding controls |
| FR-21 / NFR-06 / 12.2 | Confirm on Delete, Save, Update, Submit | Mostly done | Save, Submit, edit-save, delete indent, delete item all use `ConfirmDialog`. **Delete from the list page has a confirm (`deleteTarget`)**, good. Export has none (not required) |
| FR-22 / NFR-05 / 12.3 | Errors in popup/dialog, no raw technical errors | Partial | Errors are shown in inline red callouts, not popups. API routes return `err.message` straight to the client (`catch (err: any)`), which can leak internals once the DB is real. List-page `confirmDelete` and detail `performSubmit` ignore failures (no error shown) |
| 12.1 | Validate fields, quantities, dates, item code, dept, type | Partial | UI validates required fields and qty > 0. The server checks only presence of 4 header fields; it does **not** validate that Department/Indent Type exist in the masters, that item code exists, quantity is numeric/positive, dates are valid, or that Required Date is not before the indent date. `time` and `remark` are unchecked |
| 6 / NFR-09 / BR | Authorization, roles, permission matrix | Missing | No auth context, no role checks. SRS says roles are TBD and auth is external, so the right step is a pluggable `getCurrentUser()` plus a permission guard, not a full implementation |
| NFR-01 | Desktop first | Done | Fixed-width desktop grids |
| NFR-02 | Responsive | Partial | Grids are hard-coded 3 to 5 columns with inline styles and only one `@media print` rule. There are no responsive breakpoints. Tables are not scrollable on narrow screens |
| NFR-03 | Accessibility | Partial | Labels exist on fields but are not bound with `htmlFor`/`id`. Clickable table cells use `onClick` on `<td>` (not keyboard reachable). No dialog roles, focus trap, or Esc handling in `ConfirmDialog` |
| NFR-04 | SSR with Next.js | Missing | All three pages are client components that fetch in `useEffect`. Initial paint is an empty "Loading..." |
| NFR-07 | Reusable components | Partial | Good set of shared components, but the filter bar, field grids and `Field` are inline, and the item type (`AddedItem`) is duplicated in three places |
| NFR-08 | Swap DB/ERP without rewrite | Partial | `lib/store.ts` is a decent seam, but it is a single module of sync file functions; callers use sync semantics. Moving to Prisma means making it async. **[DB-impact]** |
| NFR-10 | Data integrity | Partial | No referential checks in the store (department/type/item stored as plain names, not ids) |
| 8.6 / 8.8 / 8.10 / 7.9 / 7.10 | TBD items | N/A | Handled with clearly commented placeholders (duplicates allowed, pre-save remove allowed, Draft-only editing, 6 placeholder statuses). Good practice |

## 3. What is not optimized (issues found)

### High priority
1. **Whole-file reads on every call** (`lib/store.ts`). `getAllIndents()` does `readFileSync` and `JSON.parse` of the full file for each request; `getItems()` and `getCurrentStock()` do the same. Each `createItem` reads and rewrites two files. Fine for the demo, but cost grows with data and writes can interleave.
2. **Race conditions and lost updates.** Read-modify-write on `indents.json`/`items.json`/`stock.json` with no locking; two simultaneous saves lose one. Indent and item numbers are derived from counts, so they can duplicate. (Goes away with the DB if numbers come from a sequence and writes are transactional.)
3. **The server does not own the business rules.** Status is client-supplied on create and update, with no allowed-transition check (Draft to Submitted only), no "must be Draft to edit/delete" check, and no payload schema validation. The UI hides buttons but the API is open.
4. **Export builds everything in memory and uses `pageSize: 100000` through `queryIndents`**. It also holds the whole result as one JSON array before writing the sheet.
5. **No auth/permission layer.** Created By is typed by the user, so the audit trail is unreliable.

### Medium priority
6. **List filtering is done on the full dataset in memory**, then sliced. `queryIndents` loads everything, filters, sorts, then paginates. It also ships each indent's full `items` array to the list page just to show an item count.
7. **`window.location.href = ...` on every cell** of a list row forces a full page reload instead of client navigation (`<Link>`/`router.push`), and repeats the handler 7 times per row.
8. **Each keystroke on filters re-fetches** (200 ms debounce, but no request cancellation), so slow responses can arrive out of order and overwrite newer results. Same in the item search.
9. **Stock handling in `handleAddItem`**: for a newly created item the stock is forced to `0`, and the displayed value is not revalidated at add/save time.
10. **Item search** reads the whole items file and filters with `includes` over names and codes with no ranking; returns max 20 with no indication there are more.
11. **Unhandled failures**: several `fetch` calls (`/api/meta`, `/api/stock`, delete, submit) have no `.catch` or `res.ok` handling, so the user sees nothing on failure (FR-22).
12. **`xlsx@0.18.5` (SheetJS from npm) has known security advisories** (prototype pollution, ReDoS). Consider `exceljs`, or SheetJS from its own CDN build.

### Low priority
13. Heavy inline styling instead of Tailwind classes or CSS modules, even though Tailwind 4 is installed; hard to make responsive.
14. `err: any` casts and shared types missing between API and UI (API bodies are untyped).
15. Comments cite SRS section numbers (e.g. "§25", "§39") that do not match the current SRS numbering, which will confuse reviewers.
16. No tests and no CI; `package.json` has only `dev/build/start/lint`.
17. `uuid` package is used only for ids; `crypto.randomUUID()` removes a dependency (moot once DB ids are used).

## 4. Where the app code must change for the new MySQL + Prisma model

| Proposed schema change | App changes needed |
|---|---|
| Draft/Submit status (+ submitted_at/by) | Replace the string union in `types.ts` with a status master/lookup (values come from the approval team, so avoid a hard enum). Add a `submit` endpoint (`POST /api/indents/[id]/submit`) that does the Draft-to-Submitted transition server-side and stamps submitted time/user; stop accepting `status` on create/update. The status filter options must be loaded from the master, not the hard-coded `STATUS_OPTIONS` array in `indents/page.tsx` |
| Header time + department | Already in the `Indent` type and forms. Make time server-assigned (`createdAt`) rather than browser-supplied, and make list/export read the header department, not item departments. Decide whether item-level department stays (SRS 8.2 lists it for items too) |
| Stock table | `getCurrentStock` becomes an async Prisma lookup; return 404/explicit error for unknown code. Add `updatedAt` to the response to power the stale-stock warning (9.4/9.6). Re-read stock at Save/Submit time, store the snapshot, and compare |
| Generated item codes | Remove the `items.length + 1` code generation. Use a DB sequence/auto-increment or a counter row inside a transaction, and create the Item and its zero-stock row in one transaction |
| Indent number reservation | Generate in a transaction at insert (or from a sequence). If the UI must show the number before save (UC-01), add a reserve-number endpoint |
| Relations by id | The app stores department/type/item names as strings. Switch to ids (`departmentId`, `indentTypeId`, `itemId`) in `types.ts`, API bodies and filters; display names come from joins |
| Async persistence | Every function in `lib/store.ts` becomes `async` and API routes `await` them. Keep `store.ts` as the repository seam (NFR-08), and move the JSON reads out of it |
| Pagination | `queryIndents` becomes `skip/take` plus a count query with filters in `where`. List should return a summary row (`itemCount` via `_count`) rather than full items |
| Created By | Replace free-text with the authenticated user id once the auth module is available; keep a name snapshot for display/export |
| Soft delete | If adopted, `deleteIndent` becomes an update and every query must filter deleted rows; the export and list code both need that filter |
| Transactions | Create indent + lines, delete last-line guard, and submit become `prisma.$transaction` blocks |

## 5. Recommended optimizations and features (in suggested order)

**Quick wins (low effort, high value)**
1. Server-side validation with a schema (e.g. Zod) for every route: enums, positive quantity, valid dates, existing master ids, trimmed lengths. Return safe messages; never return `err.message` raw.
2. Move state rules to the server: Draft-only edit/delete item/delete indent, allowed status transitions only, header fields immutable.
3. Dedicated `submit` endpoint, and remove `status` from the create/update payloads.
4. Fix list row navigation with `<Link>`; stop duplicating the handler on each cell.
5. Hide the list-page Delete button unless the indent is Draft (match the detail page) and show errors for failed deletes/submits.
6. Add `AbortController` to the debounced fetches to prevent stale responses overwriting newer ones.

**Medium effort**
7. Make the list and detail pages server components (NFR-04): fetch the first page on the server, keep filters as URL search params so views are shareable and back-button friendly, and use client components only for interactivity.
8. Add an authentication context seam: `getCurrentUser()` and a `can(user, action, indent)` helper called from every route, so the TBD permission matrix becomes configuration rather than a rewrite.
9. Stock freshness: re-fetch stock for all lines when opening Save/Submit confirmation, show "was X, now Y, Update" for changes (SRS 9.6, if confirmed), and show an error state instead of 0 when stock lookup fails.
10. Error dialog component: replace inline callouts with a single `ErrorDialog` driven by one `useApi` helper that handles `res.ok`, JSON errors, and network failures (FR-22).
11. Export: stream from a query instead of loading all, add a proper file name (date and filter), freeze the header row, set number/date cell types, and optionally add a second sheet for indent headers. Replace `xlsx` with a maintained alternative.
12. Accessibility pass: `htmlFor`/`id` on labels, keyboard-reachable rows (real links), `role="dialog"`, focus trap and Esc on `ConfirmDialog`, `aria-live` on errors.

**Larger or optional features**
13. Responsive layout: use Tailwind utility classes and breakpoints instead of inline fixed grids; wrap tables in a scroll container.
14. Row-level item summary on the list (expandable item grid, as SRS 10.1 suggests) instead of only an item count.
15. Audit trail: record who changed what and when (needed once roles exist), plus status history.
16. "Duplicate indent" and "copy items from a previous indent" actions to speed up repeat requests.
17. Unsaved-changes guard on the new-indent page, and auto-save of a local draft so a refresh does not lose entered items.
18. Print template: a header block (company name, indent number, status, page number) and page-break rules for long item tables, once the company supplies a format.
19. Automated tests: unit tests for validation and state transitions, API tests for the routes, and one end-to-end test for create, submit and export; wire into CI.
20. Duplicate-item handling in the entry form (warn or merge quantities) once SRS 8.6 is decided.

## 6. Open points that block a final answer (SRS TBDs the app currently guesses)

- Status list and who sets post-submit statuses (7.9), which drives the status master and filters.
- Which fields are editable after submit (7.10/8.10) and whether editing a Submitted indent is allowed at all.
- Roles and the permission matrix (section 6), which sets what `can()` must enforce.
- Duplicate items (8.6), remove-before-save (8.8), indent number and item code formats (7.2, 8.4), stock warning (9.6).
