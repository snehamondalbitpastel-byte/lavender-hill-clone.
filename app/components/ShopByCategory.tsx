"use client";

import { useRef } from "react";
import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getCollections, type Collection } from "@/lib/api";

// "Shop by category" — now loaded from the database via /api/collections.
export default function ShopByCategory() {
  const { data: collections } = useFetch<Collection[]>(getCollections);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("a");
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.86;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24 bg-beige">
      <div className="container-lh">
        <div className="text-center mb-10 md:mb-14">
          <p className="eyebrow text-espresso/60 mb-3">Shop by category</p>
          <h2 className="text-2xl md:text-3xl">Find your perfect t-shirt</h2>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex min-[1150px]:grid min-[1150px]:grid-cols-4 gap-4 min-[1150px]:gap-0 overflow-x-auto min-[1150px]:overflow-visible snap-x snap-mandatory no-scrollbar px-5 min-[1150px]:px-0"
        >
          {(collections ?? []).map((c) => (
            <a
              key={c.id}
              href={c.href}
              className="group relative shrink-0 w-[84vw] min-[700px]:w-[62vw] min-[1150px]:w-auto snap-center block overflow-hidden"
            >
              <div className="relative aspect-[2/3] min-[1150px]:aspect-[3/5] overflow-hidden">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 699px) 84vw, (max-width: 1149px) 62vw, 25vw"
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                />
                {/* subtle overlay — matches --content-over-media-overlay: 0 0 0 / 0.15 */}
                <div className="absolute inset-0 bg-black/15" />

                {/* content: bottom-left, light text (scheme-4) */}
                <div className="absolute bottom-0 left-0 p-6 text-cream text-start">
                  <h3 className="text-lg md:text-xl mb-2 text-cream">{c.title}</h3>
                  <span className="text-xs tracking-[0.2em] uppercase underline underline-offset-4">
                    Shop Now
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Prev / Next — carousel only, hidden on the desktop grid */}
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Previous"
          className="min-[1150px]:hidden absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/90 text-espresso flex items-center justify-center shadow-soft hover:bg-cream transition-colors"
        >
          <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true">
            <path d="M11 1 3 9l8 8" stroke="currentColor" strokeLinecap="square" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Next"
          className="min-[1150px]:hidden absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/90 text-espresso flex items-center justify-center shadow-soft hover:bg-cream transition-colors"
        >
          <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true">
            <path d="m5 17 8-8-8-8" stroke="currentColor" strokeLinecap="square" />
          </svg>
        </button>
      </div>
    </section>
  );
}
