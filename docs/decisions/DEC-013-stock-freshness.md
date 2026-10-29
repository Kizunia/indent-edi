# DEC-013: Stock freshness, snapshot, and the change notice

- **Status:** Provisional (SRS 9.4 mechanism and 9.6 / BR-14 TBD); BR-04 is Confirmed
- **Date:** 2026-10-29
- **Decided by:** user (re-check at Save/Submit with a non-blocking notice)
- **SRS refs:** 9.2-9.6, FR-07, BR-04, BR-14, 17.3
- **Data model refs:** D-25
- **Review refs:** #9, section 2 rows 9.4, 9.6, FR-07
- **Work items:** WI-04, WI-09

## Context

The MVP fetches stock only when an item is selected, never re-checks it, treats an unknown item as 0, and forces 0 for new items.

## Decision

1. Stock is read only through `StockProvider.getStock(itemIds)` (D-25), whose default implementation reads `stock_balance`. It returns `{ itemId, quantity, updatedAt } | null` per item. **The indent service never writes stock** (BR-04).
2. **Unknown or missing stock is "Not available"**, not 0. It is stored as `current_stock_snapshot = NULL` and shown as "Not available" in UI, print and export. A stock lookup failure raises `STOCK_UNAVAILABLE` (a dialog message, FR-22), and the user may continue where the provider returns "not available".
3. When an item is added, its stock is fetched and shown (FR-07).
4. When the user presses Save, Save & Submit or Submit, **before** the confirm dialog is shown, the app re-reads stock for all lines. If any value changed since it was displayed (compare quantity or `updatedAt` > `stock_checked_at`), the confirm dialog lists "Item X: was A, now B" with an **Update stock values** button. This is informational and **never blocks** saving.
5. On save, the server re-reads stock itself and stores `current_stock_snapshot` and `stock_checked_at` for each line; the client-supplied value is ignored (server is the authority).
6. The same notice appears on the detail page of a Draft when a line's snapshot is older than the current stock.
7. New items created on the form have no stock row: stock shows "Not available".

## Alternatives considered

- Silent refresh: the user never learns their view was stale.
- Fetch once only: shows old values indefinitely, which 9.4 says to avoid.

## Consequences

One batched stock call per confirm. The provider interface keeps the real Inventory DB swappable.

## Revisit if

The company says the warning is not required (remove step 4 UI only), or the Inventory DB becomes available (new provider).
