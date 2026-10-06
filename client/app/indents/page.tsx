"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Indent } from "@/lib/types";

const STATUS_OPTIONS = ["Draft", "Submitted", "Pending Approval", "Approved", "Rejected", "Cancelled"];

export default function IndentsListPage() {
  const [meta, setMeta] = useState<{ departments: { id: string; name: string }[]; indentTypes: { id: string; name: string }[] }>({
    departments: [],
    indentTypes: [],
  });
  const [results, setResults] = useState<Indent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [indentType, setIndentType] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Indent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then(setMeta);
  }, []);

  const fetchIndents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (indentType) params.set("indentType", indentType);
    if (department) params.set("department", department);
    if (status) params.set("status", status);
    if (createdBy) params.set("createdBy", createdBy);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    fetch(`/api/indents?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results);
        setTotal(data.total);
        setLoading(false);
      });
  }, [search, indentType, department, status, createdBy, dateFrom, dateTo, page]);

  useEffect(() => {
    const t = setTimeout(fetchIndents, 200);
    return () => clearTimeout(t);
  }, [fetchIndents]);

  useEffect(() => {
    setPage(1);
  }, [search, indentType, department, status, createdBy, dateFrom, dateTo]);

  const allOnPageSelected = results.length > 0 && results.every((r) => selected.has(r.id));

  function toggleSelectAll() {
    const next = new Set(selected);
    if (allOnPageSelected) {
      results.forEach((r) => next.delete(r.id));
    } else {
      results.forEach((r) => next.add(r.id));
    }
    setSelected(next);
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleExport(mode: "selected" | "all") {
    setError("");
    if (mode === "selected" && selected.size === 0) {
      setError("Select at least one Indent to export, or use \"Export all\".");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/indents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ids: Array.from(selected),
          filters: { search, indentType, department, status, createdBy, dateFrom, dateTo },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "indents-export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/indents/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchIndents();
  }

  const hasFilters = search || indentType || department || status || createdBy || dateFrom || dateTo;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Indents</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            Search, filter, and manage material requests.
          </p>
        </div>
        <Link href="/indents/new" className="btn btn-primary">
          + New Indent
        </Link>
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label className="field-label">Search by Indent Number</label>
            <input
              className="input"
              placeholder="e.g. IND-20260908-0001"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Indent Type</label>
            <select className="input" value={indentType} onChange={(e) => setIndentType(e.target.value)}>
              <option value="">All</option>
              {meta.indentTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Department</label>
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All</option>
              {meta.departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Created By</label>
            <input className="input" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 3fr", gap: 10, alignItems: "end" }}>
          <div>
            <label className="field-label">Date from</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Date to</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {hasFilters && (
            <div>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSearch(""); setIndentType(""); setDepartment(""); setStatus("");
                  setCreatedBy(""); setDateFrom(""); setDateTo("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="callout" style={{ marginBottom: 12, borderLeftColor: "var(--red)", background: "var(--red-soft)", color: "var(--red)" }}>
          {error}
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          {selected.size > 0 ? `${selected.size} selected` : "\u00A0"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport("selected")}>
            Export selected
          </button>
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExport("all")}>
            Export all (filtered)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
              </th>
              <th>Indent Number</th>
              <th>Type</th>
              <th>Department</th>
              <th>Date</th>
              <th>Created By</th>
              <th>Items</th>
              <th>Status</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--ink-soft)" }}>Loading…</td></tr>
            )}
            {!loading && results.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--ink-soft)" }}>
                  {hasFilters ? "No Indents match these filters." : "No Indents yet. Create your first Indent to get started."}
                </td>
              </tr>
            )}
            {!loading && results.map((indent) => (
              <tr key={indent.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(indent.id)}
                    onChange={() => toggleSelect(indent.id)}
                  />
                </td>
                <td className="mono" onClick={() => (window.location.href = `/indents/${indent.id}`)}>
                  {indent.indentNumber}
                </td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}>{indent.indentType}</td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}>{indent.department}</td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}>{indent.indentDate}</td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}>{indent.createdBy}</td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}>{indent.items.length}</td>
                <td onClick={() => (window.location.href = `/indents/${indent.id}`)}><StatusBadge status={indent.status} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost"
                    title="Delete Indent"
                    style={{ color: "var(--red)" }}
                    onClick={() => setDeleteTarget(indent)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 12px" }}>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Indent"
        message={`Are you sure you want to delete Indent ${deleteTarget?.indentNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
