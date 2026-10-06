import { NextResponse } from "next/server";
import { getDepartments, getIndentTypes } from "@/lib/store";

// SRS §7.3 / §7.4: sourced from the (placeholder, local) Indent Type Master
// and Department Master. Swap the implementations in lib/store.ts once the
// company confirms the real master-data source.
export async function GET() {
  return NextResponse.json({
    departments: getDepartments(),
    indentTypes: getIndentTypes(),
  });
}
