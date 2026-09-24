"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

// FR-15 / SRS §36: confirmed page size of 10 records per page.
export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px" }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          className="btn btn-ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        {start > 1 && <span style={{ padding: "7px 6px", color: "var(--ink-soft)" }}>…</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="btn"
            style={{
              background: p === page ? "var(--navy)" : "transparent",
              color: p === page ? "#fff" : "var(--ink)",
              minWidth: 32,
              justifyContent: "center",
            }}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span style={{ padding: "7px 6px", color: "var(--ink-soft)" }}>…</span>}
        <button
          className="btn btn-ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
