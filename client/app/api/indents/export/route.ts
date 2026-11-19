import { Readable } from "node:stream";
import { requireUser } from "@/lib/server/auth/current-user";
import { getConfig } from "@/lib/server/config";
import { streamIndentsWorkbook } from "@/lib/server/export/indents-xlsx";
import { apiRoute, parseJson } from "@/lib/server/http/handler";
import { fileTimestamp } from "@/lib/shared/datetime";
import { exportSchema } from "@/lib/shared/schemas/indent";
import { selectExportIds } from "@/lib/services/export";

// exceljs needs Node APIs; the response is streamed so large exports stay flat in memory.
export const runtime = "nodejs";

// POST /api/indents/export: selected indents, or everything matching the list filters (FR-19).
// Authorization and validation happen before streaming starts, so they still give a normal error response.
export const POST = apiRoute(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, exportSchema);
  const ids = await selectExportIds(user, input);
  const { appTimezone } = getConfig();
  const filename = `indents-${fileTimestamp(new Date(), appTimezone)}.xlsx`;
  const stream = Readable.toWeb(streamIndentsWorkbook(ids, appTimezone)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
