"use client";

import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getBrand, type BrandContent } from "@/lib/api";

// "Behind The Brand" media grid — now loaded from the database via /api/brand.
export default function BehindTheBrand() {
  const { data: brand } = useFetch<BrandContent>(getBrand);

  if (!brand) return <section className="py-16 md:py-24 bg-beige" />;

  return (
    <section className="py-16 md:py-24 bg-beige">
      {/* container--lg (78.75rem) */}
      <div className="mx-auto w-full max-w-[78.75rem] px-5 md:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <h2 className="text-2xl md:text-3xl mb-4">{brand.title}</h2>
          <p className="text-espresso/75 leading-relaxed">{brand.description}</p>
        </div>

        {/* Media grid: 12-col on desktop, 2-col on mobile.
            Row height 180px mobile / 290px desktop; gap 1rem / 1.25rem. */}
        <div className="grid grid-cols-2 sm:grid-cols-12 auto-rows-[180px] sm:auto-rows-[290px] gap-4 lg:gap-5">
          {/* Video — 6 cols x 2 rows */}
          <div className="relative col-span-2 row-span-2 sm:col-span-6 overflow-hidden">
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={brand.videoPoster}
              className="absolute inset-0 w-full h-full object-cover"
              aria-label="How Lavender Hill T-shirts are made"
            >
              <source src={brand.videoSrc} type="video/mp4" />
            </video>
          </div>

          {/* Four image tiles — 3 cols x 1 row each */}
          {brand.tiles.map((t) => {
            const inner = (
              <>
                <Image
                  src={t.img}
                  alt={t.title}
                  fill
                  sizes="(max-width: 699px) 50vw, 315px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* overlay — matches --content-over-media-overlay: 0 0 0 / 0.29 */}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <h3 className="text-cream text-base md:text-lg tracking-[0.14em]">
                    {t.title}
                  </h3>
                </div>
              </>
            );

            return t.href ? (
              <a
                key={t.title}
                href={t.href}
                className="group relative col-span-1 sm:col-span-3 overflow-hidden block"
              >
                {inner}
              </a>
            ) : (
              <div
                key={t.title}
                className="group relative col-span-1 sm:col-span-3 overflow-hidden"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
