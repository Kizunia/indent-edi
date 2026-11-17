// Loads the prototype's JSON fixtures (client/data) into MySQL so the app has
// reference data and demo indents. Idempotent: safe to run more than once.
// Run with: npm run db:seed
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const read = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", file), "utf-8"));

const slug = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");

async function main() {
  const departments = read<{ name: string }[]>("departments.json");
  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: slug(d.name) },
      update: {},
      create: { code: slug(d.name), name: d.name },
    });
  }

  const types = read<{ name: string }[]>("indent-types.json");
  for (const t of types) {
    await prisma.indentType.upsert({
      where: { code: slug(t.name) },
      update: {},
      create: { code: slug(t.name), name: t.name },
    });
  }

  const items = read<
    { itemCode: string; itemName: string; specification?: string; drawingNumber?: string; unit: string }[]
  >("items.json");
  const stock = read<{ itemCode: string; currentQuantity: number; updatedAt: string }[]>("stock.json");

  for (const i of items) {
    const unit = await prisma.unit.upsert({
      where: { code: i.unit },
      update: {},
      create: { code: i.unit, name: i.unit },
    });
    const item = await prisma.item.upsert({
      where: { itemCode: i.itemCode },
      update: {},
      create: {
        itemCode: i.itemCode,
        itemName: i.itemName,
        specification: i.specification || null,
        drawingNumber: i.drawingNumber || null,
        defaultUnitId: unit.id,
      },
    });
    const s = stock.find((x) => x.itemCode === i.itemCode);
    await prisma.stockBalance.upsert({
      where: { itemId: item.id },
      update: {},
      create: {
        itemId: item.id,
        currentQuantity: s?.currentQuantity ?? 0,
        updatedAt: s ? new Date(s.updatedAt) : new Date(),
      },
    });
  }

  // Item codes ITM-00001.. were issued by the prototype; continue after them.
  const maxSeq = Math.max(0, ...items.map((i) => Number(i.itemCode.replace(/\D/g, "")) || 0));
  await prisma.numberSequence.updateMany({
    where: { scope: "ITEM", lastValue: { lt: maxSeq } },
    data: { lastValue: maxSeq },
  });

  // Demo indents from the prototype (skipped if the number already exists).
  type DemoIndent = {
    indentNumber: string; indentType: string; indentDate: string; time: string; department: string;
    createdBy: string; remark?: string; status: string; createdAt: string;
    items: { itemCode: string; department: string; purpose?: string; currentStockAtEntry: number;
             requiredQuantity: number; requiredDate: string; unit: string }[];
  };
  for (const ind of read<DemoIndent[]>("indents.json")) {
    if (await prisma.indent.findUnique({ where: { indentNumber: ind.indentNumber } })) continue;
    const [type, dept, status] = await Promise.all([
      prisma.indentType.findFirstOrThrow({ where: { name: ind.indentType } }),
      prisma.department.findFirstOrThrow({ where: { name: ind.department } }),
      prisma.indentStatus.findFirstOrThrow({ where: { name: ind.status } }),
    ]);
    const lines = [];
    for (const [n, l] of ind.items.entries()) {
      const item = await prisma.item.findUniqueOrThrow({ where: { itemCode: l.itemCode } });
      const ldept = await prisma.department.findFirstOrThrow({ where: { name: l.department } });
      const unit = await prisma.unit.upsert({ where: { code: l.unit }, update: {}, create: { code: l.unit, name: l.unit } });
      lines.push({
        lineNumber: n + 1, itemId: item.id,
        itemCodeSnapshot: item.itemCode, itemNameSnapshot: item.itemName,
        specificationSnapshot: item.specification, drawingNumberSnapshot: item.drawingNumber,
        departmentId: ldept.id, purpose: l.purpose || null,
        currentStockSnapshot: l.currentStockAtEntry, stockCheckedAt: new Date(ind.createdAt),
        requiredQuantity: l.requiredQuantity, requiredUnitId: unit.id,
        requiredDate: new Date(`${l.requiredDate}T00:00:00.000Z`),
      });
    }
    await prisma.indent.create({
      data: {
        indentNumber: ind.indentNumber, indentTypeId: type.id, statusId: status.id, departmentId: dept.id,
        indentDate: new Date(`${ind.indentDate}T00:00:00.000Z`),
        indentTime: new Date(`1970-01-01T${ind.time}:00.000Z`),
        remark: ind.remark || null, createdAt: new Date(ind.createdAt),
        createdByUserId: ind.createdBy, createdByName: ind.createdBy,
        items: { create: lines },
        history: { create: { toStatusId: status.id, source: "SYSTEM", note: "Imported demo data" } },
      },
    });
  }
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
