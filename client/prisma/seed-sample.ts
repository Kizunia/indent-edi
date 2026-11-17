// Richer sample data for demos and manual testing, shaped by the SRS:
// all indent types and departments, multi-line and multi-department indents,
// every status (SRS 7.9), a spread of dates for the date/range filters,
// several creators for the Created By filter, enough rows for 10-per-page
// pagination (FR-15), zero and low stock, and one stale stock snapshot (9.6).
//
// Run AFTER the base seed:   npm run db:seed && npm run db:seed:sample
// Idempotent: items are matched by name, indents by their number.
import { PrismaClient, Prisma } from "@prisma/client";
import { nextSequence } from "../lib/db/sequence";

const prisma = new PrismaClient();

// Statuses beyond Draft/Submitted are PLACEHOLDERS (SRS 7.9, TBD with the
// approval team). They are inserted here only so the demo covers every state;
// they are not part of the migration.
const EXTRA_STATUSES = [
  { code: "PENDING_APPROVAL", name: "Pending Approval", sortOrder: 30 },
  { code: "APPROVED", name: "Approved", sortOrder: 40 },
  { code: "REJECTED", name: "Rejected", sortOrder: 50 },
  { code: "CANCELLED", name: "Cancelled", sortOrder: 60 },
];

// [name, specification, drawingNumber, unit, stock]
const NEW_ITEMS: [string, string, string, string, number][] = [
  ["Hex Bolt M12 x 50", "IS 1363 Gr 8.8", "DRG-1009", "Nos", 1200],
  ["Hex Nut M12", "IS 1363 Gr 8", "DRG-1010", "Nos", 2500],
  ["Flat Washer M12", "IS 2016", "", "Nos", 0],
  ["Copper Wire 2.5 sq mm", "FR-LSH, 1100V", "", "Meter", 640],
  ["MCB 32A Single Pole", "Schneider Acti9", "DRG-1013", "Nos", 18],
  ["Lubricating Grease EP2", "Servo Gem EP2", "", "Kg", 75],
  ["Cutting Oil", "Soluble, 5% emulsion", "", "Litre", 210],
  ["Angle Grinder Disc 4 inch", "Norton 100x3x16", "", "Nos", 6],
  ["Safety Helmet", "IS 2925, yellow", "", "Nos", 55],
  ["Safety Shoes (Steel Toe)", "IS 15298", "", "Pair", 3],
  ["Hydraulic Hose 1/2 inch", "SAE 100R2AT", "DRG-1019", "Meter", 90],
  ["Pressure Gauge 0-10 bar", "Dial 63mm, bottom entry", "DRG-1020", "Nos", 12],
  ["Stainless Steel Sheet 2mm", "SS304, 1250x2500", "DRG-1021", "Kg", 430],
  ["Mild Steel Plate 10mm", "IS 2062 E250", "DRG-1022", "Kg", 2100],
  ["Paint Primer Red Oxide", "IS 2074", "", "Litre", 40],
  ["Thinner", "Industrial grade", "", "Litre", 0],
  ["A4 Paper Ream", "75 GSM", "", "Nos", 120],
  ["Toner Cartridge", "HP 85A compatible", "", "Nos", 4],
  ["Proximity Sensor M18", "PNP, NO, 8mm", "DRG-1027", "Nos", 9],
  ["Gear Oil EP 90", "SAE 90", "", "Litre", 160],
];

interface Line { item: string; dept?: string; purpose?: string; qty: number; unit?: string; reqDate: string }
interface Spec {
  date: string; time: string; type: string; dept: string; by: string; remark?: string;
  status: "Draft" | "Submitted" | "Pending Approval" | "Approved" | "Rejected" | "Cancelled";
  lines: Line[];
}

