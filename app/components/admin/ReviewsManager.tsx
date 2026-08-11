"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Row = {
  id: number;
  productTitle: string;
  productSlug: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  verified: boolean;
  up: number;
  down: number;
  date: string;
};

// Compact star rating for the admin table (N filled of 5).
function MiniStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`${rating} / 5`} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z"
            fill={i < rating ? "#3A2F22" : "none"}
            stroke="#3A2F22"
            strokeOpacity={i < rating ? 1 : 0.35}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewsManager({ reviews }: { reviews: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null); // two-step delete
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "hidden">("all");

  const filtered = reviews.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (q.trim() === "") return true;
    const hay = `${r.productTitle} ${r.author} ${r.title} ${r.body}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  async function setStatusOf(id: number, next: "published" | "hidden") {
    setBusy(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setBusy(null);
    if (res && res.ok) {
      toast.success(next === "hidden" ? "Review hidden" : "Review published");
      router.refresh();
    } else {
      toast.error("Could not update the review.");
    }
  }

  async function remove(id: number) {
    setBusy(id);
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    setConfirmId(null);
    if (res && res.ok) {
      toast.success("Review deleted");
      router.refresh();
    } else {
      toast.error("Could not delete the review.");
    }
  }

  const counts = {
    all: reviews.length,
    published: reviews.filter((r) => r.status === "published").length,
    hidden: reviews.filter((r) => r.status === "hidden").length,
  };

  return (
    <div>
      {/* toolbar: status tabs + search */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-line bg-white p-0.5 text-sm">
          {(["all", "published", "hidden"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1.5 capitalize transition-colors ${
                status === s ? "bg-espresso text-cream" : "text-espresso/70 hover:text-espresso"
              }`}
            >
              {s} <span className="tabular-nums opacity-70">({counts[s]})</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search product, reviewer, text…"
          className="w-full max-w-xs border border-line bg-white px-3 py-2 text-sm outline-none focus:border-espresso"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-line bg-white py-16 text-center text-sm text-espresso/55">
          {reviews.length === 0 ? "No reviews yet." : "No reviews match your filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-white">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-espresso/50">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Reviewer</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Helpful</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-b border-line/70 align-top ${r.status === "hidden" ? "opacity-55" : ""}`}>
                  <td className="px-4 py-3">
                    {r.productSlug ? (
                      <a href={`/products/${r.productSlug}`} target="_blank" rel="noreferrer" className="text-espresso hover:text-taupe transition-colors">
                        {r.productTitle}
                      </a>
                    ) : (
                      <span className="text-espresso">{r.productTitle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-espresso">{r.author}</span>
                    {r.verified && <span className="mt-0.5 block text-[11px] text-espresso/50">Verified Buyer</span>}
                  </td>
                  <td className="px-4 py-3"><MiniStars rating={r.rating} /></td>
                  <td className="max-w-[22rem] px-4 py-3">
                    {r.title && <p className="font-medium text-espresso">{r.title}</p>}
                    <p className="mt-0.5 line-clamp-3 text-espresso/70">{r.body}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-espresso/70 tabular-nums">▲ {r.up} · ▼ {r.down}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.status === "published" ? "bg-[#d4e3cb] text-[#307a07]" : "bg-beige text-espresso/60"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-espresso/60">{r.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => setStatusOf(r.id, r.status === "published" ? "hidden" : "published")}
                        className="rounded border border-line px-2.5 py-1 text-xs text-espresso/80 transition-colors hover:border-espresso disabled:opacity-50"
                      >
                        {r.status === "published" ? "Hide" : "Show"}
                      </button>
                      {confirmId === r.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => remove(r.id)}
                            className="rounded bg-[#b23a3a] px-2.5 py-1 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="px-1 text-xs text-espresso/50 hover:text-espresso"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="rounded border border-[#b23a3a]/40 px-2.5 py-1 text-xs text-[#b23a3a] transition-colors hover:border-[#b23a3a]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
