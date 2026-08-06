"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// The five "Why You'll Love Our Products" features, mirroring the live site's
// text-with-icons section. Icons live in /public.
type FeatureItem = { icon: string; title: string; text: string };

const FEATURES: FeatureItem[] = [
  {
    icon: "/feature-premium-materials.png",
    title: "Premium Quality Materials",
    text: "Only the finest organic cotton, TENCEL™ modal, and linen—gentle on your skin and the planet.",
  },
  {
    icon: "/feature-flattering-fit.png",
    title: "Flattering by Design",
    text: "T-shirts and tops thoughtfully cut to flatter every shape, designed for women by women.",
  },
  {
    icon: "/feature-all-day-comfort.png",
    title: "All-Day Comfort",
    text: "Lightweight, breathable, and never clingy—so you feel your best from morning to night.",
  },
  {
    icon: "/feature-meticulous-detailing.png",
    title: "Meticulous Detailing",
    text: "From branded labels on hems to lasting colour, every stitch is made to elevate your essentials.",
  },
  {
    icon: "/feature-consciously-crafted.png",
    title: "Consciously Crafted",
    text: "Lovingly made in certified factories in Portugal and England, with respect for people and the environment.",
  },
];

function Feature({ f }: { f: FeatureItem }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Image
        src={f.icon}
        alt={f.title}
        width={40}
        height={40}
        className="w-10 h-10 object-contain"
      />
      <div className="flex flex-col gap-2 items-center">
        {/* p.h6 — Raleway, uppercase, --text-h6 (0.825rem), 0.2em tracking */}
        <h3 className="text-[0.825rem] tracking-[0.2em]">{f.title}</h3>
        {/* .prose p — Tenor Sans, --text-base (0.9375rem), 0.03em, #3A2F22, lh 1.65 */}
        <p className="text-[15px] text-espresso max-w-75 leading-[1.65]">
          {f.text}
        </p>
      </div>
    </div>
  );
}

export default function WhyLavenderHill() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="bg-cream">
      {/* Rich text — intro */}
      <section className="pt-16 md:pt-23 pb-6 md:pb-10">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <h2 className="rich-h2 text-2xl md:text-4xl mb-4">Why Lavender Hill?</h2>
          <p className="text-espresso mb-6 text-base">
            Luxurious staples for everyday confidence—ethically made,
            beautifully finished, always soft.
          </p>
          <p className="eyebrow text-espresso/60">
            {"Why You'll Love Our Products"}
          </p>
        </div>
      </section>

      {/* Text with icons — 5 features */}
      <section className="pb-8 md:py-6">
        {/* Wider than container-lh so the 5 features spread near full-width
            like the live site, shrinking the left/right edge gap. */}
        <div className="mx-auto w-full max-w-[115rem] px-5 md:px-8">
          {/* Desktop: static 5-column grid */}
          <div className="hidden sm:grid sm:grid-cols-5 gap-x-6 gap-y-10">
            {FEATURES.map((f) => (
              <Feature key={f.title} f={f} />
            ))}
          </div>

          {/* Mobile: swipeable carousel with dots */}
          <div className="sm:hidden">
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
            >
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="snap-center shrink-0 w-full px-6 py-2"
                >
                  <Feature f={f} />
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to item ${i + 1}`}
                  className="h-2 w-2 rounded-full transition-colors"
                  style={{
                    background:
                      i === active ? "#3a2f22" : "rgba(58,47,34,0.25)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rich text — closing */}
      <section className="pt-6 md:pt-8 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <p className="text-espresso text-base">
            Every piece is made to help you feel quietly confident—today,
            tomorrow, always.
          </p>
        </div>
      </section>
    </div>
  );
}
