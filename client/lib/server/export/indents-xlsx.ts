import { PassThrough, Readable } from "node:stream";
import ExcelJS from "exceljs";
import { businessDate, businessTime, fromDbDate, fromDbTime } from "../../shared/datetime";
import { EXPORT_BATCH_SIZE, loadExportBatch, type ExportIndent } from "../../services/export";

// Streaming .xlsx writer for the indent export (DEC-018, docs/spec/export-print.md).
// One sheet "Indents", one row per line, indent columns repeated.

const COLUMNS: { header: string; width: number; numFmt?: string }[] = [
  { header: "Indent Number", width: 18 },
  { header: "Indent Type", width: 16 },
  { header: "Date", width: 12, numFmt: "yyyy-mm-dd" },
  { header: "Time", width: 10, numFmt: "hh:mm:ss" },
  { header: "Department (header)", width: 20 },
  { header: "Created By", width: 20 },
  { header: "Remark", width: 28 },
  { header: "Status", width: 14 },
  { header: "Line No.", width: 9 },
  { header: "Item Code", width: 14 },
  { header: "Item Name", width: 28 },
  { header: "Specification", width: 24 },
  { header: "Drawing Number", width: 16 },
  { header: "Department (line)", width: 20 },
  { header: "Purpose", width: 28 },
  { header: "Current Stock", width: 14, numFmt: "#,##0.0000" },
  { header: "Stock Checked At", width: 18, numFmt: "yyyy-mm-dd hh:mm" },
  { header: "Required Quantity", width: 17, numFmt: "#,##0.0000" },
  { header: "Unit", width: 10 },
  { header: "Required Date", width: 13, numFmt: "yyyy-mm-dd" },
];

/** Stops spreadsheet programs from running user text as a formula (OWASP CSV injection). */
export function safeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Excel has no time zones: write the wall-clock time of the company zone as if it were UTC. */
export function wallClock(instant: Date, timeZone: string): Date {
  return new Date(`${businessDate(instant, timeZone)}T${businessTime(instant, timeZone)}.000Z`);
}

function timeFraction(hhmmss: string): number {
  const [h, m, s] = hhmmss.split(":").map(Number);
  return (h * 3600 + m * 60 + s) / 86400;
}

function rowsFor(ind: ExportIndent, timeZone: string): (string | number | Date | null)[][] {
  const date = new Date(`${fromDbDate(ind.indentDate)}T00:00:00.000Z`);
  const time = timeFraction(fromDbTime(ind.indentTime));
  return ind.items.map((l) => [
    ind.indentNumber,
    safeText(ind.indentType.name),
    date,
    time,
    safeText(ind.department?.name),
    safeText(ind.createdByName),
    safeText(ind.remark),
    safeText(ind.status.name),
    l.lineNumber,
    safeText(l.itemCodeSnapshot),
    safeText(l.itemNameSnapshot),
    safeText(l.specificationSnapshot),
    safeText(l.drawingNumberSnapshot),
    safeText(l.department.name),
    safeText(l.purpose),
    l.currentStockSnapshot ? Number(l.currentStockSnapshot.toFixed(4)) : null, // empty = "Not available"
    l.stockCheckedAt ? wallClock(l.stockCheckedAt, timeZone) : null,
    Number(l.requiredQuantity.toFixed(4)),
    safeText(l.requiredUnit.symbol ?? l.requiredUnit.name),
    new Date(`${fromDbDate(l.requiredDate)}T00:00:00.000Z`),
  ]);
}

/**
 * Returns a readable stream of the workbook. Rows are loaded `EXPORT_BATCH_SIZE`
 * indents at a time and written as they come. If anything fails the stream is
 * destroyed, so the client sees a failed download and never a partial file.
 */
export function streamIndentsWorkbook(ids: number[], timeZone: string): Readable {
  const out = new PassThrough();
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: out, useStyles: true, useSharedStrings: false });
  const sheet = workbook.addWorksheet("Indents", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.commit();

  void (async () => {
    try {
      for (let i = 0; i < ids.length; i += EXPORT_BATCH_SIZE) {
        for (const ind of await loadExportBatch(ids.slice(i, i + EXPORT_BATCH_SIZE))) {
          for (const values of rowsFor(ind, timeZone)) sheet.addRow(values).commit();
        }
      }
      sheet.commit();
      await workbook.commit();
    } catch (err) {
      out.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return out;
}
