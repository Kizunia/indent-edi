"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Indent, IndentItem } from "@/lib/types";

interface EditRow {
  indentItemId: string;
  purpose: string;
  requiredQuantity: string;
  requiredDate: string;
  unit: string;
}

export default function IndentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [indent, setIndent] = useState<Indent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState<Record<string, EditRow>>({});

  const [confirm, setConfirm] = useState<
    | { type: "submit" }
    | { type: "saveEdits" }
    | { type: "deleteIndent" }
    | { type: "deleteItem"; indentItemId: string; itemName: string }
    | null
  >(null);

  function load() {
    setLoading(true);
    fetch(`/api/indents/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setIndent(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startEditing() {
    if (!indent) return;
    const rows: Record<string, EditRow> = {};
    indent.items.forEach((it) => {
      rows[it.indentItemId] = {
        indentItemId: it.indentItemId,
        purpose: it.purpose || "",
        requiredQuantity: String(it.requiredQuantity),
        requiredDate: it.requiredDate,
        unit: it.unit,
      };
    });
    setEditRows(rows);
    setEditing(true);
  }

  async function performSaveEdits() {
    if (!indent) return;
    const patch = Object.values(editRows).map((r) => ({
      indentItemId: r.indentItemId,
      purpose: r.purpose,
      requiredQuantity: Number(r.requiredQuantity),
      requiredDate: r.requiredDate,
      unit: r.unit,
    }));
    const res = await fetch(`/api/indents/${indent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save changes.");
    } else {
      setIndent(data);
      setEditing(false);
    }
    setConfirm(null);
  }

  async function performSubmit() {
    if (!indent) return;
    const res = await fetch(`/api/indents/${indent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Submitted" }),
    });
    const data = await res.json();
    if (res.ok) setIndent(data);
    setConfirm(null);
  }

  async function performDeleteIndent() {
    if (!indent) return;
    await fetch(`/api/indents/${indent.id}`, { method: "DELETE" });
    router.push("/indents");
  }

  async function performDeleteItem(indentItemId: string) {
    if (!indent) return;
    const res = await fetch(`/api/indents/${indent.id}/items/${indentItemId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setIndent(data);
    else setError(data.error || "Failed to delete Item.");
    setConfirm(null);
  }

  async function handleExport() {
    const res = await fetch("/api/indents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "selected", ids: [id] }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${indent?.indentNumber || "indent"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div style={{ padding: 28, color: "var(--ink-soft)" }}>Loading…</div>;
  if (notFound || !indent) return <div style={{ padding: 28 }}>Indent not found.</div>;

  // SRS §28/§7.7: Indent-level attributes are immutable after creation.
  // SRS §29/§39: item field editing (before/after submission) is TBD;
  // this demo permits editing purpose/qty/date/unit only while in Draft.
  const canEditItems = indent.status === "Draft";
  const canSubmit = indent.status === "Draft";
  const canDeleteIndent = indent.status === "Draft"; // TBD — exact allowed statuses/roles unconfirmed (SRS §31)
  const canDeleteItem = indent.status === "Draft" && indent.items.length > 1;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }} className="print-area">
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/indents")}>
          ← Back to Indents
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExport}>Export to Excel</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          {canEditItems && !editing && (
            <button className="btn btn-secondary" onClick={startEditing}>Edit Items</button>
          )}
          {canSubmit && (
            <button className="btn btn-primary" onClick={() => setConfirm({ type: "submit" })}>Submit</button>
          )}
          {canDeleteIndent && (
            <button className="btn btn-danger" onClick={() => setConfirm({ type: "deleteIndent" })}>Delete Indent</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "14px 0 18px" }}>
        <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{indent.indentNumber}</h1>
        <StatusBadge status={indent.status} />
      </div>

      {error && (
        <div className="callout no-print" style={{ marginBottom: 14, borderLeftColor: "var(--red)", background: "var(--red-soft)", color: "var(--red)" }}>
          {error}
        </div>
      )}

      <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Indent Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <Field label="Indent Type" value={indent.indentType} />
          <Field label="Department" value={indent.department} />
          <Field label="Indent Date" value={indent.indentDate} />
          <Field label="Time" value={indent.time} />
          <Field label="Created By" value={indent.createdBy} />
          <Field label="Created At" value={new Date(indent.createdAt).toLocaleString()} />
          <Field label="Last Updated" value={new Date(indent.updatedAt).toLocaleString()} />
          <Field label="Item Count" value={String(indent.items.length)} />
        </div>
        {indent.remark && (
          <div style={{ marginTop: 14 }}>
            <div className="field-label">Remark / Note</div>
            <div style={{ fontSize: 13.5 }}>{indent.remark}</div>
          </div>
        )}
        <div className="callout no-print" style={{ marginTop: 14 }}>
          Indent-level fields are immutable after creation, per confirmed business rule BR-06.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Associated Items ({indent.items.length})</div>
        {editing && (
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setConfirm({ type: "saveEdits" })}>Save Changes</button>
          </div>
        )}
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Specification</th>
              <th>Department</th>
              <th>Purpose</th>
              <th>Current Stock</th>
              <th>Required Qty</th>
              <th>Unit</th>
              <th>Required Date</th>
              {(editing || canDeleteItem) && <th className="no-print" style={{ width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {indent.items.map((it: IndentItem) => {
              const row = editRows[it.indentItemId];
              return (
                <tr key={it.indentItemId} style={{ cursor: "default" }}>
                  <td className="mono">{it.itemCode}</td>
                  <td>{it.itemName}</td>
                  <td>{it.specification || "—"}</td>
                  <td>{it.department}</td>
                  <td>
                    {editing ? (
                      <input
                        className="input"
                        value={row.purpose}
                        onChange={(e) => setEditRows((p) => ({ ...p, [it.indentItemId]: { ...row, purpose: e.target.value } }))}
                      />
                    ) : (
                      it.purpose || "—"
                    )}
                  </td>
                  <td>{it.currentStockAtEntry}</td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        className="input"
                        value={row.requiredQuantity}
                        onChange={(e) => setEditRows((p) => ({ ...p, [it.indentItemId]: { ...row, requiredQuantity: e.target.value } }))}
                      />
                    ) : (
                      it.requiredQuantity
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        className="input"
                        value={row.unit}
                        onChange={(e) => setEditRows((p) => ({ ...p, [it.indentItemId]: { ...row, unit: e.target.value } }))}
                      />
                    ) : (
                      it.unit
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="date"
                        className="input"
                        value={row.requiredDate}
                        onChange={(e) => setEditRows((p) => ({ ...p, [it.indentItemId]: { ...row, requiredDate: e.target.value } }))}
                      />
                    ) : (
                      it.requiredDate
                    )}
                  </td>
                  {(editing || canDeleteItem) && (
                    <td className="no-print">
                      {!editing && canDeleteItem && (
                        <button
                          className="btn btn-ghost"
                          style={{ color: "var(--red)", padding: "4px 8px" }}
                          onClick={() => setConfirm({ type: "deleteItem", indentItemId: it.indentItemId, itemName: it.itemName })}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm?.type === "submit"}
        title="Submit Indent"
        message="Are you sure you want to submit this Indent? It will be sent for higher-authority approval."
        confirmLabel="Submit"
        onConfirm={performSubmit}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "saveEdits"}
        title="Update Indent"
        message="Are you sure you want to update this Indent?"
        confirmLabel="Update"
        onConfirm={performSaveEdits}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "deleteIndent"}
        title="Delete Indent"
        message={`Are you sure you want to delete Indent ${indent.indentNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={performDeleteIndent}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "deleteItem"}
        title="Delete Item"
        message={confirm?.type === "deleteItem" ? `Are you sure you want to delete "${confirm.itemName}" from this Indent?` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirm?.type === "deleteItem" && performDeleteItem(confirm.indentItemId)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}
