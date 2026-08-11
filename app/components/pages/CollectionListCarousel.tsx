"use client";

import { useRef } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getCollections, type Collection } from "@/lib/api";

// collection_list "Discover Our Collections" — a horizontal scroll carousel of
// collection cards fetched LIVE (admin picks handles; empty → all). Card width
// 84vw (mobile) → 62vw (≥700) → 4-up (≥1150); gap 1.5rem → 1.875rem. Each card is
// a portrait image with a 0.3 overlay, title (.h3) + "View products" bottom-left,
// and a hover zoom. Prev/next circle buttons appear on hover and scroll the row.
const handleOf = (href: string) => href.split("/").filter(Boolean).pop() || "";
const H2 = "text-[clamp(1.375rem,1.174rem+0.858vw,1.925rem)]";
const H3 = "text-[clamp(1.2375rem,1.137rem+0.43vw,1.5125rem)]";

export default function CollectionListCarousel({ heading, handles }: { heading?: string; handles: string[] }) {
  const { data } = useFetch<Collection[]>(() => getCollections(), "collections");
  const all = data ?? [];
  const chosen =
    handles.length > 0
      ? handles.map((h) => all.find((c) => handleOf(c.href) === h)).filter((c): c is Collection => Boolean(c))
      : all;

  const rowRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : row.clientWidth * 0.8;
    row.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // Render the section + heading immediately (SSR); the cards fetch client-side.
  if (!heading && chosen.length === 0) return null;

  return (
    <section className="border-t border-line bg-cream py-10 min-[1000px]:py-16">
      {/* section-stack */}
      <div className="flex flex-col gap-9 min-[1000px]:gap-12">
        {heading && <h2 className={`${H2} px-5 text-center min-[700px]:px-8 min-[1000px]:px-12`}>{heading}</h2>}

        {/* group → prev/next circle buttons reveal on hover */}
        <div className={`group/carousel relative ${chosen.length === 0 ? "hidden" : ""}`}>
          <div
            ref={rowRef}
            className="no-scrollbar flex snap-x gap-6 overflow-x-auto scroll-smooth px-5 min-[700px]:px-8 min-[1000px]:px-12 min-[1150px]:gap-[1.875rem]"
          >
            {chosen.map((c) => (
              <a
                key={c.id}
                href={c.href}
                data-card
                className="group/card relative aspect-[2/3] w-[84vw] shrink-0 snap-center overflow-hidden min-[700px]:w-[62vw] min-[1150px]:w-[calc(25%-1.40625rem)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-5 text-cream">
                  <h3 className={H3}>{c.title}</h3>
                  <span className="inline-block border border-cream/85 px-4 py-2 text-[0.7rem] uppercase tracking-[0.2em] transition-colors group-hover/card:bg-cream group-hover/card:text-espresso">
                    View products
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Prev / Next — circle buttons, revealed on hover */}
          <CircleButton dir={-1} onClick={() => scrollByCard(-1)} />
          <CircleButton dir={1} onClick={() => scrollByCard(1)} />
        </div>
      </div>
    </section>
  );
}

function CircleButton({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  const prev = dir === -1;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? "Previous" : "Next"}
      className={`absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-espresso opacity-0 shadow-soft transition-opacity duration-200 group-hover/carousel:opacity-100 min-[1000px]:flex ${
        prev ? "left-6" : "right-6"
      }`}
    >
      <svg aria-hidden="true" fill="none" width="16" viewBox="0 0 16 18" className={prev ? "" : "rotate-180"}>
        <path d="M11 1 3 9l8 8" stroke="currentColor" strokeLinecap="square" />
      </svg>
    </button>
  );
}
