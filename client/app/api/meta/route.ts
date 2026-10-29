import { NextResponse } from "next/server";
import { getDepartments, getIndentTypes } from "@/lib/repositories/masters";
import { userMessage } from "@/lib/db/errors";

// SRS §7.3 / §7.4: sourced from the (placeholder, local) Indent Type Master
// and Department Master. Swap the implementations in lib/repositories/masters.ts once the
// company confirms the real master-data source.
export async function GET() {
  try {
    const [departments, indentTypes] = await Promise.all([getDepartments(), getIndentTypes()]);
    return NextResponse.json({ departments, indentTypes });
  } catch (err) {
    return NextResponse.json({ error: userMessage(err, "Failed to load master data.") }, { status: 500 });
  }
}
