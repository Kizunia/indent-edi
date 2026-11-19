"use client";

import { useEffect } from "react";

// Unexpected server errors (FR-22): a plain message and a retry. Next.js hides
// the real message in production; only the digest reference is shown.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl p-8 text-center" role="alert">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-[var(--ink-soft)]">We could not load this page. Please try again.</p>
      {error.digest && <p className="mt-1 text-xs text-[var(--ink-soft)]">Reference: {error.digest}</p>}
      <button type="button" className="btn btn-primary mt-5" onClick={() => retry()}>Try again</button>
    </div>
  );
}
