import { redirect } from "next/navigation";
import { can } from "@/lib/server/auth/authorize";
import { getConfig } from "@/lib/server/config";
import { guarded, pageUser } from "@/lib/server/page-guard";
import { businessDate, businessTime } from "@/lib/shared/datetime";
import { getExpectedNumber } from "@/lib/services/indents";
import { getMeta } from "@/lib/services/masters";
import NewIndentForm from "@/components/indents/NewIndentForm";

export const metadata = { title: "New Indent · Organize Indent System" };

// UC-01 (DEC-017): server shell. Masters, the user, the server clock and the
// expected number are loaded here; the form is a client island.
export default async function NewIndentPage() {
  const user = await pageUser();
  if (!can(user, "indent.create")) redirect("/forbidden");
  const config = getConfig();
  const now = new Date();
  const [meta, expectedNumber] = await guarded(() => Promise.all([getMeta(), getExpectedNumber(user)]));

  return (
    <NewIndentForm
      meta={meta}
      expectedNumber={expectedNumber}
      indentDate={businessDate(now, config.appTimezone)}
      indentTime={businessTime(now, config.appTimezone)}
      createdBy={user.name}
      defaultDepartmentId={user.departmentId ?? null}
      canSubmit={can(user, "indent.submit")}
      allowDuplicates={config.allowDuplicateItems}
    />
  );
}
