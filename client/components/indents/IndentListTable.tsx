"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useId, useState } from "react";
import { ApiError, apiDownload, apiFetch, saveBlob, toApiError } from "@/lib/client/api";
import type { IndentDetail, IndentSummary } from "@/lib/services/types";
import { displayTime } from "@/lib/shared/format";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorDialog from "@/components/ui/ErrorDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import ItemGrid from "./ItemGrid";

type ExportFilters = Record<string, string | number>;

// The indent table (FR-11, FR-14, FR-18, FR-19, SRS 10.1): selection, lazy item
// grids, delete for Drafts, export of the selection or of everything matching.
export default function IndentListTable({
  items,
  total,
  filters,
  canExport,
  canCreate,
}: {
  items: IndentSummary[];
  total: number;
  /** The active list filters, sent as-is when exporting "all matching". */
  filters: ExportFilters;
  canExport: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const captionId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, IndentDetail | "loading" | ApiError>>({});
  const [toDelete, setToDelete] = useState<IndentSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const pageNumbers = items.map((i) => i.indentNumber);
  const allOnPage = items.length > 0 && pageNumbers.every((n) => selected.has(n));

  function toggle(n: string) {
    setAllMatching(false);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function togglePage() {
    setAllMatching(false);
    setSelected(allOnPage ? new Set() : new Set(pageNumbers));
  }

  async function toggleExpand(n: string) {
    if (expanded[n]) {
      setExpanded((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== n)));
      return;
    }
    setExpanded((e) => ({ ...e, [n]: "loading" }));
    try {
      const detail = await apiFetch<IndentDetail>(`/api/indents/${encodeURIComponent(n)}`);
      setExpanded((e) => (n in e ? { ...e, [n]: detail } : e));
    } catch (err) {
      setExpanded((e) => ({ ...e, [n]: toApiError(err) }));
    }
  }

  async function runExport() {
    setBusy(true);
    try {
      const body = allMatching ? { mode: "filtered", filters } : { indentNumbers: [...selected] };
      const { blob, filename } = await apiDownload("/api/indents/export", { method: "POST", json: body });
      saveBlob(blob, filename);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/api/indents/${encodeURIComponent(toDelete.indentNumber)}?version=${toDelete.version}`, { method: "DELETE" });
      setToDelete(null);
      setSelected((s) => {
        const next = new Set(s);
        next.delete(toDelete.indentNumber);
        return next;
      });
      router.refresh();
    } catch (err) {
      setToDelete(null);
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-semibold">No indents match your filters.</p>
        <p className="mt-1 text-[var(--ink-soft)]">Try different filters, or clear them to see every indent.</p>
        {canCreate && (
          <Link href="/indents/new" className="btn btn-primary mt-4">
            New Indent
          </Link>
        )}
      </div>
    );
  }

  const exportCount = allMatching ? total : selected.size;
  return (
    <div className="panel print-area">
      {canExport && (
        <div className="no-print flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
          <button type="button" className="btn btn-secondary" disabled={busy || exportCount === 0} onClick={runExport}>
            {busy ? "Exporting…" : allMatching ? `Export all matching filters (${total})` : `Export selected (${selected.size})`}
          </button>
          {allOnPage && !allMatching && total > items.length && (
            <p className="text-[12.5px]" role="status">
              All {items.length} indents on this page are selected.{" "}
              <button type="button" className="font-semibold text-[var(--accent)] underline" onClick={() => setAllMatching(true)}>
                Select all {total} matching
              </button>
            </p>
          )}
          {allMatching && (
            <p className="text-[12.5px]" role="status">
              All {total} matching indents are selected.{" "}
              <button type="button" className="font-semibold text-[var(--accent)] underline" onClick={() => { setAllMatching(false); setSelected(new Set()); }}>
                Clear selection
              </button>
            </p>
          )}
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table" aria-describedby={captionId}>
          <caption id={captionId} className="sr-only">
            Indents, newest first. Use the Indent Number link to open one.
          </caption>
          <thead>
            <tr>
              {canExport && (
                <th scope="col" className="w-8">
                  <input type="checkbox" aria-label="Select all indents on this page" checked={allOnPage} onChange={togglePage} />
                </th>
              )}
              <th scope="col" className="w-8"><span className="sr-only">Show items</span></th>
              <th scope="col">Indent Number</th>
              <th scope="col">Type</th>
              <th scope="col">Date</th>
              <th scope="col">Time</th>
              <th scope="col">Department</th>
              <th scope="col">Created By</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Items</th>
              <th scope="col" className="no-print"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((ind) => {
              const n = ind.indentNumber;
              const open = expanded[n];
              return (
                <Fragment key={n}>
                  <tr>
                    {canExport && (
                      <td>
                        <input type="checkbox" aria-label={`Select ${n}`} checked={selected.has(n)} onChange={() => toggle(n)} />
                      </td>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost px-2 py-1"
                        aria-expanded={Boolean(open)}
                        aria-label={`${open ? "Hide" : "Show"} items of ${n}`}
                        onClick={() => toggleExpand(n)}
                      >
                        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                      </button>
                    </td>
                    <td>
                      <Link href={`/indents/${encodeURIComponent(n)}`} className="mono font-semibold text-[var(--accent)] hover:underline">
                        {n}
                      </Link>
                    </td>
                    <td>{ind.indentType.name}</td>
                    <td>{ind.indentDate}</td>
                    <td>{displayTime(ind.indentTime)}</td>
                    <td>{ind.department?.name ?? "—"}</td>
                    <td>{ind.createdBy.name}</td>
                    <td><StatusBadge code={ind.status.code} name={ind.status.name} /></td>
                    <td className="text-right">{ind.itemCount}</td>
                    <td className="no-print">
                      <div className="flex justify-end gap-1">
                        <Link href={`/indents/${encodeURIComponent(n)}`} className="btn btn-ghost px-2 py-1">
                          Open<span className="sr-only"> {n}</span>
                        </Link>
                        {ind.permissions.canDelete && (
                          <button type="button" className="btn btn-danger px-2 py-1" onClick={() => setToDelete(ind)}>
                            Delete<span className="sr-only"> {n}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={canExport ? 11 : 10} className="bg-[var(--surface)]">
                        {open === "loading" ? (
                          <p role="status" className="py-2 text-[var(--ink-soft)]">Loading items…</p>
                        ) : open instanceof ApiError ? (
                          <p role="alert" className="py-2 text-[var(--red)]">{open.message}</p>
                        ) : (
                          <ItemGrid lines={open.items} caption={`Items of ${n}`} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete indent"
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        Are you sure you want to delete this Indent{toDelete ? ` (${toDelete.indentNumber})` : ""}?
      </ConfirmDialog>
      <ErrorDialog
        error={error}
        onClose={() => setError(null)}
        onReload={() => {
          setError(null);
          router.refresh();
        }}
      />
    </div>
  );
}
