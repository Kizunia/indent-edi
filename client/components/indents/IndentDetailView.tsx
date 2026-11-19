"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ApiError, apiDownload, apiFetch, saveBlob, toApiError } from "@/lib/client/api";
import type { IndentDetail, Line, Meta, StockEntry } from "@/lib/services/types";
import { displayQuantity } from "@/lib/shared/format";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorDialog from "@/components/ui/ErrorDialog";
import Field from "@/components/ui/Field";
import CurrentItemList from "./CurrentItemList";
import { diffStock, toCreateLine, type DraftLine, type StockChange } from "./draft";
import ItemEntryForm from "./ItemEntryForm";
import ItemGrid from "./ItemGrid";

type Confirm =
  | { kind: "submit"; changes: StockChange[] }
  | { kind: "delete" }
  | { kind: "remark" }
  | { kind: "line"; line: Line; patch: Record<string, string | number> }
  | { kind: "remove"; line: Line }
  | { kind: "add"; line: DraftLine; resolve: (ok: boolean) => void };

const toDraftLine = (l: Line): DraftLine => ({
  key: String(l.id),
  itemId: l.itemId,
  itemCode: l.itemCode,
  itemName: l.itemName,
  specification: l.specification,
  drawingNumber: l.drawingNumber,
  departmentId: l.department.id,
  purpose: l.purpose ?? "",
  requiredQuantity: l.requiredQuantity,
  requiredUnitId: l.unit.id,
  requiredDate: l.requiredDate,
  stock: l.currentStock,
});

const CONFIRM_TEXT: Record<Confirm["kind"], { title: string; text: string; label: string; danger?: boolean }> = {
  submit: { title: "Submit indent", text: "Are you sure you want to submit this Indent?", label: "Submit" },
  delete: { title: "Delete indent", text: "Are you sure you want to delete this Indent?", label: "Delete", danger: true },
  remark: { title: "Update indent", text: "Are you sure you want to update this Indent?", label: "Update" },
  line: { title: "Update indent", text: "Are you sure you want to update this Indent?", label: "Update" },
  add: { title: "Update indent", text: "Are you sure you want to update this Indent?", label: "Update" },
  remove: { title: "Delete item", text: "Are you sure you want to delete this Item?", label: "Delete", danger: true },
};

