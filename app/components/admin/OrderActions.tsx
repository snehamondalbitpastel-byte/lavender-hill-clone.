"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Fulfillment control panel on the admin order detail page. The SERVER decides
// what's allowed (which next step, whether cancel is possible) and passes it in;
// this component just renders the controls and calls the PATCH endpoint. Keeping
// the decision server-side means the UI can never offer an illegal transition.
export default function OrderActions({
  orderId,
  nextStatus,
  nextLabel,
  canCancel,
  trackingCarrier,
  trackingNumber,
}: {
  orderId: number;
  nextStatus: string | null; // next fulfillment step, or null if delivered/cancelled
  nextLabel: string | null; // human label for that step
  canCancel: boolean;
  trackingCarrier: string; // saved carrier once shipped (read-only display)
  trackingNumber: string; // saved AWB once shipped (read-only display)
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  const needsTracking = nextStatus === "shipped";

  async function send(body: Record<string, unknown>, okMsg: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(okMsg);
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

  function advance() {
    if (!nextStatus) return;
    if (needsTracking && (!carrier.trim() || !tracking.trim())) {
      toast.error("Enter both the carrier and the tracking number to mark this as shipped.");
      return;
    }
    send(
      {
        action: "fulfillment",
        to: nextStatus,
        trackingCarrier: carrier.trim(),
        trackingNumber: tracking.trim(),
      },
      `Order marked as ${nextLabel}.`
    );
  }

  function cancel() {
    if (!confirm("Cancel this order? This can't be undone.")) return;
    send({ action: "cancel" }, "Order cancelled.");
  }

  function addNote() {
    const message = note.trim();
    if (!message) return;
    send({ action: "note", message }, "Note added.").then(() => setNote(""));
  }

  // Mock "courier API": the server assigns a carrier + AWB and ships the order.
  async function generate() {
    if (busy || generating) return;
    setBusy(true);
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 700)); // simulate API latency (spinner)
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-shipment" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Shipment created — ${data.carrier} ${data.trackingNumber}`);
        router.refresh();
      } else {
        toast.error(data.error || "Couldn't generate shipment.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
      setGenerating(false);
    }
  }

  return (
    <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
      <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-4">Fulfillment</h2>

      {/* Once shipped, keep the tracking on view (read-only) so it doesn't vanish. */}
      {trackingNumber && (
        <div className="mb-4 rounded-md border border-line bg-white/60 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-espresso/50">Tracking</p>
          <p className="mt-0.5 text-sm text-espresso">
            {trackingCarrier ? `${trackingCarrier} · ` : ""}
            <span className="font-medium">{trackingNumber}</span>
          </p>
        </div>
      )}

      {nextStatus ? (
        needsTracking ? (
          // Shipping step — compact, balanced layout: carrier + tracking share one
          // row, and the two actions (manual / mock-courier) sit side-by-side.
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-espresso"
                placeholder="Carrier *"
                title="Carrier — e.g. Delhivery, Blue Dart"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
              <input
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-espresso"
                placeholder="Tracking no. *"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={advance}
                disabled={busy || !carrier.trim() || !tracking.trim()}
                className="flex items-center justify-center rounded-md bg-espresso px-2 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-espresso/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy && !generating ? "Working…" : "Mark as shipped"}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={busy}
                title="Generate a mock-courier shipment (auto carrier + tracking)"
                className="flex items-center justify-center gap-1.5 rounded-md border border-espresso/25 bg-white px-2 py-2.5 text-[13px] text-espresso transition-colors hover:bg-espresso/[0.04] disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-espresso/25 border-t-espresso" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  "⚡ Generate shipment"
                )}
              </button>
            </div>
          </div>
        ) : (
          // Non-shipping steps have a single action — keep the full-width button.
          <button
            type="button"
            onClick={advance}
            disabled={busy}
            className="btn-lh w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Working…" : `Mark as ${nextLabel}`}
          </button>
        )
      ) : (
        <p className="text-sm text-espresso/55">No further fulfillment steps.</p>
      )}

      {canCancel && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="text-xs text-[#a23140] underline underline-offset-2 transition-colors hover:text-[#8f2937] disabled:opacity-60"
          >
            Cancel order
          </button>
        </div>
      )}

      {/* Internal note → appended to the timeline (not emailed to the customer). */}
      <div className="mt-5 border-t border-line pt-4">
        <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-espresso/50">
          Add a note
        </label>
        <div className="flex gap-2">
          <input
            className="h-10 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-espresso"
            placeholder="Internal note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={busy || !note.trim()}
            className="rounded-md border border-line bg-white px-3 text-sm text-espresso/80 transition-colors hover:bg-espresso/[0.04] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
