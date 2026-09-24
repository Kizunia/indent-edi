# Organize Indent System

A working Next.js implementation of the Organize Indent System, built from the
accompanying SRS. It covers Indent creation, item management, current-stock
display, draft/submit workflow, search/filter/pagination, Excel export, and
print — using local JSON files as a stand-in database so it runs immediately
with no external services.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it redirects to `/indents`.

For a production build:

```bash
npm run build
npm run start
```

## What's implemented

- **Create Indent** (`/indents/new`) — auto-generated Indent Number, Indent
  Type / Department from master data, item entry with live Current Stock
  lookup, "Add Item" into a Current Indent Item List, and validation that
  blocks Save when the item list is empty (FR-08).
- **Save as Draft vs. Submit** — two distinct actions, each behind its own
  confirmation dialog.
- **Indent List** (`/indents`) — search by Indent Number, filters (Indent
  Type, Department, Status, Created By, Date range), 10-per-page pagination,
  row selection, and delete with confirmation.
- **Indent Detail** (`/indents/:id`) — full Indent + item view, in-place item
  editing while in Draft, Submit, Delete, Print (browser print with a
  print-only stylesheet), and per-Indent Excel export.
- **Excel export** — one selected Indent, multiple selected Indents, or all
  Indents (respecting active filters), with full Indent + Item columns, via
  the `xlsx` package.
- **Error handling & confirmations** — API errors surface as readable
  messages (never raw stack traces); Save, Update, Submit, and Delete all
  require explicit confirmation.

## Data model

`lib/types.ts` and `lib/store.ts` implement the logical entities from the SRS
(Indent, Item, Indent Item, Stock, Department, Indent Type) against flat JSON
files in `/data`. This is intentionally isolated behind plain functions
(`getDepartments`, `getCurrentStock`, `createIndent`, ...) so it can be
swapped for real database/ERP calls later without touching the API routes or
UI.

## Decisions made to build something runnable (all TBD in the SRS)

The SRS deliberately leaves ~20 items unresolved pending company
confirmation. To ship a working app, this build makes an explicit,
clearly-commented placeholder choice for each one. Search `TBD` in the
codebase to find every instance; the main ones:

| Area | Placeholder used here | SRS ref |
|---|---|---|
| Indent Number format | `IND-YYYYMMDD-####` | §8 |
| Item Code format | `ITM-#####` | §14 |
| Item Master | Recreated locally in `data/items.json` | §15 |
| Duplicate items | Allowed (not blocked or merged) | §16 |
| Remove item before save | Allowed | §24 |
| Editable item fields | Purpose, Required Qty, Required Date, Unit — only while Draft | §29, §39 |
| Search behavior | Partial, case-insensitive match on Indent Number | §33 |
| Status values | Draft, Submitted, Pending Approval, Approved, Rejected, Cancelled | §37 |
| Delete permissions | Allowed only while status = Draft | §31 |
| Stock-outdated warning | Not implemented | §22 |
| User roles / permission matrix | Not enforced — every user can perform every action | §6 |

None of these are meant to be final — they exist so the app runs end-to-end
today and can be replaced individually as the company confirms each item.

## Project structure

```
app/
  indents/            List, New, Detail pages (client components)
  api/                Route handlers: indents, items, meta, stock, export
components/           ItemEntryForm, CurrentItemList, ConfirmDialog, etc.
lib/
  types.ts            Domain types
  store.ts            Data access layer over the JSON files in /data
data/                 departments.json, indent-types.json, items.json,
                      stock.json, indents.json (seed/demo data)
```

## Known gaps / next steps

- No authentication — `Created By` is a free-text field (SRS §43 says login
  is provided by another module).
- No role-based permission enforcement (SRS §6 permission matrix is TBD).
- JSON-file storage is for demo purposes; swap `lib/store.ts` for a real
  database once the company confirms the schema/ERP integration approach.
- Approval workflow, statuses beyond Draft/Submitted, and the stock-outdated
  warning are out of scope per the SRS and are not implemented.
