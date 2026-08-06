"use client";

import { useEffect, useRef, useState } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { COUNTRIES } from "@/lib/countries";

// Real SVG flags (inline, render on every OS incl. Windows — unlike emoji flags).
type FlagComp = React.ComponentType<{ className?: string; title?: string }>;
const FLAGS = Flags as unknown as Record<string, FlagComp>;

// A custom dropdown (native <select> can't render flag images) that lists
// countries with their flag + dial code, for the address phone field.
export default function PhoneCountrySelect({
  code,
  onSelect,
}: {
  code: string; // ISO-2 of the selected country
  onSelect: (code: string, dial: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected =
    COUNTRIES.find((c) => c.code === code) ??
    COUNTRIES.find((c) => c.code === "GB")!;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const SelFlag = FLAGS[selected.code];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Phone country code"
        className="flex h-14 items-center gap-1.5 rounded-lg border border-[var(--acc-line)] bg-white px-3 text-[0.9rem] text-[var(--acc-fg)] outline-none focus:border-[#1a1a1a]"
      >
        {SelFlag && <SelFlag className="h-3.5 w-5 rounded-[2px]" />}
        <span>+{selected.dial}</span>
        <svg width="10" viewBox="0 0 12 8" fill="none" className="text-[var(--acc-muted)]" aria-hidden="true">
          <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-[var(--acc-line)] bg-white py-1 shadow-lg">
          {COUNTRIES.map((c) => {
            const F = FLAGS[c.code];
            return (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c.code, c.dial);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.9rem] hover:bg-[#f6f6f6]"
                >
                  {F && <F className="h-3.5 w-5 shrink-0 rounded-[2px]" />}
                  <span className="flex-1 truncate text-[var(--acc-fg)]">{c.name}</span>
                  <span className="text-[var(--acc-muted)]">+{c.dial}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
