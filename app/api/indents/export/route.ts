import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAllIndents, queryIndents } from "@/lib/store";
import type { Indent } from "@/lib/types";

// FR-19 / SRS §40-41: export one selected Indent, multiple selected Indents,
// or all Indents (respecting the currently applied filters), each row
// carrying full Indent + Item information.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode: "selected" | "all" = body.mode || "selected";

  let indents: Indent[];
  if (mode === "all") {
    // "All Indents" honors any filters currently applied on the list (§40C).
    indents = queryIndents({ ...(body.filters || {}), page: 1, pageSize: 100000 }).results;
  } else {
    const ids: string[] = body.ids || [];
    const all = getAllIndents();
    indents = all.filter((i) => ids.includes(i.id));
  }

  if (indents.length === 0) {
    return NextResponse.json({ error: "No Indents to export." }, { status: 400 });
  }

  const rows: Record<string, any>[] = [];
  for (const indent of indents) {
    for (const item of indent.items) {
      rows.push({
        "Indent Number": indent.indentNumber,
        "Indent Type": indent.indentType,
        "Date": indent.indentDate,
        "Time": indent.time,
        "Department": indent.department,
        "Created By": indent.createdBy,
        "Remark/Note": indent.remark || "",
        "Status": indent.status,
        "Item Code": item.itemCode,
        "Item Name": item.itemName,
        "Specification": item.specification || "",
        "Drawing Number": item.drawingNumber || "",
        "Purpose": item.purpose || "",
        "Current Stock": item.currentStockAtEntry,
        "Required Quantity": item.requiredQuantity,
        "Required Date": item.requiredDate,
        "Unit": item.unit,
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Indents");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="indents-export.xlsx"`,
    },
  });
}
