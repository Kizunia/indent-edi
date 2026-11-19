// Skeleton shown while a page under /indents is fetched on the server (DEC-017).
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6" role="status" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded bg-[var(--grey-soft)]" />
      <div className="panel h-32 animate-pulse bg-[var(--grey-soft)]" />
      <div className="panel space-y-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-[var(--grey-soft)]" />
        ))}
      </div>
    </div>
  );
}
