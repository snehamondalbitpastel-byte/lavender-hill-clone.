"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "./Icons";
import { useFetch } from "@/hooks/useFetch";
import { getHero, type HeroSlide } from "@/lib/api";

// Hero carousel — slides are ADMIN-MANAGED (DB via /api/hero), not hardcoded.
// Each slide brings its own copy, alignment, background + CTA buttons (with real
// links). Styling maps below turn a slide's string fields into Tailwind classes.
const ALIGN: Record<string, string> = {
  end: "sm:items-end sm:text-end",
  start: "sm:items-start sm:text-start",
  center: "sm:items-center sm:text-center",
};
const BTN_JUSTIFY: Record<string, string> = {
  end: "sm:justify-end",
  start: "sm:justify-start",
  center: "sm:justify-center",
};
const BTN_VARIANT: Record<string, string> = {
  taupe: "btn-lh btn-lh--taupe",
  light: "btn-lh btn-lh--light",
  outline: "btn-lh btn-lh--outline",
};

const AUTOPLAY_MS = 6000;

export default function Hero() {
  const { data } = useFetch<HeroSlide[]>(getHero, "hero");
  const slides = data ?? [];
  const [active, setActive] = useState(0);

  const count = slides.length;
  const go = useCallback(
    (i: number) => setActive((i + Math.max(count, 1)) % Math.max(count, 1)),
    [count]
  );

  // Autoplay every 6s; restarts whenever the active slide (or count) changes.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, count]);

  // Keep `active` valid if slides change (one hidden/removed in admin).
  useEffect(() => {
    if (active >= count && count > 0) setActive(0);
  }, [count, active]);

  return (
    <section className="relative overflow-hidden bg-black h-[calc(100vh-104px)] min-h-[680px] md:h-auto md:min-h-[560px] md:aspect-[2200/1111]">
      {slides.map((slide, i) => {
        const isActive = i === active;
        return (
          <div
            key={slide.id}
            className="absolute inset-0 overflow-hidden"
            style={{
              opacity: isActive ? 1 : 0,
              // Dip-to-black transition (NOT a slide/cross-blend): the leaving banner
              // darkens out FAST to the section's black, a brief dark beat, then the
              // incoming banner brightens IN (delayed) from black.
              transition: isActive
                ? "opacity 550ms ease-in 320ms"
                : "opacity 320ms ease-out",
              pointerEvents: isActive ? "auto" : "none",
            }}
            aria-hidden={!isActive}
          >
            {/* Image layer — a slow, subtle, CONTINUOUS Ken Burns zoom while this
                banner is active (the IMAGE only; the text layer below stays fixed).
                The zoom runs longer than the autoplay so it never stalls or resets
                visibly before the next banner. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "#a99e8e",
                backgroundImage: `url(${slide.image}), ${
                  slide.gradient || "linear-gradient(135deg, #cfc6ba 0%, #6f6353 100%)"
                }`,
                backgroundSize: "cover",
                backgroundPosition: slide.position || "center",
                backgroundRepeat: "no-repeat",
                // ease-out → the zoom glides to a stop (velocity eases to 0) instead
                // of the abrupt "jhatka" a linear stop gives. The 450ms delay + `both`
                // holds the enlarged start during the dark beat, so the fast part of
                // the motion plays while the banner is actually visible.
                animation: isActive ? "hero-zoom 4200ms ease-out 450ms both" : "none",
                willChange: "transform",
              }}
            />
            {slide.overlay && (
              <div className="absolute inset-0" style={{ background: slide.overlay }} />
            )}

            <div
              className={`relative h-full w-full px-5 md:px-8 lg:px-12 flex flex-col justify-center items-center text-center ${
                ALIGN[slide.align] || ALIGN.center
              } text-cream`}
            >
              <div className={slide.box || "max-w-212"}>
                <h1
                  className={`${slide.titleSize || "text-2xl md:text-3xl lg:text-[2.2rem]"}`}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                    // Rise + fade in as the banner brightens (after the dark beat).
                    transition: isActive
                      ? "opacity 500ms ease-out 440ms, transform 500ms ease-out 440ms"
                      : "opacity 250ms ease-out, transform 250ms ease-out",
                  }}
                >
                  {slide.bold ? <strong>{slide.title}</strong> : slide.title}
                </h1>

                <div
                  className={`mt-9 flex flex-wrap gap-3 justify-center ${
                    BTN_JUSTIFY[slide.align] || BTN_JUSTIFY.center
                  }`}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(20px)",
                    // Clearly AFTER the heading (≈320ms gap) so they never rise in
                    // together — heading first, then the CTA a beat later.
                    transition: isActive
                      ? "opacity 500ms ease-out 760ms, transform 500ms ease-out 760ms"
                      : "opacity 250ms ease-out, transform 250ms ease-out",
                  }}
                >
                  {slide.buttons.map((b, bi) => (
                    <a
                      key={bi}
                      href={b.href || "#"}
                      className={BTN_VARIANT[b.variant] || BTN_VARIANT.light}
                    >
                      {b.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress-ring dots — active dot fills over the 6s autoplay. */}
      {count > 1 && (
        <div className="absolute bottom-8 right-6 md:right-8 lg:right-12 flex gap-3 z-10 text-cream">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="p-1.5 hover:opacity-100 transition-opacity"
              style={{ opacity: i === active ? 1 : 0.65 }}
            >
              <svg width="11" height="11" viewBox="0 0 8 8" className="-rotate-90">
                <circle cx="4" cy="4" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                {i === active && (
                  <circle
                    key={active}
                    cx="4"
                    cy="4"
                    r="3.25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 20.42,
                      animation: `dot-progress ${AUTOPLAY_MS}ms linear forwards`,
                    }}
                  />
                )}
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Scroll-down chevron */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cream/90 text-espresso animate-bounce">
          <ChevronDown />
        </span>
      </div>
    </section>
  );
}