// Actions and Draft editing of one indent (FR-14, FR-16..FR-20, UC-04, UC-05, UC-08).
// Every control comes from the server's `permissions` flags; the server still enforces them.
export default function IndentDetailView({
  indent,
  meta,
  canExport,
  allowDuplicates,
}: {
  indent: IndentDetail;
  meta: Meta;
  canExport: boolean;
  allowDuplicates: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const { permissions: p } = indent;
  const editable = p.canEdit;
  const [editing, setEditing] = useState(false);
  const [remark, setRemark] = useState(indent.remark ?? "");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [stockNotice, setStockNotice] = useState<StockChange[]>([]);

  const draftLines = indent.items.map(toDraftLine);
  const stockLines = indent.items.map((l) => ({ itemId: l.itemId, itemName: l.itemName, stock: l.currentStock }));
  const itemIds = indent.items.map((l) => l.itemId);

  // DEC-013 point 6: tell the user, without blocking, when stock moved since the Draft was saved.
  const idsKey = itemIds.join(",");
  const stockKey = indent.items.map((l) => l.currentStock ?? "-").join(",");
  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    apiFetch<{ stock: StockEntry[] }>(`/api/stock?itemIds=${idsKey}`, { signal: controller.signal })
      .then((r) => setStockNotice(diffStock(stockLines, r.stock)))
      .catch(() => {}); // the notice is optional; failures stay silent here
    return () => controller.abort();
    // stockLines is derived from the same props as idsKey/stockKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, idsKey, stockKey]);

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    try {
      await action();
      setConfirm(null);
      after?.();
      router.refresh();
    } catch (err) {
      setConfirm(null);
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/indents/${encodeURIComponent(indent.indentNumber)}`;

  async function beginSubmit() {
    setBusy(true);
    try {
      const current = (await apiFetch<{ stock: StockEntry[] }>(`/api/stock?itemIds=${idsKey}`)).stock;
      setConfirm({ kind: "submit", changes: diffStock(stockLines, current) });
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function onConfirm() {
    if (!confirm) return;
    switch (confirm.kind) {
      case "submit":
        return run(() => apiFetch(`${base}/submit`, { method: "POST", json: { version: indent.version } }));
      case "delete":
        return run(() => apiFetch(`${base}?version=${indent.version}`, { method: "DELETE" }), () => router.push("/indents"));
      case "remark":
        return run(() => apiFetch(base, { method: "PATCH", json: { version: indent.version, remark } }));
      case "line":
        return run(() => apiFetch(`${base}/items/${confirm.line.id}`, { method: "PATCH", json: { version: indent.version, ...confirm.patch } }));
      case "remove":
        return run(() => apiFetch(`${base}/items/${confirm.line.id}?version=${indent.version}`, { method: "DELETE" }));
      case "add":
        return run(
          async () => {
            await apiFetch(`${base}/items`, { method: "POST", json: { version: indent.version, line: toCreateLine(confirm.line) } });
            confirm.resolve(true);
          }
        );
    }
  }

  function cancelConfirm() {
    if (confirm?.kind === "add") confirm.resolve(false); // keep what the user typed
    setConfirm(null);
  }

  async function exportOne() {
    setBusy(true);
    try {
      const { blob, filename } = await apiDownload("/api/indents/export", { method: "POST", json: { indentNumbers: [indent.indentNumber] } });
      saveBlob(blob, filename);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function lineChanged(key: string, patch: Partial<DraftLine>) {
    const line = indent.items.find((l) => String(l.id) === key);
    if (!line) return;
    const changes: Record<string, string | number> = {};
    if (patch.purpose !== undefined && patch.purpose !== (line.purpose ?? "")) changes.purpose = patch.purpose;
    if (patch.requiredQuantity !== undefined && Number(patch.requiredQuantity) !== Number(line.requiredQuantity)) changes.requiredQuantity = patch.requiredQuantity;
    if (patch.requiredDate !== undefined && patch.requiredDate !== line.requiredDate) changes.requiredDate = patch.requiredDate;
    if (patch.requiredUnitId !== undefined && patch.requiredUnitId !== line.unit.id) changes.requiredUnitId = patch.requiredUnitId;
    if (patch.departmentId !== undefined && patch.departmentId !== line.department.id) changes.departmentId = patch.departmentId;
    if (Object.keys(changes).length > 0) setConfirm({ kind: "line", line, patch: changes });
  }

  const text = confirm ? CONFIRM_TEXT[confirm.kind] : null;
  const submitChanges = confirm?.kind === "submit" ? confirm.changes : [];
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        {editable && (
          <button type="button" className="btn btn-secondary" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? "Done editing" : "Edit"}
          </button>
        )}
        {p.canSubmit && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={beginSubmit}>
            Submit
          </button>
        )}
        {p.canDelete && (
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirm({ kind: "delete" })}>
            Delete
          </button>
        )}
        {p.canPrint && (
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print
          </button>
        )}
        {canExport && (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={exportOne}>
            Export
          </button>
        )}
      </div>

      {editable && stockNotice.length > 0 && (
        <div className="callout no-print" role="status">
          <p className="font-semibold">Stock changed since this draft was saved:</p>
          <ul className="mt-1 list-disc pl-5">
            {stockNotice.map((c, i) => (
              <li key={i}>
                {c.itemName}: was {displayQuantity(c.was)}, now {displayQuantity(c.now)}
              </li>
            ))}
          </ul>
          <p className="mt-1">This does not block you. Stock values are refreshed when you submit.</p>
        </div>
      )}

      {editing && editable && (
        <section className="panel no-print p-4" aria-labelledby={`${uid}-remark-h`}>
          <h2 id={`${uid}-remark-h`} className="mb-2 text-sm font-bold">Remark</h2>
          <Field id={`${uid}-remark`} label="Remark">
            <textarea id={`${uid}-remark`} className="input" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Field>
          <button
            type="button"
            className="btn btn-primary mt-2"
            disabled={busy || remark.trim() === (indent.remark ?? "")}
            onClick={() => setConfirm({ kind: "remark" })}
          >
            Update remark
          </button>
        </section>
      )}

      <section aria-labelledby={`${uid}-items`} className="space-y-2">
        <h2 id={`${uid}-items`} className="text-sm font-bold">Items ({indent.items.length})</h2>
        {editing && editable ? (
          <>
            <CurrentItemList
              lines={draftLines}
              meta={meta}
              minDate={indent.indentDate}
              canRemove={indent.items.length > 1}
              onChange={lineChanged}
              onRemove={(key) => {
                const line = indent.items.find((l) => String(l.id) === key);
                if (line) setConfirm({ kind: "remove", line });
              }}
            />
            <ItemEntryForm
              meta={meta}
              headerDepartmentId={indent.department?.id ?? null}
              minDate={indent.indentDate}
              existingItemIds={itemIds}
              allowDuplicates={allowDuplicates}
              busy={busy}
              addLabel="Add Item to indent"
              onAdd={(line) => new Promise<boolean>((resolve) => setConfirm({ kind: "add", line, resolve }))}
            />
          </>
        ) : (
          <div className="panel print-area">
            <ItemGrid lines={indent.items} caption={`Items of ${indent.indentNumber}`} />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={text?.title ?? ""}
        confirmLabel={text?.label ?? ""}
        danger={text?.danger}
        busy={busy}
        onConfirm={onConfirm}
        onCancel={cancelConfirm}
      >
        <p>{text?.text}</p>
        {submitChanges.length > 0 && (
          <div className="callout mt-3" role="status">
            <p className="font-semibold">Stock changed since this draft was saved:</p>
            <ul className="mt-1 list-disc pl-5">
              {submitChanges.map((c, i) => (
                <li key={i}>
                  {c.itemName}: was {displayQuantity(c.was)}, now {displayQuantity(c.now)}
                </li>
              ))}
            </ul>
            <p className="mt-1">Submitting records the current stock.</p>
          </div>
        )}
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
