"use client";

import { useState } from "react";

// Small inline "copy to clipboard" icon button (e.g. next to a return number).
export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-espresso/45 transition-colors hover:bg-espresso/[0.06] hover:text-espresso"
    >
      {done ? (
        <svg width="14" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      )}
    </button>
  );
}
