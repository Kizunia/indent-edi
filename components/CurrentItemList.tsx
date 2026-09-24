"use client";

import type { AddedItem } from "./ItemEntryForm";

interface Row extends AddedItem {
  indentItemId?: string;
}

interface CurrentItemListProps {
  items: Row[];
  onRemove?: (index: number) => void;
  removable?: boolean;
}

// SRS §11 / §23: the Current Indent Item List — items bound to the
// in-progress or existing Indent.
export default function CurrentItemList({ items, onRemove, removable = true }: CurrentItemListProps) {
  if (items.length === 0) {
    return (
      <div className="panel" style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>
        No Items added yet. Use the form above to add at least one Item before saving.
      </div>
    );
  }

  return (
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
            {removable && <th style={{ width: 40 }}></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.indentItemId || idx} style={{ cursor: "default" }}>
              <td className="mono">{it.itemCode}</td>
              <td>{it.itemName}</td>
              <td>{it.specification || "—"}</td>
              <td>{it.department}</td>
              <td>{it.purpose || "—"}</td>
              <td>{it.currentStockAtEntry}</td>
              <td>{it.requiredQuantity}</td>
              <td>{it.unit}</td>
              <td>{it.requiredDate}</td>
              {removable && (
                <td>
                  {onRemove && (
                    <button
                      className="btn btn-ghost"
                      style={{ color: "var(--red)", padding: "4px 8px" }}
                      onClick={() => onRemove(idx)}
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
