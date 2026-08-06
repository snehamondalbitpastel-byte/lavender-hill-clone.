"use client";

import type { ReactNode } from "react";

// A small, brand-styled confirmation dialog (Yes / Cancel). Controlled by the
// caller via `open`. Replaces window.confirm()/prompt() for destructive or
// decision actions. Optional `children` render extra content (e.g. a reason
// input) between the message and the buttons; `confirmDisabled` gates confirm.
// Text is centred and wraps inside the box (no overflow), title kept short.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busyLabel = "Deleting…",
  busy = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    // `whitespace-normal` resets any inherited `white-space: nowrap` — the modal
    // is often rendered inside a table's actions cell (which sets nowrap), and
    // white-space inherits through the DOM even to a position:fixed descendant.
    <div className="fixed inset-0 z-[70] flex items-center justify-center whitespace-normal p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-espresso/40" onClick={busy ? undefined : onCancel} />
      <div className="relative z-[1] w-full max-w-sm overflow-hidden rounded-xl border border-line bg-cream p-6 text-center shadow-soft-lg">
        <p className="text-base font-medium text-espresso break-words">{title}</p>
        {message && (
          <p className="mt-2 text-sm leading-relaxed text-espresso/65 break-words">{message}</p>
        )}
        {children && <div className="mt-4 text-left">{children}</div>}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-5 py-2 text-sm text-espresso/70 hover:bg-espresso/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className="rounded-md bg-[#b23a3a] px-5 py-2 text-sm text-white hover:bg-[#9c2f2f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
