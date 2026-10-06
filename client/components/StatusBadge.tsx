const CLASS_MAP: Record<string, string> = {
  Draft: "badge-draft",
  Submitted: "badge-submitted",
  "Pending Approval": "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
  Cancelled: "badge-cancelled",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = CLASS_MAP[status] || "badge-draft";
  return <span className={`badge ${cls}`}>{status}</span>;
}
