"use client";

import { useId, type ReactNode } from "react";
import Modal from "./Modal";

// FR-21 / SRS 12.2: explicit confirmation before Save, Update, Submit, Delete.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  extra,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** Optional extra action, e.g. "Update stock values". */
  extra?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} describedBy={bodyId} dismissible={!busy}>
      <div className="p-5">
        <h2 id={titleId} className="text-base font-bold">
          {title}
        </h2>
        <div id={bodyId} className="mt-2 text-sm text-[var(--ink-soft)]">
          {children}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {extra}
          {/* Delete defaults to Cancel so Enter cannot destroy data by accident. */}
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy} autoFocus={danger}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus={!danger}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
