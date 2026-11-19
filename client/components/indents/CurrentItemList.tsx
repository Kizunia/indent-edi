"use client";

import { useId, useState } from "react";
import type { Meta } from "@/lib/services/types";
import { isValidCalendarDate } from "@/lib/shared/datetime";
import { NOT_AVAILABLE, displayQuantity, isPositiveQuantity } from "@/lib/shared/format";
import type { DraftLine } from "./draft";

type Edit = { departmentId: string; purpose: string; quantity: string; unitId: string; date: string };

// The "Current Item List" of an indent being created (SRS 8.3). Removing a line
// before saving needs no confirmation (DEC-012); lines can be edited in place.
export default function CurrentItemList({
  lines,
  meta,
  minDate,
  onRemove,
  onChange,
  canRemove = true,
}: {
  lines: DraftLine[];
  meta: Pick<Meta, "departments" | "units">;
  minDate: string;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Partial<DraftLine>) => void;
  /** false when only one line is left: an indent keeps at least one (BR-01). */
  canRemove?: boolean;
}) {
  const uid = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unitName = (id: number) => meta.units.find((u) => u.id === id)?.name ?? "";
  const deptName = (id: number) => meta.departments.find((d) => d.id === id)?.name ?? "";

  function start(l: DraftLine) {
    setEditing(l.key);
    setError(null);
    setEdit({
      departmentId: String(l.departmentId),
      purpose: l.purpose,
      quantity: l.requiredQuantity,
      unitId: String(l.requiredUnitId),
      date: l.requiredDate,
    });
  }

  function save(l: DraftLine) {
    if (!edit) return;
    if (!isPositiveQuantity(edit.quantity.trim())) return setError("Enter a quantity greater than 0 (up to 4 decimal places).");
    if (!isValidCalendarDate(edit.date) || edit.date < minDate) return setError("Required date cannot be before the indent date.");
    onChange(l.key, {
      departmentId: Number(edit.departmentId),
      purpose: edit.purpose,
      requiredQuantity: edit.quantity.trim(),
      requiredUnitId: Number(edit.unitId),
      requiredDate: edit.date,
    });
    setEditing(null);
    setEdit(null);
  }

  if (lines.length === 0) {
    return (
      <div className="panel p-6 text-center text-[var(--ink-soft)]">
        No items yet. Add at least one item to save this indent.
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="table-scroll">
        <table className="data-table">
          <caption className="sr-only">Items in this indent</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Item Code</th>
              <th scope="col">Item Name</th>
              <th scope="col">Department</th>
              <th scope="col">Purpose</th>
              <th scope="col" className="text-right">Current Stock</th>
              <th scope="col" className="text-right">Required Qty</th>
              <th scope="col">Unit</th>
              <th scope="col">Required Date</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) =>
              editing === l.key && edit ? (
                <tr key={l.key}>
                  <td>{i + 1}</td>
                  <td className="mono">{l.itemCode ?? "On save"}</td>
                  <td>{l.itemName}</td>
                  <td>
                    <select aria-label={`Department for ${l.itemName}`} className="input" value={edit.departmentId} onChange={(e) => setEdit({ ...edit, departmentId: e.target.value })}>
                      {meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input aria-label={`Purpose for ${l.itemName}`} className="input" value={edit.purpose} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })} />
                  </td>
                  <td className="text-right">{displayQuantity(l.stock)}</td>
                  <td>
                    <input aria-label={`Quantity for ${l.itemName}`} className="input text-right" inputMode="decimal" value={edit.quantity} onChange={(e) => setEdit({ ...edit, quantity: e.target.value })} />
                  </td>
                  <td>
                    <select aria-label={`Unit for ${l.itemName}`} className="input" value={edit.unitId} onChange={(e) => setEdit({ ...edit, unitId: e.target.value })}>
                      {meta.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input aria-label={`Required date for ${l.itemName}`} className="input" type="date" min={minDate} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-primary px-2 py-1" onClick={() => save(l)}>Done</button>
                      <button type="button" className="btn btn-ghost px-2 py-1" onClick={() => { setEditing(null); setEdit(null); setError(null); }}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={l.key}>
                  <td>{i + 1}</td>
                  <td className="mono">{l.itemCode ?? "On save"}</td>
                  <td>{l.itemName}</td>
                  <td>{deptName(l.departmentId)}</td>
                  <td>{l.purpose || "—"}</td>
                  <td className="text-right">{l.itemCode === null ? NOT_AVAILABLE : displayQuantity(l.stock)}</td>
                  <td className="text-right">{displayQuantity(l.requiredQuantity)}</td>
                  <td>{unitName(l.requiredUnitId)}</td>
                  <td>{l.requiredDate}</td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-ghost px-2 py-1" onClick={() => start(l)}>
                        Edit<span className="sr-only"> {l.itemName}</span>
                      </button>
                      {canRemove && (
                        <button type="button" className="btn btn-danger px-2 py-1" onClick={() => onRemove(l.key)}>
                          Remove<span className="sr-only"> {l.itemName}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <p id={`${uid}-err`} role="alert" className="px-4 py-2 text-[12.5px] text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}
