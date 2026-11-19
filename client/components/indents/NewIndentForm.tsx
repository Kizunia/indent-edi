"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ApiError, apiFetch, toApiError } from "@/lib/client/api";
import type { IndentDetail, Meta, StockEntry } from "@/lib/services/types";
import { displayQuantity, displayTime } from "@/lib/shared/format";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorDialog from "@/components/ui/ErrorDialog";
import Field, { describedBy } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import CurrentItemList from "./CurrentItemList";
import { diffStock, toCreateLine, type DraftLine, type StockChange } from "./draft";
import ItemEntryForm from "./ItemEntryForm";

const NUMBER_HINT = "Final number is confirmed when you save.";

interface Pending {
  submit: boolean;
  changes: StockChange[];
  current: StockEntry[];
}

// Create Indent (FR-01..FR-10, UC-01..UC-03, docs/spec/ui.md section 3). The server
// assigns number, date, time, creator and status; this form only sends the choices.
export default function NewIndentForm({
  meta,
  expectedNumber,
  indentDate,
  indentTime,
  createdBy,
  defaultDepartmentId,
  canSubmit,
  allowDuplicates,
}: {
  meta: Meta;
  expectedNumber: string;
  indentDate: string;
  indentTime: string;
  createdBy: string;
  defaultDepartmentId: number | null;
  canSubmit: boolean;
  allowDuplicates: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [typeId, setTypeId] = useState("");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ? String(defaultDepartmentId) : "");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<IndentDetail | null>(null);
  const [discard, setDiscard] = useState(false);
  const [removedNote, setRemovedNote] = useState("");

  // Unsaved-changes guard for reload/close (the Cancel button asks separately).
  useEffect(() => {
    if (lines.length === 0 || saved) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [lines.length, saved]);

  function headerErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!typeId) e.type = "Select an indent type.";
    if (!departmentId) e.department = "Select a department.";
    return e;
  }

  async function begin(submit: boolean) {
    const errs = headerErrors();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (lines.length === 0) {
      setError(new ApiError("INDENT_EMPTY", "An Indent cannot be saved without at least one Item."));
      return;
    }
    // DEC-013: re-read stock before the confirmation and tell the user what changed.
    const ids = [...new Set(lines.flatMap((l) => (l.itemId !== undefined ? [l.itemId] : [])))];
    let current: StockEntry[] = [];
    if (ids.length > 0) {
      setBusy(true);
      try {
        current = (await apiFetch<{ stock: StockEntry[] }>(`/api/stock?itemIds=${ids.join(",")}`)).stock;
      } catch (err) {
        setError(toApiError(err));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setPending({ submit, current, changes: diffStock(lines, current) });
  }

  function updateStockValues() {
    if (!pending) return;
    const byId = new Map(pending.current.map((c) => [c.itemId, c.quantity]));
    setLines((ls) => ls.map((l) => (l.itemId !== undefined && byId.has(l.itemId) ? { ...l, stock: byId.get(l.itemId) ?? null } : l)));
    setPending({ ...pending, changes: [] });
  }

  async function confirmSave() {
    if (!pending) return;
    setBusy(true);
    try {
      const indent = await apiFetch<IndentDetail>("/api/indents", {
        method: "POST",
        json: {
          indentTypeId: Number(typeId),
          departmentId: Number(departmentId),
          ...(remark.trim() ? { remark: remark.trim() } : {}),
          ...(pending.submit ? { submit: true } : {}),
          items: lines.map(toCreateLine),
        },
      });
      setPending(null);
      setSaved(indent);
    } catch (err) {
      setPending(null);
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const submit = pending?.submit ?? false;
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">
      <h1 className="text-xl font-bold">New Indent</h1>

      <section className="panel p-4" aria-labelledby={id("hdr")}>
        <h2 id={id("hdr")} className="mb-3 text-sm font-bold">Indent information</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field id={id("number")} label="Indent Number" hint={NUMBER_HINT}>
            <input id={id("number")} className="input mono" readOnly value={`Expected ${expectedNumber}`} aria-describedby={describedBy(id("number"), undefined, NUMBER_HINT)} />
          </Field>
          <Field id={id("type")} label="Indent Type" required error={fieldErrors.type}>
            <select id={id("type")} className="input" value={typeId} aria-invalid={Boolean(fieldErrors.type)} aria-describedby={describedBy(id("type"), fieldErrors.type)} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">Select…</option>
              {meta.indentTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field id={id("dept")} label="Department" required error={fieldErrors.department}>
            <select id={id("dept")} className="input" value={departmentId} aria-invalid={Boolean(fieldErrors.department)} aria-describedby={describedBy(id("dept"), fieldErrors.department)} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Select…</option>
              {meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field id={id("date")} label="Date">
            <input id={id("date")} className="input" readOnly value={indentDate} />
          </Field>
          <Field id={id("time")} label="Time">
            <input id={id("time")} className="input" readOnly value={displayTime(indentTime)} />
          </Field>
          <Field id={id("by")} label="Created By">
            <input id={id("by")} className="input" readOnly value={createdBy} />
          </Field>
          <Field id={id("remark")} label="Remark" className="sm:col-span-2 lg:col-span-3">
            <textarea id={id("remark")} className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Field>
        </div>
      </section>

      <ItemEntryForm
        meta={meta}
        headerDepartmentId={departmentId ? Number(departmentId) : null}
        minDate={indentDate}
        existingItemIds={lines.flatMap((l) => (l.itemId !== undefined ? [l.itemId] : []))}
        allowDuplicates={allowDuplicates}
        onAdd={(line) => {
          setLines((ls) => [...ls, line]);
          setRemovedNote(`${line.itemName} added.`);
        }}
      />

      <section aria-labelledby={id("list")} className="space-y-2">
        <h2 id={id("list")} className="text-sm font-bold">Current item list ({lines.length})</h2>
        <p className="sr-only" role="status" aria-live="polite">{removedNote}</p>
        <CurrentItemList
          lines={lines}
          meta={meta}
          minDate={indentDate}
          onRemove={(key) => {
            const gone = lines.find((l) => l.key === key);
            setLines((ls) => ls.filter((l) => l.key !== key));
            setRemovedNote(`${gone?.itemName ?? "Item"} removed.`);
          }}
          onChange={(key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || lines.length === 0} onClick={() => begin(false)}>
          Save Draft
        </button>
        {canSubmit && (
          <button type="button" className="btn btn-secondary" disabled={busy || lines.length === 0} onClick={() => begin(true)}>
            Save &amp; Submit
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => (lines.length > 0 ? setDiscard(true) : router.push("/indents"))}>
          Cancel
        </button>
        {lines.length === 0 && <p className="text-[12.5px] text-[var(--ink-soft)]">Add at least one item to save.</p>}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={submit ? "Save and submit" : "Save indent"}
        confirmLabel={submit ? "Save and submit" : "Save"}
        busy={busy}
        onConfirm={confirmSave}
        onCancel={() => setPending(null)}
        extra={
          pending && pending.changes.length > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={updateStockValues}>
              Update stock values
            </button>
          ) : undefined
        }
      >
        <p>
          {submit
            ? "Are you sure you want to save and submit this Indent? It will be sent for approval."
            : "Are you sure you want to save this Indent?"}
        </p>
        {pending && pending.changes.length > 0 && (
          <div className="callout mt-3" role="status">
            <p className="font-semibold">Stock changed since you added these items:</p>
            <ul className="mt-1 list-disc pl-5">
              {pending.changes.map((c, i) => (
                <li key={i}>
                  {c.itemName}: was {displayQuantity(c.was)}, now {displayQuantity(c.now)}
                </li>
              ))}
            </ul>
            <p className="mt-1">You can still save. The saved indent records the current stock.</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={discard}
        title="Discard this indent?"
        confirmLabel="Discard"
        danger
        onConfirm={() => router.push("/indents")}
        onCancel={() => setDiscard(false)}
      >
        Entered items will be lost.
      </ConfirmDialog>

      <ErrorDialog error={error} onClose={() => setError(null)} />

      <Modal open={saved !== null} onClose={() => saved && router.push(`/indents/${saved.indentNumber}`)} labelledBy={id("done")}>
        {saved && (
          <div className="p-5">
            <h2 id={id("done")} className="text-base font-bold">{saved.status.code === "SUBMITTED" ? "Indent submitted" : "Indent saved"}</h2>
            <p className="mt-2 text-sm">
              Indent Number: <strong className="mono">{saved.indentNumber}</strong>
            </p>
            {saved.indentNumber !== expectedNumber && (
              <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">This differs from the number shown earlier because another indent was saved first.</p>
            )}
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn btn-primary" autoFocus onClick={() => router.push(`/indents/${saved.indentNumber}`)}>
                View indent
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
