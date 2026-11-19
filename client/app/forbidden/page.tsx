import Link from "next/link";

export const metadata = { title: "Not allowed · Organize Indent System" };

// NFR-09: shown when the signed-in user's role does not allow the page.
export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">You do not have permission to do this</h1>
      <p className="mt-2 text-[var(--ink-soft)]">Ask an administrator if you need access.</p>
      <Link href="/indents" className="btn btn-primary mt-5">Back to indents</Link>
    </div>
  );
}
