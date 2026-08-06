"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Refund control on the admin order detail. Supports FULL (the "Full" button
// pre-fills the whole remaining amount) or PARTIAL (type a smaller amount).
// The server re-validates every rule; this is just the control surface.
export default function RefundPanel({
  orderId,
  total,
  refundedAmount,
  paymentStatus,
}: {
  orderId: number;
  total: number;
  refundedAmount: number;
  paymentStatus: string;
}) {
  const router = useRouter();
  const remaining = Math.round((total - refundedAmount) * 100) / 100;
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [busy, setBusy] = useState(false);

  // Nothing to refund: not paid, or already fully refunded.
  if ((paymentStatus !== "paid" && paymentStatus !== "partially_refunded") || remaining <= 0) {
    if (refundedAmount > 0) {
      return (
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-2">Refund</h2>
          <p className="text-sm text-espresso/60">Fully refunded ({inr(refundedAmount)}).</p>
        </div>
      );
    }
    return null;
  }

  async function refund() {
    const amt = Math.round(Number(amount) * 100) / 100;
    if (!(amt > 0)) return toast.error("Enter a valid amount.");
    if (amt > remaining + 0.001) return toast.error(`Maximum refundable is ${inr(remaining)}.`);
    if (!confirm(`Refund ${inr(amt)} to the customer? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", amount: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Refund processed.");
        router.refresh();
      } else {
        toast.error(data.error || "Refund failed.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
      <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-3">Refund</h2>
      <p className="mb-3 text-xs text-espresso/55">
        Refundable: <span className="font-medium text-espresso/80">{inr(remaining)}</span>
        {refundedAmount > 0 && <> · already refunded {inr(refundedAmount)}</>}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-espresso/50">₹</span>
          <input
            type="number"
            min="0"
            step="0.01"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 w-full rounded-md border border-line bg-white pl-7 pr-3 text-sm outline-none focus:border-espresso"
          />
        </div>
        <button
          type="button"
          onClick={() => setAmount(remaining.toFixed(2))}
          className="rounded-md border border-line bg-white px-3 text-xs text-espresso/70 transition-colors hover:bg-espresso/[0.04]"
        >
          Full
        </button>
      </div>
      <button
        type="button"
        onClick={refund}
        disabled={busy}
        className="mt-3 w-full rounded-md bg-[#a23140] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#8f2937] disabled:opacity-60"
      >
        {busy ? "Processing…" : "Process refund"}
      </button>
    </div>
  );
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
