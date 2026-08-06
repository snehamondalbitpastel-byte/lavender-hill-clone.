"use client";

import { useState } from "react";
import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getLooks, type Look } from "@/lib/api";

// "As Styled By You" shop-the-look carousel — now loaded from /api/looks.
function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path
        d={dir === "prev" ? "M11 1 3 9l8 8" : "m5 17 8-8-8-8"}
        stroke="currentColor"
        strokeLinecap="square"
      />
    </svg>
  );
}

export default function AsStyledByYou() {
  const { data: looks } = useFetch<Look[]>(getLooks);
  const [active, setActive] = useState(0);

  if (!looks || looks.length === 0)
    return <section className="py-16 md:py-24 bg-cream" />;

  const prev = () => setActive((i) => (i - 1 + looks.length) % looks.length);
  const next = () => setActive((i) => (i + 1) % looks.length);
  const l = looks[active];

  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="mx-auto w-full max-w-[85rem] px-5 md:px-8">
        <h2 className="text-2xl md:text-3xl text-center mb-10 md:mb-14">
          As Styled By You
        </h2>

        <div className="relative">
          {/* Prev / Next */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous look"
            className="absolute -left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-cream/90 shadow-soft transition-colors hover:bg-cream md:-left-4"
          >
            <Arrow dir="prev" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next look"
            className="absolute -right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-cream/90 shadow-soft transition-colors hover:bg-cream md:-right-4"
          >
            <Arrow dir="next" />
          </button>

          {/* Look (left) + Product (right) */}
          <div className="grid items-center gap-8 px-8 md:grid-cols-2 md:gap-12 md:px-16">
            {/* Lifestyle look with hot-spot */}
            <div className="relative aspect-square overflow-hidden bg-beige">
              <Image
                key={l.look}
                src={l.look}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <span
                className="sl-hotspot"
                style={{ top: l.hotspotTop, left: l.hotspotLeft }}
                aria-hidden="true"
              />
            </div>

            {/* Featured product card */}
            <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
              <a
                href={l.href}
                className="group relative mb-5 block aspect-[2/3] w-full overflow-hidden bg-beige"
              >
                <Image
                  key={l.productImg}
                  src={l.productImg}
                  alt={l.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover transition-opacity duration-500 group-hover:opacity-0"
                />
                <Image
                  key={l.productImgAlt}
                  src={l.productImgAlt}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </a>
              <h3 className="mb-2 text-base md:text-lg">{l.name}</h3>
              <p className="mb-4 text-xs uppercase tracking-[0.1em] text-espresso/60">
                {l.price}
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-1.5">
                {l.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-3.5 w-3.5 rounded-full border border-line"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <a href={l.href} className="btn-lh px-10">
                View product
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
