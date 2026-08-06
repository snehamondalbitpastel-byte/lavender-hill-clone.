"use client";

import { useRef, useState, type ComponentType } from "react";

// Footer trust bar ("text with icons") — 4 features with the live site's exact
// picto SVGs. Static 4-up row on desktop, swipe carousel with dots on mobile.
const stroke = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconAward() {
  return (
    <svg aria-hidden="true" fill="none" strokeWidth="1.5" width="24" viewBox="0 0 24 24" className="w-6 h-6">
      <path clipRule="evenodd" d="M15.75 23.238a3 3 0 0 0-3-3H9a3 3 0 0 0-3-3H.75v6h15Z" {...stroke} />
      <path d="M6 20.238h3m2.25-3H21a.75.75 0 0 0 .75-.75v-6.75m-13.5 0v4.5" {...stroke} />
      <path clipRule="evenodd" d="M6.75 6.738a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-2.25Z" {...stroke} />
      <path d="M15 17.238V5.988" {...stroke} />
      <path clipRule="evenodd" d="M19.265 3.867a11.855 11.855 0 0 1-4.242 2.121 11.856 11.856 0 0 1 2.121-4.242C18.463.428 19.21.63 19.8 1.216c.59.586.784 1.333-.535 2.651Zm-8.531 0c1.257.985 2.7 1.707 4.242 2.121a11.838 11.838 0 0 0-2.121-4.242C11.537.428 10.79.63 10.2 1.216c-.59.586-.784 1.333.534 2.651Z" {...stroke} />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg aria-hidden="true" fill="none" strokeWidth="1.5" width="24" viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M23.25 13.5V6a1.5 1.5 0 0 0-1.5-1.5h-12A1.5 1.5 0 0 0 8.25 6v6m0 0V6h-3a4.5 4.5 0 0 0-4.5 4.5v6a1.5 1.5 0 0 0 1.5 1.5H3" {...stroke} />
      <path d="M.75 12h3a1.5 1.5 0 0 0 1.5-1.5V6" {...stroke} />
      <path clipRule="evenodd" d="M7.5 19.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm12 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" {...stroke} />
      <path d="M12 18h3" {...stroke} />
    </svg>
  );
}

function IconPlane() {
  return (
    <svg aria-hidden="true" fill="none" strokeWidth="1.5" width="24" viewBox="0 0 24 24" className="w-6 h-6">
      <path clipRule="evenodd" d="m20.055 20.198.654-.654c.36-.36.502-.885.373-1.378l-2.326-8.837 3.075-3.075a2.972 2.972 0 0 0 .422-3.794 2.867 2.867 0 0 0-4.369-.37l-3.183 3.185L5.867 2.95a1.434 1.434 0 0 0-1.38.373l-.653.654A1.434 1.434 0 0 0 4.11 6.22l6.03 3.618-4.589 5.2-1.434.02a1.434 1.434 0 0 0-1.225.37L1.46 16.74a.716.716 0 0 0 .225 1.165l2.767 1.56 1.816 2.864a.718.718 0 0 0 1.166.224l1.251-1.193c.354-.333.515-.822.428-1.3l.023-1.438 5.058-4.73 3.618 6.03a1.434 1.434 0 0 0 2.243.276Z" {...stroke} />
    </svg>
  );
}

function IconGift() {
  return (
    <svg aria-hidden="true" fill="none" strokeWidth="1.5" width="24" viewBox="0 0 24 24" className="w-6 h-6">
      <path clipRule="evenodd" d="M21.75 11.25H2.25v10.5a1.5 1.5 0 0 0 1.5 1.5h16.5a1.5 1.5 0 0 0 1.5-1.5v-10.5Zm0-4.5H2.25a1.5 1.5 0 0 0-1.5 1.5v2.25c0 .414.336.75.75.75h21a.75.75 0 0 0 .75-.75V8.25a1.5 1.5 0 0 0-1.5-1.5Z" {...stroke} />
      <path d="M11.25 6.75c-3.314 0-6.75-2.686-6.75-6" {...stroke} />
      <path d="M4.5.75c3.314 0 6.75 2.686 6.75 6m1.5 0c3.314 0 6.75-2.686 6.75-6" {...stroke} />
      <path d="M19.5.75c-3.314 0-6.75 2.686-6.75 6" {...stroke} />
      <path clipRule="evenodd" d="M9.75 6.75h4.5v16.5h-4.5V6.75Z" {...stroke} />
    </svg>
  );
}

const FEATURES: { Icon: ComponentType; text: string }[] = [
  { Icon: IconAward, text: "Free delivery On UK Orders Over £120" },
  { Icon: IconTruck, text: "Easy Returns & Exchanges" },
  { Icon: IconPlane, text: "Worldwide Delivery" },
  { Icon: IconGift, text: "Gift With Orders Over £50" },
];

function Feature({ Icon, text }: { Icon: ComponentType; text: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <Icon />
      {/* p.h6 — Raleway, uppercase, --text-h6 (0.825rem) */}
      <h3 className="text-[0.825rem]">{text}</h3>
    </div>
  );
}

export default function FooterFeatures() {
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
    <section className="py-10 md:py-16 bg-beige">
      {/* Full-width (.container = 100%) with the theme gutter — spreads the 4
          features near edge-to-edge, matching the live layout. */}
      <div className="w-full px-6 md:px-12 lg:px-14">
        {/* Desktop: static 4-column row */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <Feature key={f.text} {...f} />
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
              <div key={f.text} className="snap-center shrink-0 w-full px-6 py-2">
                <Feature {...f} />
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
                  background: i === active ? "#3a2f22" : "rgba(58,47,34,0.25)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
