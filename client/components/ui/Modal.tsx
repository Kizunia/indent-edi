"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Accessible modal built on the native <dialog>: the browser traps focus,
// handles Escape and returns focus to the opener (DEC-020, NFR-03).
export default function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  /** false while a request is running: Escape does nothing. */
  dismissible?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal no-print"
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault(); // we control closing through `open`
        if (dismissible) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
