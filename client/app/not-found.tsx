import Link from "next/link";

// Missing or out-of-scope indents land here (UC-05, FR-22). It never says which.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">Indent not found</h1>
      <p className="mt-2 text-[var(--ink-soft)]">We could not find what you were looking for. It may have been deleted, or you may not have access to it.</p>
      <Link href="/indents" className="btn btn-primary mt-5">Back to indents</Link>
    </div>
  );
}
