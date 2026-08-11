"use client";

import { useEffect, useState } from "react";
import { SIZE_GUIDE, type SizeGuide } from "@/lib/size-guide";

// The shared Size Guide modal — opened from a product's "Size chart" link when the
// product uses UK sizing. Content is the ONE constant guide (lib/size-guide.ts),
// fetched from /api/size-guide already localized for the shopper's language. We
// seed with the English constant so the table (numbers never change) shows
// instantly, then swap in the localized copy when the fetch resolves.
//
// Layout mirrors the live modal: a fixed-width card (max 45rem) with the whole
// panel scrolling internally (max-height 85dvh), cream dialog scheme.
export default function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const [g, setG] = useState<SizeGuide>(SIZE_GUIDE);

  // Close on Escape, and lock the page scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Localized copy for the caller's language (base locale → identical to the seed).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/size-guide")
      .then((r) => r.json())
      .then((d: SizeGuide) => { if (!cancelled && d?.rows) setG(d); })
      .catch(() => { /* keep the English seed */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={g.title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[85dvh] w-full max-w-[45rem] flex-col overflow-y-auto bg-beige text-espresso shadow-xl">
        {/* Header — centered title + close (matches SIZE GUIDE header on live) */}
        <div className="relative border-b border-line px-5 py-3.5 sm:px-8 sm:py-[1.125rem]">
          <span className="block text-center text-sm uppercase tracking-[0.2em] font-heading">{g.title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-espresso/70 transition-colors hover:text-espresso sm:right-6"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <p className="mx-auto max-w-[36rem] text-center text-sm leading-relaxed text-espresso/90">{g.intro}</p>

          {/* Measurements table — scrolls horizontally on narrow screens */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {g.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line pb-3 pr-4 text-left text-xs font-normal uppercase tracking-[0.1em] text-espresso/60">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.size} className="border-b border-line/60 align-top last:border-b-0">
                    <td className="whitespace-nowrap py-4 pr-4">{r.size}</td>
                    <td className="whitespace-nowrap py-4 pr-4">{r.uk}</td>
                    <td className="whitespace-nowrap py-4 pr-4">{r.us}</td>
                    <td className="whitespace-nowrap py-4 pr-4">{r.eu}</td>
                    <td className="whitespace-nowrap py-4 pr-4 leading-snug">{r.bust[0]}<br />{r.bust[1]}</td>
                    <td className="whitespace-nowrap py-4 pr-4 leading-snug">{r.waist[0]}<br />{r.waist[1]}</td>
                    <td className="whitespace-nowrap py-4 leading-snug">{r.hips[0]}<br />{r.hips[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How To Measure */}
          <div className="mt-10 text-center">
            <h2 className="text-base uppercase tracking-[0.2em] font-heading">{g.howToTitle}</h2>
            <div className="mt-5 flex flex-col gap-5">
              {g.howTo.map((h) => (
                <div key={h.term}>
                  <h3 className="text-sm uppercase tracking-[0.15em] font-heading">{h.term}</h3>
                  <p className="mx-auto mt-1.5 max-w-[42rem] text-sm leading-relaxed text-espresso/80">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
