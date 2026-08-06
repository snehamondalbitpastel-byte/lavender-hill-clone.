"use client";

// Fulfilment progress stepper for the admin order detail page. Visualises the
// order's `fulfillmentStatus` — the same axis the admin advances from the
// Fulfillment panel (OrderActions). The flow has five real states (unfulfilled →
// … → delivered); "Completed" is a display-only final step that lights up once
// the order is delivered. A reveal flag + CSS transitions animate it on first
// paint AND on each step the admin marks (only the newly-completed step moves:
// the green LINE fills first, then the node colours in).

import { useEffect, useState } from "react";
import { FULFILLMENT_FLOW } from "@/lib/order-status";

const svg = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const STEPS = [
  {
    key: "unfulfilled",
    label: "Unfulfilled",
    desc: "The order has been placed but not yet processed.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
        <path d="M3 7l9 4 9-4" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    key: "processing",
    label: "Processing",
    desc: "We are processing your order.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
      </svg>
    ),
  },
  {
    key: "packed",
    label: "Packed",
    desc: "Order is packed and ready to ship.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M3 8l2-4h14l2 4v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z" />
        <path d="M3 8h18" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    key: "shipped",
    label: "Shipped",
    desc: "Order has been shipped to courier.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M1 6h13v9H1z" />
        <path d="M14 9h4l3 3v3h-7z" />
        <circle cx="5.5" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    key: "delivered",
    label: "Delivered",
    desc: "Order has been delivered to customer.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5 6h14l3 6v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z" />
      </svg>
    ),
  },
  {
    key: "completed",
    label: "Completed",
    desc: "All steps are completed.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" {...svg}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
] as const;

export default function FulfillmentProgress({ status }: { status: string }) {
  const cancelled = status === "cancelled";
  // "delivered" completes the whole chain, including the display-only final step.
  const activeIndex =
    status === "delivered"
      ? STEPS.length - 1
      : cancelled
        ? -1
        : (FULFILLMENT_FLOW as readonly string[]).indexOf(status);

  // Reveal drives the CSS transitions on first paint; on a later router.refresh
  // this component stays mounted, so only the newly-advanced step transitions.
  const [revealed, setRevealed] = useState(false);
  const [stagger, setStagger] = useState(true);
  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 50);
    const t2 = setTimeout(() => setStagger(false), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section className="bg-cream border border-line rounded-xl shadow-soft p-5 sm:p-6">
      <h2 className="mb-6 text-sm uppercase tracking-[0.1em] text-espresso/60">
        Fulfilment progress
      </h2>

      {cancelled && (
        <p className="mb-5 text-sm text-[#a23140]">This order was cancelled.</p>
      )}

      <div className="overflow-x-auto">
        <ol className="flex min-w-[560px] items-start">
          {STEPS.map((step, i) => {
            const done = i <= activeIndex;
            const nodeDone = revealed && done;        // node colours only after reveal
            const baseDelay = stagger ? i * 0.18 : 0; // left→right stagger on first reveal only
            return (
              <li
                key={step.key}
                className="relative flex flex-1 flex-col items-center px-1 text-center"
              >
                {/* connector — grey base + a green fill that eases via scaleX. The
                    CSS transition plays on first reveal AND when this step later
                    completes (line fills first, before the node colours). */}
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[-50%] right-[50%] top-[17px] h-[2px] overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-line" />
                    <span
                      data-lh-progress-fill=""
                      className="absolute inset-0 origin-left bg-[#307a07] transition-transform ease-out"
                      style={{ transform: revealed && done ? "scaleX(1)" : "scaleX(0)", transitionDuration: "0.35s", transitionDelay: `${baseDelay}s` }}
                    />
                  </span>
                )}
                {/* node — colours from grey to green (after its line fills) via a
                    CSS transition, staggered left→right on the first reveal only */}
                <span
                  data-lh-progress-pop=""
                  style={{ transitionDuration: "0.3s", transitionDelay: `${baseDelay + 0.32}s` }}
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-cream transition-colors ease-out ${
                    nodeDone
                      ? "border border-[#307a07] bg-[#307a07] text-white"
                      : "border border-line bg-white text-espresso/35"
                  }`}
                >
                  {step.icon}
                </span>
                <p
                  className={`mt-2.5 text-xs font-medium ${
                    done ? "text-[#307a07]" : "text-espresso/40"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 max-w-[8.5rem] text-[11px] leading-snug text-espresso/45">
                  {step.desc}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