const SPECS: Spec[] = [
  { date: "2026-10-01", time: "09:15", type: "Purchase", dept: "Production", by: "Amit Patil", status: "Approved",
    remark: "Monthly raw material for fabrication line",
    lines: [
      { item: "Mild Steel Rod 12mm", purpose: "Frame fabrication", qty: 400, reqDate: "2026-10-10" },
      { item: "Mild Steel Plate 10mm", purpose: "Base plates", qty: 800, reqDate: "2026-10-10" },
      { item: "Welding Electrode 3.15mm", purpose: "Welding stock", qty: 60, reqDate: "2026-10-08" },
    ] },
  { date: "2026-10-02", time: "11:40", type: "Maintenance", dept: "Maintenance", by: "Neha Kulkarni", status: "Approved",
    lines: [
      { item: "Ball Bearing 6205", purpose: "Conveyor motor bearings", qty: 20, reqDate: "2026-10-06" },
      { item: "Lubricating Grease EP2", purpose: "Preventive maintenance", qty: 15, reqDate: "2026-10-06" },
    ] },
  { date: "2026-10-05", time: "10:05", type: "Consumables", dept: "Administration", by: "Rohit Deshmukh", status: "Approved",
    remark: "Office stationery top-up",
    lines: [
      { item: "A4 Paper Ream", purpose: "Office use", qty: 40, reqDate: "2026-10-12" },
      { item: "Toner Cartridge", purpose: "Printer replacement", qty: 6, reqDate: "2026-10-12" },
    ] },
  { date: "2026-10-06", time: "14:20", type: "Production", dept: "Production", by: "Amit Patil", status: "Rejected",
    remark: "Rejected: quantity exceeds monthly budget",
    lines: [
      { item: "Stainless Steel Sheet 2mm", purpose: "Cladding job", qty: 1500, reqDate: "2026-10-20" },
    ] },
  { date: "2026-10-08", time: "08:50", type: "Maintenance", dept: "Maintenance", by: "Neha Kulkarni", status: "Approved",
    lines: [
      { item: "Hydraulic Oil ISO 68", purpose: "Press oil change", qty: 200, reqDate: "2026-10-15" },
      { item: "Hydraulic Hose 1/2 inch", purpose: "Press hose replacement", qty: 20, reqDate: "2026-10-15" },
      { item: "Pressure Gauge 0-10 bar", purpose: "Calibration swap", qty: 4, reqDate: "2026-10-15" },
    ] },
  { date: "2026-10-09", time: "16:10", type: "Purchase", dept: "Quality Control", by: "Sneha Joshi", status: "Cancelled",
    remark: "Cancelled: item no longer required",
    lines: [{ item: "Pressure Gauge 0-10 bar", purpose: "Inspection bench", qty: 2, reqDate: "2026-10-18" }] },
  { date: "2026-10-12", time: "09:30", type: "Purchase", dept: "Stores", by: "Vikram Rane", status: "Approved",
    remark: "Safety stock replenishment",
    lines: [
      { item: "Safety Gloves (Leather)", dept: "Stores", purpose: "Safety stock", qty: 100, reqDate: "2026-10-22" },
      { item: "Safety Helmet", dept: "Stores", purpose: "Safety stock", qty: 30, reqDate: "2026-10-22" },
      { item: "Safety Shoes (Steel Toe)", dept: "Stores", purpose: "Safety stock", qty: 40, reqDate: "2026-10-22" },
    ] },
  { date: "2026-10-14", time: "12:00", type: "Production", dept: "Production", by: "Amit Patil", status: "Pending Approval",
    lines: [
      { item: "Hex Bolt M12 x 50", purpose: "Assembly line", qty: 2000, reqDate: "2026-10-28" },
      { item: "Hex Nut M12", purpose: "Assembly line", qty: 2000, reqDate: "2026-10-28" },
      { item: "Flat Washer M12", purpose: "Assembly line (stock is zero)", qty: 4000, reqDate: "2026-10-28" },
    ] },
  { date: "2026-10-15", time: "15:25", type: "Maintenance", dept: "Maintenance", by: "Neha Kulkarni", status: "Pending Approval",
    lines: [
      { item: "Motor Starter 15HP", purpose: "Compressor starter failure", qty: 1, reqDate: "2026-10-19" },
      { item: "MCB 32A Single Pole", dept: "Production", purpose: "Panel replacement", qty: 10, reqDate: "2026-10-19" },
    ] },
  { date: "2026-10-16", time: "10:45", type: "Consumables", dept: "Production", by: "Sneha Joshi", status: "Submitted",
    lines: [
      { item: "Cutting Oil", purpose: "Lathe coolant", qty: 100, reqDate: "2026-10-24" },
      { item: "Angle Grinder Disc 4 inch", purpose: "Fabrication", qty: 50, reqDate: "2026-10-24" },
    ] },
  { date: "2026-10-19", time: "09:00", type: "Purchase", dept: "Production", by: "Rohit Deshmukh", status: "Submitted",
    remark: "Paint shop requirement",
    lines: [
      { item: "Paint Primer Red Oxide", purpose: "Surface coating", qty: 80, reqDate: "2026-10-30" },
      { item: "Thinner", purpose: "Paint thinning (stock is zero)", qty: 60, reqDate: "2026-10-30" },
    ] },
  { date: "2026-10-20", time: "13:35", type: "Maintenance", dept: "Maintenance", by: "Vikram Rane", status: "Submitted",
    lines: [
      { item: "V-Belt A-52", purpose: "Blower belt", qty: 12, reqDate: "2026-10-27" },
      { item: "Gear Oil EP 90", purpose: "Gearbox oil change", qty: 60, reqDate: "2026-10-27" },
    ] },
  { date: "2026-10-22", time: "11:10", type: "Purchase", dept: "Quality Control", by: "Sneha Joshi", status: "Draft",
    lines: [
      { item: "Proximity Sensor M18", purpose: "Gauging fixture", qty: 8, reqDate: "2026-11-05" },
      { item: "Copper Wire 2.5 sq mm", purpose: "Fixture wiring", qty: 100, reqDate: "2026-11-05" },
    ] },
  { date: "2026-10-26", time: "09:20", type: "Production", dept: "Production", by: "Amit Patil", status: "Draft",
    remark: "Draft: awaiting drawing confirmation",
    lines: [{ item: "Mild Steel Rod 12mm", purpose: "Next batch", qty: 600, reqDate: "2026-11-12" }] },
  { date: "2026-10-27", time: "14:50", type: "Consumables", dept: "Administration", by: "Rohit Deshmukh", status: "Draft",
    lines: [{ item: "A4 Paper Ream", purpose: "Quarterly stock", qty: 100, reqDate: "2026-11-10" }] },
  { date: "2026-10-28", time: "10:30", type: "Maintenance", dept: "Stores", by: "Vikram Rane", status: "Draft",
    remark: "Stock snapshot is stale: stock changed after this draft was started",
    lines: [{ item: "Ball Bearing 6205", dept: "Stores", purpose: "Spare stock", qty: 50, reqDate: "2026-11-14" }] },
];

