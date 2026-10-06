"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// FR-21 / SRS §52: Delete, Save, Update, and Submit all require explicit
// confirmation before the action is carried out.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,26,44,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        className="panel"
        style={{ width: 380, padding: 20, background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 18 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
