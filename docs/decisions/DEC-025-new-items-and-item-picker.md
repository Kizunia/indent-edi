# DEC-025: New items are created inside the indent save; item picker behaviour

- **Status:** Accepted (Item Master source is Provisional: SRS 8.5 TBD)
- **Date:** 2026-10-29
- **Decided by:** team (adopts D-27)
- **SRS refs:** 8.3, 8.4, 8.5, 8.7, FR-04, FR-06, FR-07, BR-03
- **Data model refs:** D-12, D-21, D-27
- **Review refs:** #10, #9, section 2 FR-06
- **Work items:** WI-04, WI-08

## Decision

1. The user either picks an **existing** item or enters a **new** item (name, specification, drawing number, unit). A new item is held in the form as a placeholder with code "Assigned on save".
2. New items are inserted **inside the indent save transaction**, using the `ITEM` sequence (DEC-010), so abandoned forms leave no orphan items or burned codes (D-27). Their code is never user-entered (BR-03).
3. The item picker endpoint `GET /api/items?q=` returns at most 20 active items, matching `item_code` or `item_name` with `startsWith` ranked above `contains`, and returns `hasMore` so the UI can say "refine your search". It supports request cancellation (`AbortController`) to avoid out-of-order results.
4. Adding an item to the form snapshots the item fields for display; the server re-reads the item and stores the snapshots on save (D-21).
5. Duplicate check against existing lines happens on add (DEC-009).
6. If the Item Master is later integrated with the company ERP, only the item repository changes (NFR-08).

## Revisit if

The company decides on 8.5 (recreate / integrate / use directly) or wants a separate Item Master maintenance screen.