const utc = (d: string, t = "00:00") => new Date(`${d}T${t}:00.000Z`);

// Status path taken to reach each final status, as [from, to] pairs.
const PATH: Record<Spec["status"], Array<[string | null, string]>> = {
  Draft: [[null, "Draft"]],
  Submitted: [[null, "Draft"], ["Draft", "Submitted"]],
  "Pending Approval": [[null, "Draft"], ["Draft", "Submitted"], ["Submitted", "Pending Approval"]],
  Approved: [[null, "Draft"], ["Draft", "Submitted"], ["Submitted", "Pending Approval"], ["Pending Approval", "Approved"]],
  Rejected: [[null, "Draft"], ["Draft", "Submitted"], ["Submitted", "Pending Approval"], ["Pending Approval", "Rejected"]],
  Cancelled: [[null, "Draft"], ["Draft", "Submitted"], ["Submitted", "Cancelled"]],
};

async function main() {
  if ((await prisma.department.count()) === 0) {
    throw new Error("Master data is empty. Run `npm run db:seed` first.");
  }

  for (const s of EXTRA_STATUSES) {
    await prisma.indentStatus.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, isEditable: false },
    });
  }

  // Items + stock (matched by name so existing/test items never collide).
  for (const [name, spec, drawing, unitCode, qty] of NEW_ITEMS) {
    if (await prisma.item.findFirst({ where: { itemName: name } })) continue;
    await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.upsert({ where: { code: unitCode }, update: {}, create: { code: unitCode, name: unitCode } });
      const seq = await nextSequence(tx, "ITEM");
      const item = await tx.item.create({
        data: {
          itemCode: `ITM-${String(seq).padStart(5, "0")}`,
          itemName: name,
          specification: spec || null,
          drawingNumber: drawing || null,
          defaultUnitId: unit.id,
        },
      });
      await tx.stockBalance.create({ data: { itemId: item.id, currentQuantity: qty, updatedAt: utc("2026-10-28", "08:00") } });
    });
  }

  const statuses = new Map((await prisma.indentStatus.findMany()).map((s) => [s.name, s.id]));
  let created = 0;

  for (const spec of SPECS) {
    await prisma.$transaction(async (tx) => {
      const [type, dept] = await Promise.all([
        tx.indentType.findFirstOrThrow({ where: { name: spec.type } }),
        tx.department.findFirstOrThrow({ where: { name: spec.dept } }),
      ]);
      const created_at = utc(spec.date, spec.time);

      // One counter per day, same placeholder format as the app: IND-YYYYMMDD-####.
      // Skip if this sample indent was already seeded (same creator and
      // creation instant). TIME columns cannot be compared reliably through
      // Prisma filters, so createdAt is the idempotency key.
      const dup = await tx.indent.findFirst({
        where: { createdByUserId: spec.by, createdAt: created_at },
      });
      if (dup) return;

      const datePart = spec.date.replace(/-/g, "");
      const seq = await nextSequence(tx, `INDENT:${datePart}`);
      const indentNumber = `IND-${datePart}-${String(seq).padStart(4, "0")}`;

      const lines: Prisma.IndentItemCreateWithoutIndentInput[] = [];
      for (const [n, l] of spec.lines.entries()) {
        const item = await tx.item.findFirstOrThrow({ where: { itemName: l.item }, include: { stock: true, defaultUnit: true } });
        const ldept = await tx.department.findFirstOrThrow({ where: { name: l.dept ?? spec.dept } });
        const unit = l.unit ?? item.defaultUnit?.code ?? "Nos";
        const unitRow = await tx.unit.upsert({ where: { code: unit }, update: {}, create: { code: unit, name: unit } });
        // The snapshot is what the user saw when entering the line. For the
        // deliberately stale draft, the snapshot is higher than today's stock.
        const stale = spec.remark?.startsWith("Stock snapshot is stale");
        const snapshot = Number(item.stock?.currentQuantity ?? 0) + (stale ? 30 : 0);
        lines.push({
          lineNumber: n + 1,
          item: { connect: { id: item.id } },
          itemCodeSnapshot: item.itemCode,
          itemNameSnapshot: item.itemName,
          specificationSnapshot: item.specification,
          drawingNumberSnapshot: item.drawingNumber,
          department: { connect: { id: ldept.id } },
          purpose: l.purpose ?? null,
          currentStockSnapshot: snapshot,
          stockCheckedAt: stale ? utc("2026-10-20", "09:00") : created_at,
          requiredQuantity: l.qty,
          requiredUnit: { connect: { id: unitRow.id } },
          requiredDate: utc(l.reqDate),
          createdByUserId: spec.by,
        });
      }

      const path = PATH[spec.status];
      const submitted = path.some(([, to]) => to === "Submitted");
      await tx.indent.create({
        data: {
          indentNumber,
          indentType: { connect: { id: type.id } },
          status: { connect: { id: statuses.get(spec.status)! } },
          department: { connect: { id: dept.id } },
          indentDate: utc(spec.date),
          indentTime: utc("1970-01-01", spec.time),
          remark: spec.remark ?? null,
          createdAt: created_at,
          createdByUserId: spec.by,
          createdByName: spec.by,
          submittedAt: submitted ? new Date(created_at.getTime() + 3600_000) : null,
          submittedByUserId: submitted ? spec.by : null,
          items: { create: lines },
          history: {
            create: path.map(([from, to], i) => ({
              fromStatusId: from ? statuses.get(from)! : null,
              toStatusId: statuses.get(to)!,
              changedAt: new Date(created_at.getTime() + i * 3600_000),
              changedByUserId: i < 2 ? spec.by : null,
              source: i < 2 ? "APP" : "APPROVAL",
              note: i === 0 ? "Sample data" : null,
            })),
          },
        },
      });
      created++;
    });
  }

  console.log(`Sample data: ${created} indents added (${SPECS.length - created} already present).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
