"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Horizontal progress stepper. Two variants:
//  • "circle" (default) — icon inside a filled circle (customer order status).
//  • "plain"  — just the icon, no border/circle; green once the step is complete,
//    grey otherwise (admin return progress). The icons are exact Lucide glyphs.
//  With `animate`, the transition is driven by a reveal flag + CSS transitions so
//  it plays on first paint AND on each later step change (router.refresh keeps
//  this component mounted → only the newly-completed step animates: the green
//  LINE fills first, THEN the node colours in).

export type ProgressState = "done" | "current" | "upcoming" | "cancelled";
export type StepIconName =
  | "placed" | "processing" | "packed" | "shipped" | "delivered" | "check" | "cancelled"
  | "clipboard-plus" | "badge-check" | "package-search" | "package-check" | "clipboard-check" | "wallet" | "circle-check-big";

export type ProgressStep = {
  label: string;
  state: ProgressState;
  at?: string;
  extra?: string;
  icon?: StepIconName;
};

// ---- circle-variant styles ----
const DOT: Record<ProgressState, string> = {
  done: "bg-[#307a07] border-[#307a07] text-white",
  current: "bg-[#847a8a] border-[#847a8a] text-white ring-4 ring-[#847a8a]/20",
  upcoming: "bg-white border-[#d4d0cb] text-[#bdb8b0]",
  cancelled: "bg-[#a23140] border-[#a23140] text-white",
};
const TEXT: Record<ProgressState, string> = {
  done: "text-[#1a1a1a]",
  current: "text-[#1a1a1a] font-semibold",
  upcoming: "text-[#a7a29b]",
  cancelled: "text-[#a23140] font-semibold",
};

