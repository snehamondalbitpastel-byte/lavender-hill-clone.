"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

// Return status TRANSITION buttons. Status messaging is the page's info banner;
// the note lives in Warehouse Notes; the refund lives in ReturnRefundPanel.
//   requested → Approve / Reject · approved → Mark item received (confirm modal) ·
//   (received → refund in the Refund card; refunded / rejected → nothing here)
export default function ReturnActions({ returnId, status }: { returnId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const reasonBox =
    "min-h-[64px] w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-espresso";

  async function send(body: Record<string, unknown>, okMsg = "Return updated.") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.trackingNumber ? `Return label created — ${data.carrier} ${data.trackingNumber}` : okMsg);
        router.refresh();
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const primary = "w-full rounded-md bg-[#1f8f4e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a7a43] disabled:opacity-60";
  const danger = "w-full rounded-md border border-[#e2b8bf] bg-white px-4 py-2.5 text-sm text-[#a23140] transition-colors hover:bg-[#fdf1f3] disabled:opacity-60";

  if (status === "requested") {
    return (
      <div className="flex flex-col gap-2.5">
        <button type="button" disabled={busy} className={primary} onClick={() => send({ action: "approve" })}>✓ Approve Return</button>
        <button type="button" disabled={busy} className={danger} onClick={() => setConfirmReject(true)}>✕ Reject Return</button>
        <ConfirmModal
          open={confirmReject}
          title="Reject this return request?"
          message="The customer will be told their return was declined. Add a reason (optional) — it's shown to them."
          confirmLabel="Reject return"
          busyLabel="Rejecting…"
          busy={busy}
          onConfirm={() => send({ action: "reject", reason: rejectReason.trim() || undefined }, "Return rejected.").then(() => { setConfirmReject(false); setRejectReason(""); })}
          onCancel={() => { setConfirmReject(false); setRejectReason(""); }}
        >
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)…" className={reasonBox} autoFocus />
        </ConfirmModal>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <>
        <button type="button" disabled={busy} className={primary} onClick={() => setConfirmReceive(true)}>Mark item received</button>
        <ConfirmModal
          open={confirmReceive}
          title="Mark the item as received?"
          message="Confirm the returned parcel has arrived at the warehouse. You can then process the refund below."
          confirmLabel="Yes, received"
          busyLabel="Saving…"
          busy={busy}
          onConfirm={() => send({ action: "receive" }, "Marked as received.").then(() => setConfirmReceive(false))}
          onCancel={() => setConfirmReceive(false)}
        />
      </>
    );
  }
  return null; // received (refund in the Refund card) / refunded / rejected → status shown by the page banner
}
