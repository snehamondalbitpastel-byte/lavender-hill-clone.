"use client";

import { useState } from "react";
import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getLooks, type Look } from "@/lib/api";

// "As Styled By You" shop-the-look carousel (/api/looks). One look per slide;
// prev/next slide the track SMOOTHLY (translateX transition, not a jump). Each
// look links to its product's detail page (set in admin). The circle buttons
// mirror the live theme: round, soft shadow, and the arrow slides on hover.

// A look with no real link (legacy "#"/empty) falls back to /shop so it never dead-ends.
const linkFor = (href: string) => (href && href !== "#" ? href : "/shop");

export default function AsStyledByYou() {
  const { data: looks } = useFetch<Look[]>(getLooks, "looks");
  const [active, setActive] = useState(0);

  if (!looks || looks.length === 0)
    return <section className="py-16 md:py-24 bg-cream" />;

  const n = looks.length;
  const clamped = Math.min(active, n - 1);
  const prev = () => setActive((i) => Math.max(0, i - 1));
  const next = () => setActive((i) => Math.min(n - 1, i + 1));

  // Circle button — matches .circle-button--lg (3.125rem, round, soft shadow).
  const circle =
    "group absolute top-1/2 z-10 grid h-[3.125rem] w-[3.125rem] -translate-y-1/2 place-items-center rounded-full bg-cream text-espresso shadow-[0_2px_10px_rgba(58,47,34,0.15)] transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-30";

  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="mx-auto w-full max-w-[85rem] px-5 md:px-8">
        <h2 className="text-2xl md:text-3xl text-center mb-10 md:mb-14">
          As Styled By You
        </h2>

        <div className="relative">
          {/* Prev / Next — circle buttons; arrow slides inline on hover. */}
          <button type="button" onClick={prev} disabled={clamped === 0} aria-label="Previous look" className={`${circle} -left-1 md:-left-4`}>
            <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:-translate-x-1">
              <path d="M11 1 3 9l8 8" stroke="currentColor" strokeLinecap="square" />
            </svg>
          </button>
          <button type="button" onClick={next} disabled={clamped === n - 1} aria-label="Next look" className={`${circle} -right-1 md:-right-4`}>
            <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:translate-x-1">
              <path d="m5 17 8-8-8-8" stroke="currentColor" strokeLinecap="square" />
            </svg>
          </button>

          {/* Viewport + sliding track (one look per full-width slide). */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${clamped * 100}%)` }}
            >
              {looks.map((l) => {
                const href = linkFor(l.href);
                return (
                  <div key={l.id} className="w-full shrink-0 px-6 md:px-16">
                    {/* Left lifestyle image is the DOMINANT element; the product
                        card on the right is compact — matches the live theme. */}
                    <div className="grid items-center gap-8 md:grid-cols-[1.35fr_1fr] md:gap-12">
                      {/* Lifestyle look with hot-spot (fills its column — large) */}
                      <div className="w-full">
                        <div className="relative aspect-square overflow-hidden bg-beige">
                          <Image src={l.look} alt="" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
                          <span className="sl-hotspot" style={{ top: l.hotspotTop, left: l.hotspotLeft }} aria-hidden="true" />
                        </div>
                      </div>

                      {/* Compact featured product card → the product's detail page */}
                      <div className="mx-auto flex w-full max-w-[19rem] flex-col items-center text-center">
                        <a href={href} className="group/card relative mb-4 block aspect-[2/3] w-full overflow-hidden bg-beige">
                          <Image src={l.productImg} alt={l.name} fill sizes="(max-width: 768px) 80vw, 22vw" className="object-cover transition-opacity duration-500 group-hover/card:opacity-0" />
                          <Image src={l.productImgAlt} alt="" fill sizes="(max-width: 768px) 80vw, 22vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
                        </a>
                        <h3 className="mb-2 text-sm md:text-base">{l.name}</h3>
                        <p className="mb-3 text-xs uppercase tracking-[0.1em] text-espresso/60">{l.price}</p>
                        <div className="mb-5 flex flex-wrap justify-center gap-1.5">
                          {l.colors.map((c, i) => (
                            <span key={i} className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: c }} />
                          ))}
                        </div>
                        <a href={href} className="btn-lh px-8">View product</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
