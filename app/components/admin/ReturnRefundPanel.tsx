"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The "Refund (After Approval & Item Inspection)" card. Summary row on top;
// restock toggle + Process Refund below. The refund button unlocks ONLY once the
// item has been received AND the admin ticks the restock checkbox.
export default function ReturnRefundPanel({
  returnId,
  status,
  refundAmount,
  paymentMethod,
}: {
  returnId: number;
  status: string;
  refundAmount: number;
  paymentMethod: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Unchecked by default — the admin must confirm the restock to unlock the refund.
  const [restock, setRestock] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ready = status === "received";
  const done = status === "refunded";
  // Terminal "no refund" outcomes — the refund is closed off, not merely pending.
  const closed = status === "rejected" || status === "cancelled";

  async function doRefund() {
    if (!ready || busy || !restock) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", restocked: restock }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Refund processed."); setConfirmOpen(false); router.refresh(); }
      else toast.error(data.error || "Refund failed.");
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-cream p-5 shadow-soft">
      <h2 className="text-sm font-medium text-espresso">Refund <span className="text-espresso/45">(After the item is received)</span></h2>

      {/* Row 1 — summary */}
      <div className="mt-4 flex flex-wrap gap-x-12 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-espresso/55">Refund Amount</p>
          <p className="font-medium text-espresso">{inr(refundAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-espresso/55">Refund Method</p>
          <p className="text-espresso">{paymentMethod}</p>
        </div>
      </div>

      {/* Row 2 — controls */}
      <div className="mt-4 border-t border-line pt-4">
        {done ? (
          <p className="rounded-md bg-[#d4e3cb] px-3 py-2 text-sm text-[#307a07]">✓ Refund processed — this return has been refunded.</p>
        ) : closed ? (
          <p className="rounded-md bg-[#f4d6da] px-3 py-2 text-sm text-[#a23140]">✕ Return closed — no refund will be issued.</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-espresso/80">
              <input type="checkbox" checked={restock} disabled={!ready} onChange={(e) => setRestock(e.target.checked)} />
              Return item to inventory (restock)
            </label>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!ready || busy || !restock}
              className="mt-4 w-full rounded-md bg-[#a23140] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8f2937] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {busy ? "Processing…" : `Process Refund · ${inr(refundAmount)}`}
            </button>
            {!ready ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-espresso/50">
                <span aria-hidden="true">🛈</span> Refund will be initiated after the item is received.
              </p>
            ) : !restock ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-espresso/50">
                <span aria-hidden="true">🛈</span> Tick “Return item to inventory (restock)” to enable the refund.
              </p>
            ) : null}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Process this refund?"
        message={`Refund ${inr(refundAmount)} to the customer's original payment method (${paymentMethod})? This can't be undone.`}
        confirmLabel="Yes, refund"
        busyLabel="Processing…"
        busy={busy}
        onConfirm={doRefund}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
