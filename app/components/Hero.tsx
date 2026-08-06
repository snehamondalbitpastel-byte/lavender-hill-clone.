"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "./Icons";

type Align = "end" | "start" | "center";
type Variant = "taupe" | "light" | "outline";

type Slide = {
  title: string;
  bold: boolean;
  align: Align;
  image: string;
  position: string;
  gradient: string;
  buttons: { label: string; href: string; variant: Variant }[];
  titleSize?: string;
  box?: string;
  overlay?: string;
};

// Each slide mirrors the live site's hero carousel — its own copy, alignment
// and button(s). Real photos live in /public; the gradient is a load fallback.
const SLIDES: Slide[] = [
  {
    title: "The Linen Collection",
    bold: true,
    align: "end", // desktop: centre-right, text-end
    titleSize: "text-3xl md:text-4xl lg:text-[42px]", // bigger than the default hero h1
    box: "max-w-255", // wide enough to keep it on one line (extends leftward)
    image: "/hero-striped-linen-top.jpg",
    position: "32% 50%",
    gradient: "linear-gradient(135deg, #cfc6ba 0%, #a99e8e 55%, #6f6353 100%)",
    buttons: [{ label: "Shop now", href: "#", variant: "taupe" }],
  },
  {
    title: "Back in stock",
    bold: false,
    align: "start", // desktop: centre-left, text-start
    box: "max-w-212 sm:ml-2 sm:-translate-y-8", // off the left edge + a little higher
    image: "/hero-white-linen-shirt.jpg",
    position: "center",
    gradient: "linear-gradient(135deg, #d8cfc4 0%, #b6a996 60%, #7d6f5c 100%)",
    buttons: [{ label: "Shop Now", href: "#", variant: "light" }],
  },
  {
    title: "The Perfect Women’s T-Shirt, Redefined",
    bold: false,
    align: "end", // desktop: centre-right, text-end
    image: "/hero-vneck-tshirt.jpg",
    position: "center",
    gradient: "linear-gradient(135deg, #c7bcae 0%, #9c8f7c 55%, #635747 100%)",
    buttons: [
      { label: "Shop Women’s T-Shirts", href: "#", variant: "light" },
      { label: "Find Your Perfect Tee", href: "#", variant: "outline" },
    ],
  },
];

// Content alignment on desktop (all are vertically centred).
const ALIGN: Record<Align, string> = {
  end: "sm:items-end sm:text-end",
  start: "sm:items-start sm:text-start",
  center: "sm:items-center sm:text-center",
};
const BTN_JUSTIFY: Record<Align, string> = {
  end: "sm:justify-end",
  start: "sm:justify-start",
  center: "sm:justify-center",
};
const BTN_VARIANT: Record<Variant, string> = {
  taupe: "btn-lh btn-lh--taupe",
  light: "btn-lh btn-lh--light",
  outline: "btn-lh btn-lh--outline",
};

const AUTOPLAY_MS = 6000;

export default function Hero() {
  const [active, setActive] = useState(0);

  const go = useCallback(
    (i: number) => setActive((i + SLIDES.length) % SLIDES.length),
    []
  );

  // Autoplay every 6s; restarts whenever the active slide changes (so manual
  // navigation resets the countdown, matching the live carousel).
  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      AUTOPLAY_MS
    );
    return () => clearInterval(id);
  }, [active]);

  return (
    <section className="relative overflow-hidden bg-black h-[calc(100vh-104px)] min-h-[680px] md:h-auto md:min-h-[560px] md:aspect-[2200/1111]">
      {SLIDES.map((slide, i) => {
        const isActive = i === active;
        return (
          <div
            key={slide.title}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? "auto" : "none",
              backgroundColor: "#a99e8e",
              backgroundImage: `url(${slide.image}), ${slide.gradient}`,
              backgroundSize: "cover",
              backgroundPosition: slide.position,
              backgroundRepeat: "no-repeat",
            }}
            aria-hidden={!isActive}
          >
            {/* optional darkening gradient (slide 3 on the live site) */}
            {slide.overlay && (
              <div
                className="absolute inset-0"
                style={{ background: slide.overlay }}
              />
            )}

            <div
              className={`relative h-full w-full px-5 md:px-8 lg:px-12 flex flex-col justify-center items-center text-center ${ALIGN[slide.align]} text-cream`}
            >
              <div className={slide.box || "max-w-212"}>
                <h1
                  className={`${slide.titleSize || "text-2xl md:text-3xl lg:text-[2.2rem]"} transition-all duration-500 ease-out`}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  {slide.bold ? <strong>{slide.title}</strong> : slide.title}
                </h1>

                <div
                  className={`mt-9 flex flex-wrap gap-3 justify-center ${BTN_JUSTIFY[slide.align]} transition-all duration-500 delay-100 ease-out`}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(20px)",
                  }}
                >
                  {slide.buttons.map((b) => (
                    <a key={b.label} href={b.href} className={BTN_VARIANT[b.variant]}>
                      {b.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress-ring dots — active dot fills over the 6s autoplay.
          Positioned in the bottom-right corner of the carousel. */}
      <div className="absolute bottom-8 right-6 md:right-8 lg:right-12 flex gap-3 z-10 text-cream">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="p-1.5 hover:opacity-100 transition-opacity"
            style={{ opacity: i === active ? 1 : 0.65 }}
          >
            <svg width="11" height="11" viewBox="0 0 8 8" className="-rotate-90">
              <circle
                cx="4"
                cy="4"
                r="3.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.3"
              />
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

      {/* Scroll-down chevron */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cream/90 text-espresso animate-bounce">
          <ChevronDown />
        </span>
      </div>
    </section>
  );
}
