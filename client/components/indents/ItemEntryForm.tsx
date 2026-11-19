"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch, isAborted } from "@/lib/client/api";
import type { ItemOption, Meta, StockEntry } from "@/lib/services/types";
import { isValidCalendarDate } from "@/lib/shared/datetime";
import { NOT_AVAILABLE, displayQuantity, isPositiveQuantity } from "@/lib/shared/format";
import Field, { describedBy } from "@/components/ui/Field";
import { newLineKey, type DraftLine } from "./draft";

type StockState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quantity: string | null }
  | { status: "error" };

const DUPLICATE_MESSAGE = "This item is already in the indent. Edit its quantity instead.";

// Item entry (FR-04..FR-07, SRS 8): search an existing item or enter a new one,
// then Department, Purpose, Quantity, Unit, Required Date. Stock is shown
// read-only and re-read by the server on save.
export default function ItemEntryForm({
  meta,
  headerDepartmentId,
  minDate,
  existingItemIds,
  allowDuplicates,
  addLabel = "Add Item",
  busy = false,
  onAdd,
}: {
  meta: Pick<Meta, "departments" | "units">;
  headerDepartmentId: number | null;
  /** Required Date may not be before this (the indent date). */
  minDate: string;
  existingItemIds: number[];
  allowDuplicates: boolean;
  addLabel?: string;
  busy?: boolean;
  /** Return false to keep the entered values (e.g. the user cancelled a confirmation). */
  onAdd: (line: DraftLine) => boolean | void | Promise<boolean | void>;
}) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const listId = id("listbox");

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ItemOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [item, setItem] = useState<ItemOption | null>(null);
  const [stock, setStock] = useState<StockState>({ status: "idle" });
  const [newName, setNewName] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [newDrawing, setNewDrawing] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [departmentId, setDepartmentId] = useState(headerDepartmentId ? String(headerDepartmentId) : "");
  const [purpose, setPurpose] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitId, setUnitId] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchAbort = useRef<AbortController>(undefined);
  const stockAbort = useRef<AbortController>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);

  // Cancel in-flight work on unmount; close the list when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
      stockAbort.current?.abort();
    };
  }, []);

  const effectiveDepartment = departmentId || (headerDepartmentId ? String(headerDepartmentId) : "");

  function runSearch(q: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      searchAbort.current?.abort(); // a slow older answer must never overwrite a newer one
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearching(true);
      setSearchError(false);
      try {
        const res = await apiFetch<{ items: ItemOption[]; hasMore: boolean }>(`/api/items?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        setOptions(res.items);
        setHasMore(res.hasMore);
        setActive(-1);
        setSearching(false);
      } catch (err) {
        if (isAborted(err)) return; // superseded by a newer search
        setSearching(false);
        setSearchError(true);
        setOptions([]);
      }
    }, 250);
  }

  async function loadStock(itemId: number) {
    stockAbort.current?.abort();
    const controller = new AbortController();
    stockAbort.current = controller;
    setStock({ status: "loading" });
    try {
      const res = await apiFetch<{ stock: StockEntry[] }>(`/api/stock?itemIds=${itemId}`, { signal: controller.signal });
      setStock({ status: "ok", quantity: res.stock[0]?.quantity ?? null });
    } catch (err) {
      if (!isAborted(err)) setStock({ status: "error" }); // never silently treated as 0
    }
  }

  function pick(option: ItemOption) {
    setItem(option);
    setQuery(`${option.itemCode} · ${option.itemName}`);
    setOpen(false);
    setUnitId(option.defaultUnit ? String(option.defaultUnit.id) : unitId);
    setErrors((e) => ({ ...e, item: "" }));
    void loadStock(option.id);
  }

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  function reset() {
    setQuery("");
    setItem(null);
    setStock({ status: "idle" });
    setOptions([]);
    setNewName("");
    setNewSpec("");
    setNewDrawing("");
    setNewUnitId("");
    setPurpose("");
    setQuantity("");
    setUnitId("");
    setRequiredDate("");
    setErrors({});
  }

  async function add() {
    const next: Record<string, string> = {};
    if (mode === "existing") {
      if (!item) next.item = "Select an item from the list.";
      else if (!allowDuplicates && existingItemIds.includes(item.id)) next.item = DUPLICATE_MESSAGE;
    } else {
      if (!newName.trim()) next.newName = "Item name is required.";
      if (!newUnitId) next.newUnit = "Select a unit.";
    }
    if (!effectiveDepartment) next.department = "Select a department.";
    if (!isPositiveQuantity(quantity.trim())) next.quantity = "Enter a quantity greater than 0 (up to 4 decimal places).";
    if (!unitId && mode === "existing") next.unit = "Select a unit.";
    const lineUnit = mode === "new" ? newUnitId : unitId;
    if (!lineUnit) next.unit = "Select a unit.";
    if (!requiredDate) next.requiredDate = "Required date is required.";
    else if (!isValidCalendarDate(requiredDate)) next.requiredDate = "Enter a valid required date.";
    else if (requiredDate < minDate) next.requiredDate = "Required date cannot be before the indent date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const stockShown = mode === "existing" && stock.status === "ok" ? stock.quantity : null;
    const line: DraftLine =
      mode === "existing" && item
        ? {
            key: newLineKey(),
            itemId: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            specification: item.specification,
            drawingNumber: item.drawingNumber,
            departmentId: Number(effectiveDepartment),
            purpose,
            requiredQuantity: quantity.trim(),
            requiredUnitId: Number(lineUnit),
            requiredDate,
            stock: stockShown,
          }
        : {
            key: newLineKey(),
            newItem: {
              itemName: newName.trim(),
              ...(newSpec.trim() ? { specification: newSpec.trim() } : {}),
              ...(newDrawing.trim() ? { drawingNumber: newDrawing.trim() } : {}),
              defaultUnitId: Number(newUnitId),
            },
            itemCode: null,
            itemName: newName.trim(),
            specification: newSpec.trim() || null,
            drawingNumber: newDrawing.trim() || null,
            departmentId: Number(effectiveDepartment),
            purpose,
            requiredQuantity: quantity.trim(),
            requiredUnitId: Number(lineUnit),
            requiredDate,
            stock: null, // new items have no stock row (DEC-013)
          };
    if ((await onAdd(line)) !== false) reset();
  }

  const stockText =
    mode === "new"
      ? NOT_AVAILABLE
      : stock.status === "idle"
        ? "—"
        : stock.status === "loading"
          ? "Checking…"
          : stock.status === "error"
            ? `${NOT_AVAILABLE} (could not be retrieved)`
            : displayQuantity(stock.quantity);
  const selectedUnit = meta.units.find((u) => String(u.id) === (mode === "new" ? newUnitId : unitId));

  return (
    <fieldset className="panel p-4" disabled={busy}>
      <legend className="px-1 text-sm font-bold">Add an item</legend>

      <div className="mb-3 flex gap-4 text-[13px]" role="radiogroup" aria-label="Item source">
        {(["existing", "new"] as const).map((m) => (
          <label key={m} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={id("mode")}
              checked={mode === m}
              onChange={() => {
                setMode(m);
                setErrors({});
              }}
            />
            {m === "existing" ? "Existing item" : "New item"}
          </label>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {mode === "existing" ? (
          <div ref={boxRef} className="relative md:col-span-2">
            <Field id={id("item")} label="Item (code or name)" required error={errors.item}>
              <input
                id={id("item")}
                className="input"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                aria-invalid={Boolean(errors.item)}
                aria-describedby={describedBy(id("item"), errors.item)}
                autoComplete="off"
                value={query}
                placeholder="Type to search…"
                onFocus={() => {
                  setOpen(true);
                  if (options.length === 0) runSearch(query);
                }}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setItem(null);
                  setStock({ status: "idle" });
                  setOpen(true);
                  runSearch(e.target.value);
                }}
                onKeyDown={onSearchKey}
              />
            </Field>
            {open && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Matching items"
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[3px] border border-[var(--border-strong)] bg-white shadow"
              >
                {searching && <li className="px-3 py-2 text-[12.5px] text-[var(--ink-soft)]">Searching…</li>}
                {searchError && <li className="px-3 py-2 text-[12.5px] text-[var(--red)]">Could not search right now. Try again.</li>}
                {!searching && !searchError && options.length === 0 && (
                  <li className="px-3 py-2 text-[12.5px] text-[var(--ink-soft)]">No matching items.</li>
                )}
                {options.map((o, i) => (
                  <li
                    key={o.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`cursor-pointer px-3 py-1.5 text-[13px] ${i === active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--grey-soft)]"}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(o);
                    }}
                  >
                    <span className="mono font-semibold">{o.itemCode}</span> · {o.itemName}
                    {o.specification && <span className="text-[var(--ink-soft)]"> — {o.specification}</span>}
                  </li>
                ))}
                {hasMore && <li className="px-3 py-2 text-[12px] text-[var(--ink-soft)]">More items match. Refine your search.</li>}
              </ul>
            )}
          </div>
        ) : (
          <>
            <Field id={id("newName")} label="Item name" required error={errors.newName}>
              <input id={id("newName")} className="input" value={newName} maxLength={255} aria-invalid={Boolean(errors.newName)} aria-describedby={describedBy(id("newName"), errors.newName)} onChange={(e) => setNewName(e.target.value)} />
            </Field>
            <Field id={id("newSpec")} label="Specification">
              <input id={id("newSpec")} className="input" value={newSpec} onChange={(e) => setNewSpec(e.target.value)} />
            </Field>
            <Field id={id("newDrawing")} label="Drawing number">
              <input id={id("newDrawing")} className="input" value={newDrawing} maxLength={100} onChange={(e) => setNewDrawing(e.target.value)} />
            </Field>
            <Field id={id("newUnit")} label="Unit" required error={errors.newUnit}>
              <select id={id("newUnit")} className="input" value={newUnitId} aria-invalid={Boolean(errors.newUnit)} aria-describedby={describedBy(id("newUnit"), errors.newUnit)} onChange={(e) => setNewUnitId(e.target.value)}>
                <option value="">Select…</option>
                {meta.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <p className="text-[12.5px] text-[var(--ink-soft)] md:col-span-2">Item code: assigned on save. Stock: {NOT_AVAILABLE}.</p>
          </>
        )}

        <Field id={id("dept")} label="Department" required error={errors.department}>
          <select id={id("dept")} className="input" value={effectiveDepartment} aria-invalid={Boolean(errors.department)} aria-describedby={describedBy(id("dept"), errors.department)} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select…</option>
            {meta.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>

        <Field id={id("purpose")} label="Purpose" className="md:col-span-2">
          <input id={id("purpose")} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </Field>

        <Field id={id("qty")} label="Required quantity" required error={errors.quantity}>
          <input id={id("qty")} className="input" inputMode="decimal" value={quantity} aria-invalid={Boolean(errors.quantity)} aria-describedby={describedBy(id("qty"), errors.quantity)} onChange={(e) => setQuantity(e.target.value)} />
        </Field>

        {mode === "existing" && (
          <Field id={id("unit")} label="Unit" required error={errors.unit}>
            <select id={id("unit")} className="input" value={unitId} aria-invalid={Boolean(errors.unit)} aria-describedby={describedBy(id("unit"), errors.unit)} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Select…</option>
              {meta.units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field id={id("date")} label="Required date" required error={errors.requiredDate}>
          <input id={id("date")} className="input" type="date" min={minDate} value={requiredDate} aria-invalid={Boolean(errors.requiredDate)} aria-describedby={describedBy(id("date"), errors.requiredDate)} onChange={(e) => setRequiredDate(e.target.value)} />
        </Field>

        <div>
          <span className="field-label">Current stock</span>
          <p className="py-1.5 text-[13.5px]" role="status" aria-live="polite">
            {stockText}
            {stock.status === "ok" && stock.quantity !== null && selectedUnit ? ` ${selectedUnit.symbol ?? selectedUnit.name}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <button type="button" className="btn btn-primary" onClick={add}>
          {addLabel}
        </button>
      </div>
    </fieldset>
  );
}
