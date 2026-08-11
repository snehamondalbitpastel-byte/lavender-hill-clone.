"use client";

import { useRef } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getBestsellerCards, type Card } from "@/lib/api";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

// "Our Bestselling T-Shirts" — a single-row carousel (drag + prev/next arrows),
// matching the live theme's scroll-carousel. More products load into the SAME row
// (horizontal scroll), never a second row. Fully data-driven; hides when empty.

// The theme's direction-aware arrow (left); flipped for "next".
function Arrow({ next = false }: { next?: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" fill="none" width={16} viewBox="0 0 16 18" className={next ? "rotate-180" : ""}>
      <path d="M11 1 3 9l8 8" stroke="currentColor" strokeLinecap="square" />
    </svg>
  );
}

export default function BestSellers() {
  const { data, loading } = useFetch<Card[]>(getBestsellerCards, "cards:bestseller");
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  // One card per product; strip the colour prefix so the title reads as the name.
  const items: Card[] = [];
  const seen = new Set<string>();
  for (const c of data ?? []) {
    if (seen.has(c.productSlug)) continue;
    seen.add(c.productSlug);
    const title =
      c.colour && c.title.startsWith(`${c.colour} `) ? c.title.slice(c.colour.length + 1) : c.title;
    items.push({ ...c, title });
  }

  if (!loading && items.length === 0) return null;

  // Scroll by ~one viewport of the row on prev/next.
  function page(dir: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }

  // Drag-to-scroll (desktop). A small movement threshold marks it a drag so the
  // release doesn't accidentally open the product under the cursor.
  const onDown = (e: React.MouseEvent) => {
    const el = scroller.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, startLeft: el.scrollLeft, moved: false };
  };
  const onMove = (e: React.MouseEvent) => {
    const el = scroller.current;
    if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const circle =
    "hidden md:flex absolute top-[38%] z-10 h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-espresso shadow-soft transition-colors hover:bg-espresso hover:text-cream";

  return (
    <section className="py-16 md:py-24 bg-beige">
      <div className="text-center mb-10 md:mb-14 px-4">
        <p className="eyebrow text-espresso/60 mb-3">Shop the favourites</p>
        <h2 className="text-2xl md:text-3xl">Our Bestselling T-Shirts</h2>
      </div>

      {/* Carousel — reduced side gap (px-4 / md:px-8) so it sits closer to the edges */}
      <div className="relative px-4 md:px-8">
        <button type="button" aria-label="Previous" onClick={() => page(-1)} className={`${circle} left-1`}>
          <Arrow />
        </button>

        <div
          ref={scroller}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClickCapture={onClickCapture}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x scroll-smooth cursor-grab select-none active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[74vw] sm:w-[42vw] md:w-[calc((100%-4.5rem)/4)]">
                  <ProductCardSkeleton />
                </div>
              ))
            : items.map((p) => (
                <div
                  key={p.id}
                  className="shrink-0 snap-start w-[74vw] sm:w-[42vw] md:w-[calc((100%-4.5rem)/4)]"
                >
                  <ProductCard p={p} colourHint={p.colour ?? undefined} />
                </div>
              ))}
        </div>

        <button type="button" aria-label="Next" onClick={() => page(1)} className={`${circle} right-1`}>
          <Arrow next />
        </button>
      </div>

      {/* Shop here → the full Bestsellers collection page */}
      <div className="mt-10 md:mt-14 text-center">
        <a href="/collections/bestsellers" className="btn-lh">Shop here</a>
      </div>
    </section>
  );
}
