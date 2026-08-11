"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemRecord } from "@/lib/sections";

// images_with_text_scroll — the scroll-telling section.
//   Desktop (≥1000px): the stage PINS (sticky, one viewport tall). A 2-column
//     grid holds the square image (LEFT, ~min(50vw−gutter, 575px)) and its
//     paragraph (RIGHT), vertically centred. As you scroll, ONE item is shown at
//     a time — the active image + text cross-fade quickly to the next (no ghosty
//     triple-overlap). Driven by scroll position, so it only moves as you scroll.
//   Mobile (<1000px): a horizontal swipe carousel with page dots.
// Beige background (color-scheme--scheme-2), container--md, text left-aligned.

const H3 = "text-[clamp(1.2375rem,1.137rem+0.43vw,1.5125rem)]";
const BODY = "text-espresso text-[0.9375rem] leading-[1.65]";

export default function ScrollCarousel({ items }: { items: ItemRecord[] }) {
  const count = items.length;

  // ---- Desktop: discrete active item from scroll position ----
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (count === 0) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = trackRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight; // scroll distance while pinned
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), Math.max(total, 1));
      const p = total > 0 ? scrolled / total : 0;
      setActive(Math.min(count - 1, Math.max(0, Math.floor(p * count))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count]);

  // ---- Mobile: swipe carousel active dot ----
  const rowRef = useRef<HTMLDivElement>(null);
  const [mActive, setMActive] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onScroll = () => setMActive(Math.round(row.scrollLeft / row.clientWidth));
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => row.removeEventListener("scroll", onScroll);
  }, [count]);
  const gotoMobile = (i: number) => {
    const row = rowRef.current;
    if (row) row.scrollTo({ left: i * row.clientWidth, behavior: "smooth" });
  };

  if (count === 0) return null;

  return (
    <>
      {/* ---------- Desktop: pinned 2-col stage, one item at a time (≥1000px) ---------- */}
      <div ref={trackRef} className="relative hidden bg-beige min-[1000px]:block" style={{ height: `${count * 90}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-[71.875rem] grid-cols-2 items-center gap-12 px-8 min-[1000px]:px-12">
            {/* Image (LEFT, square, ≤575px, centred in its column) */}
            <div className="relative mx-auto aspect-square w-full max-w-[575px]">
              {items.map((it, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={it.image}
                  alt={it.alt || ""}
                  style={{ opacity: i === active ? 1 : 0 }}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out"
                />
              ))}
            </div>
            {/* Paragraph (RIGHT, start-aligned) */}
            <div className="relative grid">
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{ gridArea: "1 / 1", opacity: i === active ? 1 : 0 }}
                  aria-hidden={i !== active}
                  className="transition-opacity duration-300 ease-out"
                >
                  {it.heading && <h3 className={`${H3} mb-3`}>{it.heading}</h3>}
                  {it.body && <p className={BODY}>{it.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Mobile: swipe carousel with dots (<1000px) ---------- */}
      <div className="bg-beige py-10 min-[1000px]:hidden">
        <div ref={rowRef} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {items.map((it, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-5">
              <div className="mx-auto max-w-[30rem]">
                <div className="relative aspect-square w-full">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.alt || ""} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="mt-5">
                  {it.heading && <h3 className={`${H3} mb-2`}>{it.heading}</h3>}
                  {it.body && <p className={BODY}>{it.body}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => gotoMobile(i)}
              aria-label={`Go to item ${i + 1}`}
              aria-current={i === mActive}
              className={`h-2 w-2 rounded-full transition-colors ${i === mActive ? "bg-espresso" : "bg-espresso/25"}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
