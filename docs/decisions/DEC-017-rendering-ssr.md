# DEC-017: Server Components for pages, URL-driven filters, REST for mutations

- **Status:** Accepted (SSR is a dev-team technical decision per NFR-04, not a business requirement)
- **Date:** 2026-10-29
- **Decided by:** team default
- **SRS refs:** NFR-04, 2.4, 10.4, 10.5, FR-14, FR-15
- **Review refs:** #6, #7, #8, feature 7
- **Work items:** WI-07

## Context

All three pages are `"use client"` and fetch after mount. The first paint is "Loading...", filter state is lost on refresh, and rows use `window.location.href` (full reload).

## Decision

1. List (`/indents`), detail (`/indents/[indentNumber]`) and new (`/indents/new`) are **Server Components** that call services directly (after `authorize()`), so the first HTML contains the data. Read the Next.js 16 docs in `client/node_modules/next/dist/docs/` before writing them (see [client/AGENTS.md](../../client/AGENTS.md)).
2. List filters, search and page number are **URL search params**, so a view can be bookmarked, shared, and survives refresh and the back button. Filter changes use `router.replace` (debounced for text); stale responses are avoided by Next navigation (and `AbortController` for the item picker).
3. Interactive parts (forms, filter bar, dialogs, selection) are small Client Components.
4. Mutations and client-side lookups use the REST route handlers ([api.md](../spec/api.md)), so there is one contract for the UI, export and future integrations. Server Actions are not used.
5. Rows navigate with `<Link>`, one per row (not a handler on each cell). See DEC-020.
6. The list page returns summary rows including `_count.items` and the item grid on expand (loaded on demand), not all lines for every indent (D-30).
7. Loading and error states use route-level `loading.tsx` and `error.tsx` with the standard dialog text.

## Consequences

Selection for export is kept in client state; "select all matching the filters" is a server-side mode (DEC-018).
