// Status badge: text plus colour, so colour is never the only signal (NFR-03).
const CLASS_BY_CODE: Record<string, string> = {
  DRAFT: "badge-draft",
  SUBMITTED: "badge-submitted",
  PENDING_APPROVAL: "badge-pending",
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
  CANCELLED: "badge-cancelled",
};

export default function StatusBadge({ code, name }: { code: string; name: string }) {
  return <span className={`badge ${CLASS_BY_CODE[code] ?? "badge-draft"}`}>{name}</span>;
}
