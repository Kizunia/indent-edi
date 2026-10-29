# UI specification

Screens, flows and texts. Components and styling rules are in [DEC-019](../decisions/DEC-019-ui-system.md), accessibility in [DEC-020](../decisions/DEC-020-accessibility.md), rendering in [DEC-017](../decisions/DEC-017-rendering-ssr.md). Wording can be refined during UI design (SRS 12.2 note), but every dialog below must exist.

## 1. Screens

| Route | Rendering | Purpose | SRS |
|---|---|---|---|
| `/` | server | redirect to `/indents` | |
| `/indents` | Server Component + client filter bar | list, search, filter, paginate, select, export, expand items, delete Draft | FR-11-15, 10.x |
| `/indents/new` | Server Component shell + client form | create | FR-01-10, UC-01-03 |
| `/indents/[indentNumber]` | Server Component + client actions | view, edit Draft, submit, delete, print, export one | FR-14, 10.4, UC-04, UC-05, UC-08 |
| `/not-signed-in`, `/forbidden`, `not-found`, `error` | server | standard states | FR-22, NFR-09 |

Header bar (all screens): system name, side navigation (only entries the user can use), current user name + role, and in dev the user/role switcher (DEC-003).

## 2. Indent list (`/indents`)

- **Filter bar** (state in the URL): Search (Indent Number, DEC-011), Indent Type, Department, Status, Created By, Date from, Date to (the Date and Date Range filters are one from/to pair; setting both to the same day gives "Date"), and a Clear button. All combinable (FR-13). Option lists come from `/api/meta` and `/api/indents/creators`.
- **Table:** checkbox, Indent Number (a real link), Type, Date, Time, Department, Created By, Status badge, Items (count), row actions (Open, Delete only when `permissions.canDelete`). A chevron expands an **item grid** under the row (Item Code, Name, Specification, Drawing No., Department, Purpose, Current Stock, Required Qty, Unit, Required Date), loaded on demand.
- **Pagination:** 10 per page, Prev / Next / page numbers, `aria-current` on the current page. Shows "Showing 11-20 of 134".
- **Selection and export:** per-row checkboxes; header checkbox selects the page, then a banner offers "Select all N matching". Export button: "Export selected (n)" / "Export all matching filters".
- **Empty state:** "No indents match your filters." with a Clear filters button (UC-06). First-use empty state offers New Indent when `indent.create` is allowed.
- Loading: skeleton rows via `loading.tsx`.

## 3. Create (`/indents/new`)

Fields: **Indent Number** (read-only, "Expected IND-000124 - confirmed when you save"), **Indent Type** (select), **Department** (select), **Date** and **Time** (read-only, server-assigned, shown from the server's clock), **Created By** (read-only, current user), **Remark** (textarea).

**Item entry** (`ItemEntryForm`): search/select an existing item (type-ahead, "refine your search" when `hasMore`) or "New item" (name, specification, drawing number, unit). Then: Department (defaults to header), Purpose, Required Quantity, Unit (defaults to the item's default unit), Required Date, and **Current Stock** (read-only; "Not available" when none). **Add Item** appends to the **Current Item List** (`CurrentItemList`), each row with Remove (DEC-012) and Edit-in-place. Adding a duplicate shows the `DUPLICATE_ITEM` message (DEC-009).

Buttons: **Save Draft**, **Save & Submit** (only if the user also has `indent.submit`), **Cancel**. With no lines, Save is disabled with a hint, and pressing it anyway (e.g. keyboard) shows the empty-indent error dialog.

Unsaved-changes guard: leaving with a non-empty list asks "Discard this indent? Entered items will be lost."

## 4. Detail (`/indents/[indentNumber]`)

Header block (all fields, status badge, submitted at/by if any), item table, and actions shown from `permissions`:
- **Edit** (Draft): Remark inline edit; each line editable per [domain-rules.md](domain-rules.md) section 2; **Add Item**; line **Remove** (hidden when only one line).
- **Submit** (Draft), **Delete** (Draft), **Print**, **Export** (this indent).
- If a Draft line's stock snapshot is older than current stock, a non-blocking notice lists the changes with **Update stock values** (DEC-013).
- Submitted indents show no edit controls.

## 5. Confirmations (FR-21, SRS 12.2)

All use `ConfirmDialog` (`role="dialog"`, labelled, focus trap, Esc/Cancel, default focus on Cancel for Delete).

| Action | Title | Text | Confirm label |
|---|---|---|---|
| Save Draft | Save indent | Are you sure you want to save this Indent? | Save |
| Save & Submit | Save and submit | Are you sure you want to save and submit this Indent? It will be sent for approval. | Save and submit |
| Update | Update indent | Are you sure you want to update this Indent? | Update |
| Submit | Submit indent | Are you sure you want to submit this Indent? | Submit |
| Delete indent | Delete indent | Are you sure you want to delete this Indent? | Delete |
| Delete item | Delete item | Are you sure you want to delete this Item? | Delete |

Save/Submit dialogs first re-check stock and, if values changed, list "Item X: was A, now B" with **Update stock values** (DEC-013). No confirmation for view, search, filter, export, print, or removing an unsaved line.

After success: a short success dialog or toast containing the **final Indent Number** (and "differs from the number shown earlier" if it changed, DEC-010).

## 6. Error and conflict dialogs (FR-22, 12.3)

One `ErrorDialog` (`role="alertdialog"`) with a title, a plain-language message from the envelope, an optional list of field errors, a requestId line for `INTERNAL`, and a close button. Required cases: saving without an item, invalid input, database failure (generic), stock retrieval failure, unauthorized operation, invalid or missing indent, failed export, failed update, failed deletion.

`VERSION_CONFLICT` dialog: "This indent was changed by someone else. Reload to see the latest version." with **Reload**.

No raw technical text is ever displayed.

## 7. Responsive and print

- Designed for >= 1280px. Below `md`, form grids stack to one column and tables scroll inside their container; filter bar wraps. Touch targets >= 24px.
- Print: see [export-print.md](export-print.md) section 2.
