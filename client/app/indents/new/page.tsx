"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemEntryForm, { AddedItem } from "@/components/ItemEntryForm";
import CurrentItemList from "@/components/CurrentItemList";
import ConfirmDialog from "@/components/ConfirmDialog";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function NewIndentPage() {
  const router = useRouter();
  const [meta, setMeta] = useState<{ departments: { id: string; name: string }[]; indentTypes: { id: string; name: string }[] }>({
    departments: [],
    indentTypes: [],
  });

  const [indentType, setIndentType] = useState("");
  const [indentDate, setIndentDate] = useState(todayStr());
  const [time, setTime] = useState(nowStr());
  const [department, setDepartment] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<AddedItem[]>([]);

  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<"draft" | "submit" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        setMeta(d);
        if (d.departments[0]) setDepartment(d.departments[0].name);
        if (d.indentTypes[0]) setIndentType(d.indentTypes[0].name);
      });
  }, []);

  function validateHeader(): string | null {
    if (!indentType) return "Indent Type is required.";
    if (!indentDate) return "Indent Date is required.";
    if (!department) return "Department is required.";
    if (!createdBy.trim()) return "Created By is required.";
    // FR-08 / SRS §25: an Indent cannot be saved without at least one Item.
    if (items.length === 0) return "Add at least one Item before saving.";
    return null;
  }

  function requestSave(action: "draft" | "submit") {
    const err = validateHeader();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setConfirmAction(action);
  }

  async function performSave() {
    if (!confirmAction) return;
    setSaving(true);
    try {
      const res = await fetch("/api/indents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indentType,
          indentDate,
          time,
          department,
          createdBy,
          remark,
          status: confirmAction === "draft" ? "Draft" : "Submitted",
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Indent.");
      router.push(`/indents/${data.id}`);
    } catch (e: any) {
      setError(e.message);
      setConfirmAction(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>New Indent</h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 0" }}>
          Fill in the Indent details, add Items, then save as Draft or submit for approval.
        </p>
      </div>

      <div className="panel" style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label className="field-label">Indent Number</label>
            <input className="input mono" disabled value="Generated automatically on save" />
          </div>
          <div>
            <label className="field-label field-required">Indent Type</label>
            <select className="input" value={indentType} onChange={(e) => setIndentType(e.target.value)}>
              {meta.indentTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label field-required">Department</label>
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {meta.departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label className="field-label field-required">Indent Date</label>
            <input type="date" className="input" value={indentDate} onChange={(e) => setIndentDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Time</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="field-label field-required">Created By</label>
            <input className="input" placeholder="Your name" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="field-label">Remark / Note</label>
          <textarea className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <ItemEntryForm
          defaultDepartment={department}
          departments={meta.departments}
          onAdd={(item) => setItems((prev) => [...prev, item])}
        />
      </div>

      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
        Current Indent Item List {items.length > 0 && `(${items.length})`}
      </div>
      <div style={{ marginBottom: 18 }}>
        <CurrentItemList
          items={items}
          onRemove={(idx) => setItems((prev) => prev.filter((_, i) => i !== idx))}
        />
      </div>

      {error && (
        <div className="callout" style={{ marginBottom: 14, borderLeftColor: "var(--red)", background: "var(--red-soft)", color: "var(--red)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={() => router.push("/indents")}>
          Cancel
        </button>
        <button className="btn btn-secondary" onClick={() => requestSave("draft")}>
          Save as Draft
        </button>
        <button className="btn btn-primary" onClick={() => requestSave("submit")}>
          Save & Submit
        </button>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "draft" ? "Save Indent" : "Submit Indent"}
        message={
          confirmAction === "draft"
            ? "Are you sure you want to save this Indent as a Draft?"
            : "Are you sure you want to submit this Indent? It will be sent for higher-authority approval."
        }
        confirmLabel={saving ? "Saving…" : confirmAction === "draft" ? "Save" : "Submit"}
        onConfirm={performSave}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
