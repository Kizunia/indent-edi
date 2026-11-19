// Base SAMPLE data so the app has reference data and two demo indents.
// Self-contained (no JSON files). Idempotent: safe to run more than once.
// Run with: npm run db:seed        (then optionally: npm run db:seed:sample)
//
// The SRS leaves Departments, Indent Types and Units as TBD (7.3, 7.4); the
// values below are placeholders from the prototype, not company data
// (docs/data-model/db-handoff.md H-01).
import { PrismaClient, Prisma } from "@prisma/client";
import {
  CREATORS, DEPARTMENTS, INDENT_TYPES, slug, utc, ensureItem, ensureUnit, nextIndentNumber, type CreatorName,
} from "./seed-lib";

const prisma = new PrismaClient();

// [name, specification, drawingNumber, unit, stock]
const BASE_ITEMS: [string, string, string, string, number][] = [
  ["Mild Steel Rod 12mm", "IS 2062 Gr B", "DRG-1001", "Kg", 500],
  ["Ball Bearing 6205", "SKF 6205-2RS", "DRG-1002", "Nos", 120],
  ["Hydraulic Oil ISO 68", "Servo System 68", "", "Litre", 850],
  ["V-Belt A-52", "Fenner A52", "DRG-1004", "Nos", 40],
  ["Welding Electrode 3.15mm", "E6013", "", "Kg", 300],
  ["Safety Gloves (Leather)", "IS 6994", "", "Pair", 200],
  ["Motor Starter 15HP", "L&T MK1", "DRG-1007", "Nos", 5],
  ["PVC Pipe 2 inch", "ASTM D1785", "", "Meter", 600],
];

interface DemoIndent {
  date: string; time: string; type: string; dept: string; by: CreatorName; createdAt: string;
  lines: { item: string; purpose: string; stock: number; qty: number; reqDate: string }[];
}

// Two submitted indents carried over from the prototype.
const DEMO_INDENTS: DemoIndent[] = [
  { date: "2026-09-24", time: "12:59", type: "Purchase", dept: "Production", by: "Amit Patil", createdAt: "2026-09-24T07:30:53.787Z",
    lines: [
      { item: "Mild Steel Rod 12mm", purpose: "Frame fabrication", stock: 500, qty: 53, reqDate: "2026-09-26" },
      { item: "Safety Gloves (Leather)", purpose: "Shop floor", stock: 200, qty: 34, reqDate: "2026-09-29" },
    ] },
  { date: "2026-09-24", time: "14:43", type: "Purchase", dept: "Stores", by: "Soham Kale", createdAt: "2026-09-24T09:14:25.679Z",
    lines: [{ item: "Motor Starter 15HP", purpose: "Spare", stock: 5, qty: 2, reqDate: "2026-09-30" }] },
];

async function main() {
  for (const [i, name] of DEPARTMENTS.entries()) {
    await prisma.department.upsert({
      where: { code: slug(name) }, update: {}, create: { id: i + 1, code: slug(name), name },
    });
  }
  for (const name of INDENT_TYPES) {
    await prisma.indentType.upsert({ where: { code: slug(name) }, update: {}, create: { code: slug(name), name } });
  }

  const stockAt = utc("2026-09-09", "07:03");
  for (const [name, specification, drawingNumber, unit, stock] of BASE_ITEMS) {
    await prisma.$transaction((tx) => ensureItem(tx, { name, specification, drawingNumber, unit, stock, stockAt }));
  }

  const submitted = await prisma.indentStatus.findUniqueOrThrow({ where: { code: "SUBMITTED" } });
  const draft = await prisma.indentStatus.findUniqueOrThrow({ where: { code: "DRAFT" } });

  for (const d of DEMO_INDENTS) {
    const createdAt = new Date(d.createdAt);
    const creator = CREATORS[d.by];
    await prisma.$transaction(async (tx) => {
      // createdAt + creator is the idempotency key (TIME columns do not filter reliably).
      if (await tx.indent.findFirst({ where: { createdByUserId: creator.id, createdAt } })) return;
      const [type, dept] = await Promise.all([
        tx.indentType.findFirstOrThrow({ where: { name: d.type } }),
        tx.department.findFirstOrThrow({ where: { name: d.dept } }),
      ]);
      const lines: Prisma.IndentItemCreateWithoutIndentInput[] = [];
      for (const [n, l] of d.lines.entries()) {
        const item = await tx.item.findFirstOrThrow({ where: { itemName: l.item }, include: { defaultUnit: true } });
        const unit = await ensureUnit(tx, item.defaultUnit?.code ?? "Nos");
        lines.push({
          lineNumber: n + 1,
          item: { connect: { id: item.id } },
          itemCodeSnapshot: item.itemCode, itemNameSnapshot: item.itemName,
          specificationSnapshot: item.specification, drawingNumberSnapshot: item.drawingNumber,
          department: { connect: { id: dept.id } },
          purpose: l.purpose, currentStockSnapshot: l.stock, stockCheckedAt: createdAt,
          requiredQuantity: l.qty, requiredUnit: { connect: { id: unit.id } }, requiredDate: utc(l.reqDate),
          createdByUserId: creator.id,
        });
      }
      const submittedAt = new Date(createdAt.getTime() + 60_000);
      await tx.indent.create({
        data: {
          indentNumber: await nextIndentNumber(tx),
          indentType: { connect: { id: type.id } },
          status: { connect: { id: submitted.id } },
          department: { connect: { id: dept.id } },
          indentDate: utc(d.date), indentTime: utc("1970-01-01", d.time),
          createdAt, createdByUserId: creator.id, createdByName: creator.name,
          submittedAt, submittedByUserId: creator.id,
          items: { create: lines },
          history: {
            create: [
              { toStatusId: draft.id, changedAt: createdAt, changedByUserId: creator.id, source: "APP", note: "Demo data" },
              { fromStatusId: draft.id, toStatusId: submitted.id, changedAt: submittedAt, changedByUserId: creator.id, source: "APP" },
            ],
          },
        },
      });
    });
  }
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
