import { prisma } from "@/lib/db/client";
import type { AuthUser } from "@/lib/server/auth/types";
import type { CreateIndentInput } from "@/lib/shared/schemas/indent";

// Shared fixtures for the integration tests. Everything is created with
// upserts, so the tests can run repeatedly against the same _test database.

export interface Fixtures {
  deptA: number;
  deptB: number;
  typeId: number;
  unitId: number;
  /** Has stock 5. */
  stockedItemId: number;
  /** Has no stock row ("Not available"). */
  unstockedItemId: number;
  secondItemId: number;
}

export const users = {
  admin: { id: "t-admin", name: "Test Admin", roles: ["ADMIN"] } satisfies AuthUser,
  purchase: { id: "t-purchase", name: "Test Purchase", roles: ["PURCHASE_EMPLOYEE"] } satisfies AuthUser,
  nobody: { id: "t-nobody", name: "No Role", roles: [] } satisfies AuthUser,
};

// Per-run suffix: ids stay unique so reruns on the same database do not see
// earlier runs' indents when counting or paging.
const RUN = Date.now().toString(36);

export function employee(id: string, departmentId: number): AuthUser {
  return { id: `${id}-${RUN}`, name: `Employee ${id}`, roles: ["DEPARTMENT_EMPLOYEE"], departmentId };
}

export function head(id: string, departmentId: number): AuthUser {
  return { id: `${id}-${RUN}`, name: `Head ${id}`, roles: ["DEPARTMENT_HEAD"], departmentId };
}

let cached: Promise<Fixtures> | undefined;

export function setupFixtures(): Promise<Fixtures> {
  cached ??= (async () => {
    const dept = (code: string) =>
      prisma.department.upsert({ where: { code }, update: { isActive: true }, create: { code, name: `Test ${code}` } });
    const [deptA, deptB] = await Promise.all([dept("TEST_A"), dept("TEST_B")]);
    const type = await prisma.indentType.upsert({
      where: { code: "TEST_TYPE" },
      update: { isActive: true },
      create: { code: "TEST_TYPE", name: "Test Type" },
    });
    const unit = await prisma.unit.upsert({
      where: { code: "TEST_UNIT" },
      update: { isActive: true },
      create: { code: "TEST_UNIT", name: "Test Unit" },
    });
    const item = async (code: string, name: string) =>
      prisma.item.upsert({
        where: { itemCode: code },
        update: { isActive: true },
        create: { itemCode: code, itemName: name, defaultUnitId: unit.id },
      });
    const stocked = await item("TST-000001", "Test Motor Starter");
    const unstocked = await item("TST-000002", "Test Unstocked Widget");
    const second = await item("TST-000003", "Test Second Item");
    await prisma.stockBalance.upsert({
      where: { itemId: stocked.id },
      update: { currentQuantity: 5, updatedAt: new Date() },
      create: { itemId: stocked.id, currentQuantity: 5, updatedAt: new Date() },
    });
    await prisma.stockBalance.deleteMany({ where: { itemId: unstocked.id } });
    return {
      deptA: deptA.id,
      deptB: deptB.id,
      typeId: type.id,
      unitId: unit.id,
      stockedItemId: stocked.id,
      unstockedItemId: unstocked.id,
      secondItemId: second.id,
    };
  })();
  return cached;
}

/** A valid create payload with one line; override any part. */
export function newIndent(f: Fixtures, over: Partial<CreateIndentInput> = {}): CreateIndentInput {
  return {
    indentTypeId: f.typeId,
    departmentId: f.deptA,
    items: [{ itemId: f.stockedItemId, requiredQuantity: "2", requiredUnitId: f.unitId, requiredDate: "2099-12-31" }],
    ...over,
  };
}

export function line(f: Fixtures, itemId: number, requiredQuantity = "1") {
  return { itemId, requiredQuantity, requiredUnitId: f.unitId, requiredDate: "2099-12-31" };
}

/** Rejects with an AppError carrying this code; fails the test otherwise. */
export async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  if (!caught) throw new Error(`Expected AppError ${code}, but the call succeeded.`);
  const got = (caught as { code?: string }).code;
  if (got !== code) throw new Error(`Expected AppError ${code}, got ${got ?? String(caught)}`);
}
