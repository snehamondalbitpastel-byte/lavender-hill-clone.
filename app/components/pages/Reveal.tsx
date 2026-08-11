"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// reveal-on-scroll — mirrors the theme's `[reveal-on-scroll=true]` behaviour:
// children start hidden (faded + offset) and animate into place the first time
// they scroll into view. `from` sets the direction the content travels FROM
// ("up" = rises, "left"/"right" = slides in from that edge — used for the
// image_with_text images). `durationMs` controls speed (slower for images).
// Respects prefers-reduced-motion and degrades to visible without IO.
type From = "up" | "left" | "right";

const OFFSET: Record<From, string> = {
  up: "translate-y-6",
  left: "-translate-x-10",
  right: "translate-x-10",
};

export default function Reveal({
  children,
  className = "",
  from = "up",
  durationMs = 700,
}: {
  children: ReactNode;
  className?: string;
  from?: From;
  durationMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDuration: `${durationMs}ms` }}
      className={`transition-all ease-out ${shown ? "translate-x-0 translate-y-0 opacity-100" : `opacity-0 ${OFFSET[from]}`} ${className}`}
    >
      {children}
    </div>
  );
}
