"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Search box for the customers list — searches by email or name, and clears
// properly (not just the text).
export default function CustomerSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  function go(query: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    router.push(`/admin/customers${qs ? `?${qs}` : ""}`);
  }

  function clear() {
    setQ("");
    go("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="relative w-72 max-w-full"
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by email or name…"
        className="border border-line rounded-md pl-3 pr-9 py-2 text-sm bg-white text-espresso w-full focus:outline-none focus:border-espresso"
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-espresso/50 hover:text-espresso hover:bg-line/60 flex items-center justify-center"
        >
          <svg width="10" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
      )}
    </form>
  );
}
