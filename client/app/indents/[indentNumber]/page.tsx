import Link from "next/link";
import { can } from "@/lib/server/auth/authorize";
import { getConfig } from "@/lib/server/config";
import { guarded, pageUser } from "@/lib/server/page-guard";
import { displayInstant, displayTime } from "@/lib/shared/format";
import { getIndent } from "@/lib/services/indents";
import { getMeta } from "@/lib/services/masters";
import IndentDetailView from "@/components/indents/IndentDetailView";
import StatusBadge from "@/components/ui/StatusBadge";

type Params = Promise<{ indentNumber: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { indentNumber } = await params;
  return { title: `${decodeURIComponent(indentNumber)} · Organize Indent System` };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="text-[13.5px]">{children}</dd>
    </div>
  );
}

// FR-14, UC-05 (DEC-017): the facts are rendered on the server; actions and
// Draft editing are a client island driven by the server's permission flags.
export default async function IndentDetailPage({ params }: { params: Params }) {
  const user = await pageUser();
  const { indentNumber } = await params;
  const config = getConfig();
  const [indent, meta] = await guarded(() => Promise.all([getIndent(user, decodeURIComponent(indentNumber)), getMeta()]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6">
      <nav aria-label="Breadcrumb" className="no-print text-[12.5px]">
        <Link href="/indents" className="text-[var(--accent)] hover:underline">← All indents</Link>
      </nav>

      {/* Print header block (DEC-026): visible only when printing. */}
      <div className="print-only mb-2 border-b border-black pb-2">
        <p className="text-sm font-bold">Organize Indent System</p>
        <p className="text-lg font-bold">{indent.indentNumber}</p>
        <p className="text-xs">
          Printed on {displayInstant(new Date().toISOString(), config.appTimezone)} by {user.name}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mono text-xl font-bold">{indent.indentNumber}</h1>
        <StatusBadge code={indent.status.code} name={indent.status.name} />
        {!can(user, "indent.edit") && indent.status.isEditable && <span className="text-[12.5px] text-[var(--ink-soft)]">View only</span>}
      </div>

      <section className="panel print-area p-4" aria-label="Indent information">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Indent Type">{indent.indentType.name}</Fact>
          <Fact label="Department">{indent.department?.name ?? "—"}</Fact>
          <Fact label="Date">{indent.indentDate}</Fact>
          <Fact label="Time">{displayTime(indent.indentTime)}</Fact>
          <Fact label="Created By">{indent.createdBy.name}</Fact>
          <Fact label="Created At">{displayInstant(indent.createdAt, config.appTimezone)}</Fact>
          {indent.submittedAt && <Fact label="Submitted At">{displayInstant(indent.submittedAt, config.appTimezone)}</Fact>}
          <Fact label="Remark">{indent.remark ?? "—"}</Fact>
        </dl>
      </section>

      <IndentDetailView
        indent={indent}
        meta={meta}
        canExport={can(user, "indent.export")}
        allowDuplicates={config.allowDuplicateItems}
      />
    </div>
  );
}
