"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Internal warehouse note on a return — logged to the timeline, hidden from the
// customer. Its own card on the return detail page.
export default function ReturnNote({ returnId }: { returnId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const message = note.trim();
    if (!message) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Note added.");
        setNote("");
        router.refresh();
      } else {
        toast.error(data.error || "Couldn't add the note.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write internal note…"
        className="min-h-[70px] w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-espresso"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={add}
          disabled={busy || !note.trim()}
          className="rounded-md bg-espresso px-4 py-2 text-sm text-cream transition-colors hover:bg-espresso/90 disabled:opacity-50"
        >
          Add Note
        </button>
      </div>
    </div>
  );
}
