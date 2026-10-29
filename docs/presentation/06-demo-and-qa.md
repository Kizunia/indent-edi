# 6. Demo script and likely questions

## Before you demo

1. `cd client`, then `npm run dev` and open http://localhost:3000. (The old screens use file storage, so the database is not needed yet.)
2. Check the side navigation shows **Signed in as (dev)** at the bottom. If it does not, the app is in production mode or `AUTH_PROVIDER` is not `dev`.
3. Have the [one-page journey](02-how-it-works.md) open as a backup slide.

## Script A - what works today (about 6 minutes)

| Step | Do | Say |
|---|---|---|
| 1 | Open **All Indents** | "This is the list: search, six filters, 10 per page." Use a filter, then clear it |
| 2 | Click **New Indent** | "Pick a type and department, then add items. The system shows current stock for each item." Add two items |
| 3 | Try to save with no items | "An indent can never be saved empty." (FR-08) |
| 4 | **Save** (confirm dialog) | "Every important action asks for confirmation." (FR-21) |
| 5 | Open the saved indent | "Draft, with Edit, Submit, Delete, Print." Press **Submit** |
| 6 | **Export** from the list | "One row per item, every field the SRS lists." Open the file |
| 7 | Press **Print** on the detail page | "Controls are hidden; the full indent prints." |

Be upfront that the date/time/creator here are still filled by the browser and "Created by" is still typed; making them server-assigned is a planned work item (WI-04/WI-08).

## Script B - login seam and permissions (about 4 minutes)

| Step | Do | Say |
|---|---|---|
| 1 | Use the **Signed in as (dev)** box to switch to *Dev Store Employee* | "Login belongs to another team, so this is a stand-in that can act as any role. The real login plugs into the same place." |
| 2 | Open `http://localhost:3000/api/me` | "The system knows who I am and what I may do: view, export, print - not create." |
| 3 | Switch to *Dev Admin*, reload `/api/me` | "Admin may do everything." |
| 4 | Show `/api/dev/session` and mention it returns 404 in production | "The switcher cannot exist in a production build." |

Mention that these checks are not yet connected to the old screens; that is WI-06.

## Likely questions

**Is it finished?** No. The foundation (validation, errors, login seam, permissions, settings) is built and tested; the database storage and the screens that use it are the next steps ([05](05-status-and-next-steps.md)).

**Why can't we see the indent number before saving, like the SRS says?** We show an *expected* number. The final one is assigned on save so numbers have no gaps and two users can never get the same one ([DEC-010](../decisions/DEC-010-number-generation-and-preview.md); recorded as a deviation in the [errata](../srs/srs-errata.md), E-01).

**Who decides the roles and permissions?** The company. The SRS leaves them undecided, so we built a configurable table with a provisional default ([DEC-004](../decisions/DEC-004-permission-matrix.md)).

**Can a submitted indent be changed?** Not in this system; the SRS has not said which fields may change after submission. The approval team owns what happens next ([DEC-007](../decisions/DEC-007-edit-rules.md)).

**What happens if two people edit the same Draft?** The second save is refused with a clear message and nothing is overwritten ([DEC-016](../decisions/DEC-016-optimistic-locking.md)).

**Does creating an indent reduce stock?** No (BR-04). Stock is read-only here.

**Can we connect our ERP / login later?** Yes. Login, stock and database access are behind interfaces; connecting each means replacing one component ([architecture](04-architecture.md)).

**What if the company changes the number format or time zone?** Both are settings, not code.

**How do we know it is correct?** Every SRS requirement is mapped to a decision, a work item and a test ([traceability](../spec/traceability.md)); the build fails if a rule breaks.

**What are the risks?** (1) Company answers to the open questions may change defaults; each default is isolated so change is cheap. (2) The database design is not yet verified on a live server. (3) The approval and login teams' contracts are not defined yet.
