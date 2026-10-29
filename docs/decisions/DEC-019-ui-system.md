# DEC-019: UI system: Tailwind, reusable components, desktop-first responsive

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** team default
- **SRS refs:** NFR-01, NFR-02, NFR-07, 10.1, FR-21
- **Review refs:** #13, section 2 NFR-02, NFR-07, feature 13, 14
- **Work items:** WI-08

## Context

The MVP uses heavy inline styles and fixed 3-5 column grids, with one `@media print` rule and no breakpoints. `AddedItem` is declared in three places and the filter bar and `Field` are inline.

## Decision

1. Styling uses **Tailwind 4 utilities** (already installed) and CSS variables for design tokens (colours, spacing, radii) in `globals.css`. No inline `style` props except for truly dynamic values.
2. Desktop-first (NFR-01): the layout is designed at >= 1280px, with breakpoints at `md` and `sm` that stack form grids and make tables horizontally scrollable inside a container (NFR-02).
3. Shared components in `client/components/` (names are the contract): `Field` (label + control + error, bound with `htmlFor`/`id`), `FilterBar`, `DataTable`, `StatusBadge`, `Pagination`, `ConfirmDialog`, `ErrorDialog`, `ItemEntryForm`, `ItemGrid`, `PageHeader`. Types come from the shared Zod schemas (DEC-014), no duplicates.
4. List rows are summary rows (number, type, date, department, created by, status, item count) with an **expandable item grid** (SRS 10.1 note), not a flat table of item fields.
5. Confirmation texts follow SRS 12.2 wording; see [ui.md](../spec/ui.md).
6. The legacy `SideNav` stays, but shows only entries the user can use.

## Revisit if

The company supplies a design system or brand guide.
