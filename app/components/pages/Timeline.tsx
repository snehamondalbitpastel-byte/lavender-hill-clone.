"use client";

import { useState } from "react";
import type { ItemRecord } from "@/lib/sections";

// timeline — a tabbed carousel. The selected item shows a square image beside its
// heading (.h2) + text; a centred row of tab buttons (column-gap 2.5rem) selects
// the item. container--md. On mobile the text overlays the image in white
// (--timeline-item-mobile-text-color: 255 255 255). Matches the live Our Story.
const H2 = "text-[clamp(1.375rem,1.174rem+0.858vw,1.925rem)]";
const BODY = "text-[0.9375rem] leading-[1.65]";

export default function Timeline({ heading, items }: { heading?: string; items: ItemRecord[] }) {
  const [sel, setSel] = useState(0);
  if (items.length === 0) return null;
  const active = items[Math.min(sel, items.length - 1)];

  return (
    <section className="bg-cream py-10 min-[1000px]:py-16">
      <div className="mx-auto max-w-[71.875rem] px-5 min-[700px]:px-8 min-[1000px]:px-12">
        {heading && <h2 className={`${H2} mb-8 text-center`}>{heading}</h2>}

        {/* Selected item — image + content */}
        <div className="grid gap-8 min-[700px]:grid-cols-2 min-[700px]:items-center min-[700px]:gap-12">
          <div className="relative aspect-square w-full overflow-hidden bg-espresso/5">
            {active.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.image} alt={active.alt || ""} className="absolute inset-0 h-full w-full object-cover" />
            )}
            {/* Mobile: text overlaid in white over a bottom gradient */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 to-transparent p-6 text-cream min-[700px]:hidden">
              {active.heading && <h3 className={`${H2} mb-2`}>{active.heading}</h3>}
              {active.body && <p className={BODY}>{active.body}</p>}
            </div>
          </div>

          {/* Desktop: content beside the image */}
          <div key={active.nav || active.heading} className="hidden animate-[fadeIn_0.4s_ease] min-[700px]:block">
            {active.heading && <h2 className={`${H2} mb-3`}>{active.heading}</h2>}
            {active.body && <p className={BODY}>{active.body}</p>}
          </div>
        </div>

        {/* Tab nav — centred (safe center), 2.5rem column-gap; scrolls on mobile */}
        <div className="no-scrollbar mt-8 flex flex-nowrap justify-start gap-10 overflow-x-auto min-[700px]:mt-12 min-[700px]:justify-center">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              aria-current={i === sel}
              className={`whitespace-nowrap font-heading text-[0.8125rem] uppercase tracking-[0.14em] transition-colors ${
                i === sel
                  ? "text-espresso underline decoration-1 underline-offset-8"
                  : "text-espresso/40 hover:text-espresso"
              }`}
            >
              {it.nav || it.heading || `Item ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
