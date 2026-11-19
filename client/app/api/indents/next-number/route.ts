import { requireUser } from "@/lib/server/auth/current-user";
import { apiRoute } from "@/lib/server/http/handler";
import { getExpectedNumber } from "@/lib/services/indents";

// GET /api/indents/next-number: preview only, reserves nothing (DEC-010).
export const GET = apiRoute(async () => {
  const user = await requireUser();
  return Response.json({ expectedNumber: await getExpectedNumber(user) });
});
