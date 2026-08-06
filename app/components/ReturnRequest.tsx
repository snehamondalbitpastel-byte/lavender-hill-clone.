"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Item = {
  index: number; title: string; colour: string; size: string; price: number; available: number;
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REASONS = ["Wrong size", "Damaged", "Defective / faulty", "Not as described", "Changed my mind", "Other"];
const MAX_IMAGES = 4;

// Customer return request. Per-item quantities + a structured reason + optional
// proof photos. The server re-checks every quantity.
export default function ReturnRequest({ orderId, items, note }: { orderId: number; items: Item[]; note?: ReactNode }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // Pre-select single-unit lines (ordered qty 1) so Submit is active without the
  // customer touching a dropdown. Multi-unit lines start at 0 → a quantity must
  // be chosen before Submit enables.
  const [qty, setQty] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.filter((it) => it.available === 1).map((it) => [it.index, 1]))
  );
  const [reasonCode, setReasonCode] = useState(REASONS[0]);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = items.map((it) => ({ index: it.index, qty: qty[it.index] || 0 })).filter((x) => x.qty > 0);
  const refundEstimate = items.reduce((sum, it) => sum + it.price * (qty[it.index] || 0), 0);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return toast.error(`Up to ${MAX_IMAGES} photos.`);
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/returns/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) setImages((prev) => [...prev, data.url]);
        else toast.error(data.error || "Upload failed.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (selected.length === 0) return toast.error("Choose at least one item to return.");
    const reason = comment.trim() ? `${reasonCode}: ${comment.trim()}` : reasonCode;
    setBusy(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, items: selected, reason, images }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Return requested (${data.returnNumber}).`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "Couldn't submit the return.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!open && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-[#d4d0cb] bg-white px-4 py-2.5 text-[0.9rem] text-[#1a1a1a] transition-colors hover:bg-[#faf9f7]"
          >
            ↩ Request a return
          </button>
          {note && <p className="text-[0.78rem] text-[#6b6b6b]">{note}</p>}
        </div>
      )}
      {/* Smoothly expand/collapse the form via the grid-rows 0fr↔1fr trick — no jump. */}
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
      <p className="mb-4 text-[0.95rem] font-semibold text-[#1a1a1a]">Request a return</p>

      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.index} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.9rem] text-[#1a1a1a]">{it.title}</p>
              <p className="text-[0.8rem] text-[#6b6b6b]">
                {[it.colour, it.size].filter(Boolean).join(" / ")} · {inr(it.price)} · up to {it.available}
              </p>
            </div>
            <select
              value={qty[it.index] || 0}
              onChange={(e) => setQty((q) => ({ ...q, [it.index]: Number(e.target.value) }))}
              className="h-9 rounded-md border border-[#d4d0cb] bg-white px-2 text-sm outline-none focus:border-[#1a1a1a]"
            >
              {Array.from({ length: it.available + 1 }, (_, n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {/* Reason (dropdown + optional comment) */}
      <label className="mt-4 block text-[0.8rem] text-[#6b6b6b]">Reason</label>
      <select
        value={reasonCode}
        onChange={(e) => setReasonCode(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-[#d4d0cb] bg-white px-3 text-sm outline-none focus:border-[#1a1a1a]"
      >
        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)…"
        className="mt-2 min-h-[60px] w-full resize-y rounded-md border border-[#d4d0cb] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1a1a]"
      />

      {/* Proof photos */}
      <label className="mt-4 block text-[0.8rem] text-[#6b6b6b]">Photos (optional — helpful for “Damaged”)</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-[#e5e5e5]">
            <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
              className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-black/55 text-xs text-white"
              aria-label="Remove"
            >×</button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-[#c9c4bd] text-2xl text-[#a7a29b] transition-colors hover:border-[#1a1a1a] disabled:opacity-50"
          >
            {uploading ? "…" : "+"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[0.85rem] text-[#6b6b6b]">
          {selected.length > 0 ? `Estimated refund: ${inr(refundEstimate)}` : "Select items to return"}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="px-3 text-[0.85rem] text-[#6b6b6b]">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || uploading || selected.length === 0}
            className="rounded-md bg-[#847a8a] px-4 py-2 text-[0.9rem] text-white transition-colors hover:bg-[#736979] disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit return"}
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
