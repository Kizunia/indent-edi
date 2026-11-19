import type { Line } from "@/lib/services/types";
import { displayQuantity } from "@/lib/shared/format";

// Read-only item table (SRS 8.2, 10.1). Server- and client-safe. Stock that is
// unknown shows "Not available", never 0 (DEC-013).
export default function ItemGrid({ lines, caption }: { lines: Line[]; caption: string }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Item Code</th>
            <th scope="col">Item Name</th>
            <th scope="col">Specification</th>
            <th scope="col">Drawing No.</th>
            <th scope="col">Department</th>
            <th scope="col">Purpose</th>
            <th scope="col" className="text-right">Current Stock</th>
            <th scope="col" className="text-right">Required Qty</th>
            <th scope="col">Unit</th>
            <th scope="col">Required Date</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.lineNumber}</td>
              <td className="mono">{l.itemCode}</td>
              <td>{l.itemName}</td>
              <td>{l.specification ?? "—"}</td>
              <td>{l.drawingNumber ?? "—"}</td>
              <td>{l.department.name}</td>
              <td>{l.purpose ?? "—"}</td>
              <td className="text-right">{displayQuantity(l.currentStock)}</td>
              <td className="text-right">{displayQuantity(l.requiredQuantity)}</td>
              <td>{l.unit.symbol ?? l.unit.name}</td>
              <td>{l.requiredDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
