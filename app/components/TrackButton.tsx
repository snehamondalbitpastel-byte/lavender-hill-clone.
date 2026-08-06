"use client";

import { toast } from "sonner";

// "Track package" — until a courier is integrated there's no external tracking
// URL, so this copies the tracking number to the clipboard (and shows it), which
// is what the customer needs to paste into the courier's own tracking page.
export default function TrackButton({
  carrier,
  trackingNumber,
}: {
  carrier: string;
  trackingNumber: string;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast.success("Tracking number copied");
    } catch {
      toast.message(`Tracking number: ${trackingNumber}`);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-md border border-[#d4d0cb] bg-white px-4 py-2.5 text-[0.9rem] text-[#1a1a1a] transition-colors hover:bg-[#faf9f7]"
    >
      📦 Track package
      <span className="text-[0.8rem] text-[#6b6b6b]">
        {carrier ? `${carrier} · ` : ""}{trackingNumber}
      </span>
    </button>
  );
}
