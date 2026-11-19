import type { ReactNode } from "react";

// Label + control + error, correctly associated (NFR-03). The caller passes the
// same `id` to the control and uses `describedBy(id)` for aria-describedby.
export const errorId = (id: string) => `${id}-error`;
export const hintId = (id: string) => `${id}-hint`;

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const parts = [error ? errorId(id) : "", hint ? hintId(id) : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export default function Field({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={`field-label ${required ? "field-required" : ""}`}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId(id)} className="mt-1 text-xs text-[var(--ink-soft)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(id)} className="mt-1 text-xs text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}
