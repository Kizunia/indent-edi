# SRS errata: inconsistencies and deliberate deviations

The SRS text ([SRS-v1.0.md](SRS-v1.0.md)) is never edited. This file lists places where the SRS contradicts itself or where the app deliberately does something slightly different, with the resolution. Each entry must link to the decision that justifies it. Add new entries as they are found; do not delete old ones.

| ID | SRS clauses | Issue | Resolution | Decision |
|---|---|---|---|---|
| E-01 | UC-01 step 2 vs FR-02, BR-02 | UC-01 says the number is generated when Create opens. A number handed out before saving cannot be gap-free if the form is abandoned. | The Create screen shows a read-only **expected** number. The real number is assigned on save and shown in the confirmation. | [DEC-010](../decisions/DEC-010-number-generation-and-preview.md) |
| E-02 | 7.5 ("draft can be edited") vs 7.7 / BR-06 ("Indent-level attributes cannot be edited after creation") | Are any Indent-level fields editable in Draft? | Header business fields are immutable. **Remark** is editable in Draft (overrides D-20). Line fields per the DEC-007 table. | [DEC-007](../decisions/DEC-007-edit-rules.md) |
| E-03 | FR-03 ("users enter Date, Time, Created By") vs 1.4 (Created By = authenticated user) | Users cannot both be the authenticated user and type their own name. Browser-supplied date/time is untrustworthy. | Created By comes from the authenticated user. Date and Time are server-assigned and read-only. | [DEC-003](../decisions/DEC-003-auth-provider-seam.md), [DEC-021](../decisions/DEC-021-business-date-time.md) |
| E-04 | 7.1 (Department on Indent) vs 8.2 and 15.1 (Department and Purpose on Item) | Department and Purpose describe a request, not the catalogue item. | Both live on the **line** (`indent_item`); the header also has a department which defaults onto lines. | [DEC-022](../decisions/DEC-022-department-handling.md), D-16, D-26 |
| E-05 | 8.10 (Item Code possibly editable) vs FR-07 / 9.3 (stock looked up by Item Code) | Editing the code of a line would break the stock link. | A line's item and code are read-only; to change the item, remove the line and add another. | [DEC-007](../decisions/DEC-007-edit-rules.md), D-21 |
| E-06 | UC-04 precondition ("Indent exists in Draft") and BR-05 vs a one-click Save & Submit | A combined action skips a visible Draft step. | The combined action creates the Draft and submits in one transaction; both states are recorded in history. | [DEC-006](../decisions/DEC-006-save-and-submit.md) |
| E-07 | 15.2 / 15.3 (Item -> Item Code -> Stock) vs the schema keyed by `item_id` | Same relation, different key. | `stock_balance` is 1:1 on `item_id`; Item Code is unique on the item, so it is equivalent. | D-25 |
| E-08 | 10.1 (list shows item-level fields) vs "Indent Number" search and "Select an Indent" (10.2-10.4) | The list mixes indent-level and item-level fields. | The list shows indent-level summary rows with an expandable item grid, as the 10.1 note itself recommends. | [DEC-019](../decisions/DEC-019-ui-system.md) |
| E-09 | 8.11 / FR-17 ("a status that permits modification") vs 7.9 (statuses TBD) | The rule refers to statuses that are not defined. | Modification is allowed when `indent_status_master.is_editable` is true; today only DRAFT. | [DEC-005](../decisions/DEC-005-status-model-and-transitions.md), D-14 |
| E-10 | FR-21 (confirm Delete, Save, Update, Submit) vs 10.4 (select an indent) | Selecting/viewing needs no confirmation, but the SRS does not say that explicitly. | Confirmation is required only for the four listed actions (and the combined Save & Submit). Export, print and view do not need it. | [ui.md](../spec/ui.md) |
| E-11 | 18.4 state machine (Draft -> Submitted -> Pending Approval -> Approved/Rejected) vs 7.9 ("not confirmed") | The diagram presents unconfirmed states as a model. | Only DRAFT and SUBMITTED are modelled by this module; other statuses are data from the approval team. | [DEC-005](../decisions/DEC-005-status-model-and-transitions.md) |

## How to add an entry

1. Quote the conflicting clauses (ids or section numbers).
2. State the resolution and link the decision record (create one if none exists).
3. If the SRS owner confirms a different rule, update the DEC and mark the entry `Resolved by company answer`.