export default function OrderProgress({
  steps,
  checkOnDone = false,
  variant = "circle",
  animate = false,
}: {
  steps: ProgressStep[];
  checkOnDone?: boolean;
  variant?: "circle" | "plain";
  // When true, the green fill grows in (left→right) and nodes pop, staggered per
  // step, instead of snapping to the final state. Keyframes live in globals.css.
  animate?: boolean;
}) {
  // `revealed` flips shortly after mount so the initial paint shows the empty
  // state and the CSS transitions then play. On a later router.refresh this
  // component stays mounted (revealed already true) — so only the step whose
  // state changed transitions. `stagger` only spaces out the FIRST reveal.
  const [revealed, setRevealed] = useState(!animate);
  const [stagger, setStagger] = useState(true);
  useEffect(() => {
    if (!animate) return;
    const t1 = setTimeout(() => setRevealed(true), 50);
    const t2 = setTimeout(() => setStagger(false), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animate]);

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[440px] items-start">
        {steps.map((s, i) => {
          const green = s.state === "done" || s.state === "current";
          const isCancelled = s.state === "cancelled";
          // Which connectors carry the coloured fill: plain fills only on "done";
          // circle fills on "done" or "current" (matches the old `line()` rule).
          const fillOn = isCancelled || (variant === "plain" ? s.state === "done" : green);
          const iconName: StepIconName | undefined =
            checkOnDone && s.state === "done" ? "check" :
            s.icon ?? (s.state === "cancelled" ? "cancelled" : s.state === "done" ? "check" : undefined);

          // Until revealed, nodes render in the neutral "upcoming" look so the real
          // colour eases in. Line fills first (baseDelay), node colours after it.
          const effState: ProgressState = animate && !revealed ? "upcoming" : s.state;
          const lineFilled = (!animate || revealed) && fillOn;
          const baseDelay = animate && stagger ? i * 0.18 : 0; // left→right stagger on first reveal only
          const fillStyle: CSSProperties = animate
            ? { transform: lineFilled ? "scaleX(1)" : "scaleX(0)", transitionDuration: "0.35s", transitionDelay: `${baseDelay}s` }
            : { transform: lineFilled ? "scaleX(1)" : "scaleX(0)" };
          const nodeStyle: CSSProperties | undefined = animate
            ? { transitionDuration: "0.3s", transitionDelay: `${baseDelay + 0.32}s` }
            : undefined;

          return (
            <li key={i} className="relative flex flex-1 flex-col items-center px-1 text-center">
              {i > 0 && (
                <span className="absolute top-[13px] z-0 h-0.5 overflow-hidden" style={{ right: "50%", width: "100%" }} aria-hidden="true">
                  <span className="absolute inset-0 bg-[#e0ddd8]" />
                  {/* green fill: grows left→right via scaleX; a CSS transition means
                      it eases both on first reveal and when this step later completes */}
                  <span
                    data-lh-progress-fill={animate ? "" : undefined}
                    className={`absolute inset-0 origin-left ${isCancelled ? "bg-[#a23140]" : "bg-[#307a07]"} ${animate ? "transition-transform ease-out" : ""}`}
                    style={fillStyle}
                  />
                </span>
              )}

              {variant === "plain" ? (
                // filled circle, NO border — green when the step is complete, grey otherwise
                <span
                  data-lh-progress-pop={animate ? "" : undefined}
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${animate ? "transition-colors ease-out" : ""} ${
                    effState === "cancelled" ? "bg-[#a23140] text-white" : effState === "done" || effState === "current" ? "bg-[#307a07] text-white" : "bg-[#ece9e4] text-[#a29d95]"
                  }`}
                  style={nodeStyle}
                >
                  <StepIcon name={iconName} className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span
                  data-lh-progress-pop={animate ? "" : undefined}
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${animate ? "transition-colors ease-out" : ""} ${DOT[effState]}`}
                  style={nodeStyle}
                >
                  <StepIcon name={iconName} className="h-3.5 w-3.5" />
                </span>
              )}

              <p className={`mt-2 text-[0.82rem] leading-tight ${variant === "plain" ? (green ? "text-[#1a1a1a] font-medium" : "text-[#a7a29b]") : TEXT[s.state]}`}>{s.label}</p>
              {s.extra && (
                <span className="mt-1 inline-block rounded bg-[#efedf3] px-1.5 py-0.5 text-[0.68rem] font-medium text-[#5b4b9b]">{s.extra}</span>
              )}
              {s.at && <p className="mt-1 text-[0.72rem] text-[#a7a29b]">{s.at}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Exact Lucide glyphs (viewBox 0 0 24 24, stroke = currentColor).
function StepIcon({ name, className = "h-3.5 w-3.5" }: { name?: StepIconName; className?: string }) {
  const p = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "placed":
      return <svg viewBox="0 0 24 24" className={className}><path d="M12 3.5 4.5 7.5v9L12 20.5l7.5-4V7.5L12 3.5Z" {...p} /><path d="M4.5 7.5 12 11.5l7.5-4M12 11.5v9" {...p} /></svg>;
    case "processing":
      return <svg viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="8" {...p} /><path d="M12 8.5V12l2.5 1.5" {...p} /></svg>;
    case "packed":
      return <svg viewBox="0 0 24 24" className={className}><path d="M4 8.5 12 5l8 3.5v7L12 19l-8-3.5v-7Z" {...p} /><path d="M4 8.5 12 12l8-3.5M12 12v7" {...p} /></svg>;
    case "shipped":
      return <svg viewBox="0 0 24 24" className={className}><path d="M2.5 6.5h10.5v9H2.5z" {...p} /><path d="M13 9.5h3.6l3 3v3H13z" {...p} /><circle cx="7" cy="17.5" r="1.6" {...p} /><circle cx="17" cy="17.5" r="1.6" {...p} /></svg>;
    case "delivered":
    case "check":
      return <svg viewBox="0 0 24 24" className={className}><path d="m5 13 4 4L19 7" {...p} strokeWidth={2.6} /></svg>;
    case "cancelled":
      return <svg viewBox="0 0 24 24" className={className}><path d="M6 6l12 12M18 6L6 18" {...p} strokeWidth={2.6} /></svg>;
    // ---- Lucide (return progress) ----
    case "clipboard-plus":
      return <svg viewBox="0 0 24 24" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" {...p} /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} /><path d="M9 14h6" {...p} /><path d="M12 11v6" {...p} /></svg>;
    case "badge-check":
      return <svg viewBox="0 0 24 24" className={className}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" {...p} /><path d="m9 12 2 2 4-4" {...p} /></svg>;
    case "package-search":
      return <svg viewBox="0 0 24 24" className={className}><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0" {...p} /><path d="m7.5 4.27 9 5.15" {...p} /><path d="M3.29 7 12 12l8.71-5" {...p} /><path d="M12 22V12" {...p} /><circle cx="18.5" cy="15.5" r="2.5" {...p} /><path d="M20.27 17.27 22 19" {...p} /></svg>;
    case "package-check":
      return <svg viewBox="0 0 24 24" className={className}><path d="m16 16 2 2 4-4" {...p} /><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" {...p} /><path d="m7.5 4.27 9 5.15" {...p} /><path d="M3.29 7 12 12l8.71-5" {...p} /><path d="M12 22V12" {...p} /></svg>;
    case "clipboard-check":
      return <svg viewBox="0 0 24 24" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" {...p} /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...p} /><path d="m9 14 2 2 4-4" {...p} /></svg>;
    case "wallet":
      return <svg viewBox="0 0 24 24" className={className}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" {...p} /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" {...p} /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" {...p} /></svg>;
    case "circle-check-big":
      return <svg viewBox="0 0 24 24" className={className}><path d="M21.801 10A10 10 0 1 1 17 3.335" {...p} /><path d="m9 11 3 3L22 4" {...p} /></svg>;
    default:
      return null;
  }
}
