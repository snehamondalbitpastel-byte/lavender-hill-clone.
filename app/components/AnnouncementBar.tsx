"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "International Delivery Available",
  "Over 2,000 five-star reviews",
  "AS SEEN IN VOGUE, THE TELEGRAPH AND ON MANY INFLUENTIAL WOMEN",
];

// Exact arrows from the live announcement bar (viewBox 0 0 16 18).
function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      width="13"
      viewBox="0 0 16 18"
      className="block"
    >
      <path
        d={dir === "prev" ? "M11 1 3 9l8 8" : "m5 17 8-8-8-8"}
        stroke="currentColor"
        strokeLinecap="square"
      />
    </svg>
  );
}

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<string[]>(MESSAGES);

  // Pull EVERY promo the admin opted into ("Show in banner") and put them first
  // in the rotation. No promos → the default messages stay exactly as they were.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/promo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: { message: string }[] }) => {
        const promos = (d?.items ?? []).map((i) => i.message).filter(Boolean);
        if (!cancelled && promos.length) {
          setMessages([...promos, ...MESSAGES]);
          setIndex(0);
        }
      })
      .catch(() => { /* no promos — keep the default messages */ });
    return () => { cancelled = true; };
  }, []);

  // Autoplay every 5s; restarts whenever the message changes (manual nav resets it).
  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      5000
    );
    return () => clearInterval(id);
  }, [index, messages.length]);

  const prev = () =>
    setIndex((i) => (i - 1 + messages.length) % messages.length);
  const next = () => setIndex((i) => (i + 1) % messages.length);

  return (
    <div className="bg-beige text-espresso">
      {/* Centred group; column-gap 0.75rem / 2.5rem — matches the live .announcement-bar */}
      <div className="flex h-11 items-center justify-center gap-3 min-[700px]:gap-10 px-3">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous message"
          className="tap-area shrink-0 opacity-100 hover:opacity-100 transition-opacity"
        >
          <Arrow dir="prev" />
        </button>

        {/* Fixed-width carousel (flex-grow: 1; max-width: 35rem) so the arrow
            positions never shift with message length — matches the live site. */}
        <div className="relative h-full grow max-w-[39.4rem] overflow-hidden">
          {messages.map((msg, i) => (
            <p
              key={i}
              aria-hidden={i !== index}
              className="eyebrow text-[0.75rem] min-[999px]:text-[14px] tracking-[0.12em] text-[#241c14] whitespace-nowrap absolute inset-0 flex items-center justify-center text-center transition-all duration-500 ease-out"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0)" : "translateY(-10px)",
              }}
            >
              {msg}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next message"
          className="tap-area shrink-0 opacity-100 hover:opacity-100 transition-opacity"
        >
          <Arrow dir="next" />
        </button>
      </div>
    </div>
  );
}
