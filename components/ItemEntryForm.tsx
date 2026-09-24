"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";

export interface AddedItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  specification?: string;
  drawingNumber?: string;
  department: string;
  purpose?: string;
  currentStockAtEntry: number;
  requiredQuantity: number;
  requiredDate: string;
  unit: string;
}

interface ItemEntryFormProps {
  defaultDepartment: string;
  departments: { id: string; name: string }[];
  onAdd: (item: AddedItem) => void;
}

// SRS §23-24: fills item information, then Add Item binds it into the
// current Indent's item list. Duplicate-item handling (§16) and item
// removal before save (§24) are both TBD — this demo allows both a
// duplicate add and a pre-save remove (handled in the parent list),
// clearly flagged here so it is easy to lock down once confirmed.
export default function ItemEntryForm({ defaultDepartment, departments, onAdd }: ItemEntryFormProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Item[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [specification, setSpecification] = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [unit, setUnit] = useState("");
  const [department, setDepartment] = useState(defaultDepartment);
  const [purpose, setPurpose] = useState("");
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [requiredQuantity, setRequiredQuantity] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [formError, setFormError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDepartment(defaultDepartment), [defaultDepartment]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (selectedItem || creatingNew) return;
    const t = setTimeout(() => {
      fetch(`/api/items?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setSuggestions);
    }, 150);
    return () => clearTimeout(t);
  }, [query, selectedItem, creatingNew]);

  // SRS §17-20: Current Stock is looked up by Item Code and refreshed
  // whenever the selected item changes, rather than reused from a stale value.
  useEffect(() => {
    if (!selectedItem) {
      setCurrentStock(null);
      return;
    }
    setStockLoading(true);
    fetch(`/api/stock/${encodeURIComponent(selectedItem.itemCode)}`)
      .then((r) => r.json())
      .then((d) => setCurrentStock(d.currentQuantity))
      .finally(() => setStockLoading(false));
  }, [selectedItem]);

  function selectExistingItem(item: Item) {
    setSelectedItem(item);
    setCreatingNew(false);
    setQuery(item.itemName);
    setSpecification(item.specification || "");
    setDrawingNumber(item.drawingNumber || "");
    setUnit(item.unit);
    setShowSuggestions(false);
  }

  function startCreatingNew(name: string) {
    setCreatingNew(true);
    setSelectedItem(null);
    setQuery(name);
    setSpecification("");
    setDrawingNumber("");
    setUnit("");
    setShowSuggestions(false);
  }

  function resetForm() {
    setQuery("");
    setSelectedItem(null);
    setCreatingNew(false);
    setSpecification("");
    setDrawingNumber("");
    setUnit("");
    setPurpose("");
    setCurrentStock(null);
    setRequiredQuantity("");
    setRequiredDate("");
    setFormError("");
  }

  async function handleAddItem() {
    setFormError("");
    if (!query.trim()) return setFormError("Item Name is required.");
    if (!unit.trim()) return setFormError("Unit is required.");
    if (!department) return setFormError("Department is required.");
    const qty = Number(requiredQuantity);
    if (!requiredQuantity || isNaN(qty) || qty <= 0) return setFormError("Enter a valid Required Quantity.");
    if (!requiredDate) return setFormError("Required Date is required.");

    let item: Item | null = selectedItem;
    if (!item) {
      // Item Name entered manually (§13) with no Item Master match — create it.
      // Item Code is system-generated (§14); format is a placeholder pending
      // company confirmation (see lib/store.ts).
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: query.trim(), specification, drawingNumber, unit }),
      });
      if (!res.ok) {
        const d = await res.json();
        return setFormError(d.error || "Failed to create Item.");
      }
      item = await res.json();
    }

    const stock = item!.itemCode === selectedItem?.itemCode ? currentStock ?? 0 : 0;

    onAdd({
      itemId: item!.id,
      itemCode: item!.itemCode,
      itemName: item!.itemName,
      specification,
      drawingNumber,
      department,
      purpose,
      currentStockAtEntry: stock,
      requiredQuantity: qty,
      requiredDate,
      unit,
    });

    resetForm();
  }

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add Item</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div ref={boxRef} style={{ position: "relative" }}>
          <label className="field-label field-required">Item Name</label>
          <input
            className="input"
            placeholder="Search Item Master or type a new item name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedItem(null);
              setCreatingNew(false);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && query.trim() && !selectedItem && (
            <div
              className="panel"
              style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                marginTop: 4, maxHeight: 220, overflowY: "auto", background: "#fff",
              }}
            >
              {suggestions.map((it) => (
                <div
                  key={it.id}
                  onClick={() => selectExistingItem(it)}
                  style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{it.itemCode} · {it.unit}</div>
                </div>
              ))}
              <div
                onClick={() => startCreatingNew(query)}
                onMouseDown={(e) => e.preventDefault()}
                style={{ padding: "8px 10px", cursor: "pointer", fontSize: 12.5, color: "var(--accent)" }}
              >
                + Use “{query}” as a new Item (a new Item Code will be generated)
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="field-label">Item Code</label>
          <input className="input mono" disabled value={selectedItem ? selectedItem.itemCode : creatingNew ? "Generated on add" : "—"} />
        </div>

        <div>
          <label className="field-label field-required">Unit</label>
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Kg, Nos" disabled={!!selectedItem} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label className="field-label">Specification</label>
          <input className="input" value={specification} onChange={(e) => setSpecification(e.target.value)} disabled={!!selectedItem} />
        </div>
        <div>
          <label className="field-label">Drawing Number</label>
          <input className="input" value={drawingNumber} onChange={(e) => setDrawingNumber(e.target.value)} disabled={!!selectedItem} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label className="field-label field-required">Department (for this item)</label>
          <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Purpose</label>
          <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div>
          <label className="field-label field-required">Required Quantity</label>
          <input
            className="input"
            type="number"
            min={0}
            value={requiredQuantity}
            onChange={(e) => setRequiredQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label field-required">Required Date</label>
          <input type="date" className="input" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Current Stock:{" "}
          <strong style={{ color: "var(--ink)" }}>
            {!selectedItem ? "— (select an existing Item to view stock)" : stockLoading ? "Loading…" : currentStock}
          </strong>
        </div>
        <button className="btn btn-primary" onClick={handleAddItem}>
          Add Item
        </button>
      </div>

      {formError && (
        <div style={{ marginTop: 10 }} className="callout">
          {formError}
        </div>
      )}
    </div>
  );
}
