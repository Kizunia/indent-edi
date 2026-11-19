import Link from "next/link";
import { can } from "@/lib/server/auth/authorize";
import { guarded, pageUser } from "@/lib/server/page-guard";
import { listQuerySchema } from "@/lib/shared/schemas/indent";
import { listCreators, listIndents } from "@/lib/services/indents";
import { getMeta } from "@/lib/services/masters";
import FilterBar, { type FilterValues } from "@/components/indents/FilterBar";
import IndentListTable from "@/components/indents/IndentListTable";
import Pagination from "@/components/ui/Pagination";

export const metadata = { title: "Indents · Organize Indent System" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTER_KEYS = ["search", "indentTypeId", "departmentId", "statusId", "createdBy", "date", "dateFrom", "dateTo"] as const;

// FR-11..FR-15 (DEC-017): rendered on the server; filters and page live in the
// URL so refresh, back and shared links keep the same view.
export default async function IndentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await pageUser();
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined) flat[k] = value;
  }

  // Invalid filters (e.g. "to" before "from") fall back to the unfiltered list with a message.
  const parsed = listQuerySchema.safeParse(flat);
  const filterError = parsed.success ? undefined : parsed.error.issues[0]?.message ?? "Some filters are not valid.";
  const query = parsed.success ? parsed.data : { page: 1 };

  const [result, meta, creators] = await guarded(() =>
    Promise.all([listIndents(user, query), getMeta(), listCreators(user)])
  );

  const initial = Object.fromEntries(FILTER_KEYS.map((k) => [k, parsed.success ? String(query[k] ?? "") : ""])) as unknown as FilterValues;
  const exportFilters = Object.fromEntries(
    FILTER_KEYS.flatMap((k) => (parsed.success && query[k] !== undefined ? [[k, query[k] as string | number]] : []))
  );

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();
    for (const k of FILTER_KEYS) if (initial[k]) params.set(k, initial[k]);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/indents?${qs}` : "/indents";
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Indents</h1>
        {can(user, "indent.create") && (
          <Link href="/indents/new" className="btn btn-primary no-print">
            New Indent
          </Link>
        )}
      </div>

      <FilterBar meta={meta} creators={creators} initial={initial} error={filterError} />

      <IndentListTable
        items={result.items}
        total={result.total}
        filters={exportFilters}
        canExport={can(user, "indent.export")}
        canCreate={can(user, "indent.create")}
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} hrefFor={hrefFor} />
    </div>
  );
}
