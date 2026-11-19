"use client";

import { useId } from "react";
import type { ApiError } from "@/lib/client/api";
import Modal from "./Modal";

const TITLES: Record<string, string> = {
  VALIDATION_FAILED: "Please check the form",
  INDENT_EMPTY: "Add an item first",
  DUPLICATE_ITEM: "Item already added",
  NOT_EDITABLE: "Indent cannot be changed",
  VERSION_CONFLICT: "Indent was changed",
  STOCK_UNAVAILABLE: "Stock unavailable",
  FORBIDDEN: "Not allowed",
  UNAUTHENTICATED: "Not signed in",
  NOT_FOUND: "Not found",
  EXPORT_FAILED: "Export failed",
};

// FR-22 / SRS 12.3: every failure appears as a dialog with a plain message.
// Only the server's safe message and field errors are shown, never raw errors.
export default function ErrorDialog({
  error,
  onClose,
  onReload,
}: {
  error: ApiError | null;
  onClose: () => void;
  /** Offered for VERSION_CONFLICT: reloads the latest version. */
  onReload?: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const fields = error?.fieldErrors ? Object.values(error.fieldErrors) : [];
  const conflict = error?.code === "VERSION_CONFLICT" && onReload;
  return (
    <Modal open={error !== null} onClose={onClose} labelledBy={titleId} describedBy={bodyId} role="alertdialog">
      {error && (
        <div className="p-5">
          <h2 id={titleId} className="text-base font-bold text-[var(--red)]">
            {TITLES[error.code] ?? "Something went wrong"}
          </h2>
          <div id={bodyId} className="mt-2 text-sm">
            <p>{error.message}</p>
            {fields.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[var(--ink-soft)]">
                {fields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {conflict && (
              <button type="button" className="btn btn-primary" onClick={onReload}>
                Reload
              </button>
            )}
            <button type="button" className={`btn ${conflict ? "btn-secondary" : "btn-primary"}`} onClick={onClose} autoFocus={!conflict}>
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
