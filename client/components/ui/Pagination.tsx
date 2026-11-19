import Link from "next/link";

// FR-15: 10 per page, Prev / Next / page numbers. Plain links, so the URL
// carries the page and the browser back button works (DEC-017).
export default function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const windowSize = 5;
  const end = Math.min(totalPages, Math.max(1, page - Math.floor(windowSize / 2)) + windowSize - 1);
  const start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const item = "btn min-w-9 justify-center";
  return (
    <nav aria-label="Pagination" className="no-print flex flex-wrap items-center justify-between gap-2 px-1 py-3">
      <p className="text-[12.5px] text-[var(--ink-soft)]" aria-live="polite">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link className="btn btn-ghost" href={hrefFor(page - 1)} aria-label="Previous page">
              Prev
            </Link>
          ) : (
            <span className="btn btn-ghost opacity-45" aria-disabled="true">
              Prev
            </span>
          )}
        </li>
        {start > 1 && (
          <li aria-hidden="true" className="px-1 text-[var(--ink-soft)]">
            …
          </li>
        )}
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={hrefFor(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`${item} ${p === page ? "bg-[var(--navy)] text-white" : "text-[var(--ink)] hover:bg-[var(--grey-soft)]"}`}
            >
              {p}
            </Link>
          </li>
        ))}
        {end < totalPages && (
          <li aria-hidden="true" className="px-1 text-[var(--ink-soft)]">
            …
          </li>
        )}
        <li>
          {page < totalPages ? (
            <Link className="btn btn-ghost" href={hrefFor(page + 1)} aria-label="Next page">
              Next
            </Link>
          ) : (
            <span className="btn btn-ghost opacity-45" aria-disabled="true">
              Next
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
