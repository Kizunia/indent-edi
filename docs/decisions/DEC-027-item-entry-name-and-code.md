# DEC-027: Item entry has two linked inputs, Item Name and Item Code

- **Status:** Accepted (refines DEC-025 points 1 and 3, the item picker)
- **Date:** 2026-11-19
- **Decided by:** user (review of the running app; the SRS is the source of truth)
- **SRS refs:** 8.2, 8.3, 8.4, 9.3, 9.4, 12.1 ("valid Item Code"), FR-04, FR-06, FR-07, BR-03
- **Data model refs:** D-21, D-27
- **Review refs:** [srs-compliance.md](../reviews/srs-compliance.md)
- **Work items:** WI-08

## Context

SRS 8.2 lists Item Name and Item Code as separate item fields, and 9.3 says the user selects or enters the item and the system identifies the Item Code (then the stock). The first build had one combined "Item (code or name)" box and showed neither Specification nor Drawing Number once an item was chosen, which SRS 8.2 also lists.

## Decision

1. The item entry has **two inputs, Item Name and Item Code**, each a type-ahead search of the item master. Choosing an item in either one fills the other, the Specification, the Drawing Number (read-only), the default Unit and the Current Stock. Typing in one input clears the item and the other input, so the two can never disagree. Leaving an input with text that exactly equals one item's code or name (case-insensitive) selects that item; an ambiguous name is never selected silently.
2. The Item Code is **never typed to create or generate an item** (BR-03, 8.4). A code that matches no item is rejected with "Enter a valid Item Code." (12.1).
3. For a **new item** the user types the Item Name (8.3), Specification, Drawing Number and Unit. The Item Code input is read-only and shows "Assigned on save"; the code is generated inside the save transaction (DEC-025 point 2, DEC-010).
4. `GET /api/items?q=&field=name|code` limits the match to the name or the code column. Without `field` both are searched (unchanged behaviour). Results keep `startsWith` before `contains`, the cap of 20 and `hasMore`.
5. The selected item's stock is re-read when the window regains focus and again just before **Add Item**, so the row added carries the latest value (9.4; the mechanism stays unspecified in the SRS).

## Alternatives considered

- One combined box (the first build): does not show the two SRS fields and hides the code.
- Item Code as a free-text input that creates items: contradicts BR-03.

## Consequences

`ItemEntryForm` is built from two `ItemCombobox` instances. The Current Item List and the detail item table show Specification and Drawing Number. One small API parameter was added.

## Revisit if

The company decides on 8.5 (Item Master source) or answers open question 16.
