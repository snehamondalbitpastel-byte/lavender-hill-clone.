"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "./Icons";
import { LOCALES, COOKIE_NAME } from "@/lib/i18n/config";
import { useT } from "./LocaleProvider";

// Language dropdown (header). Picking a language writes the NEXT_LOCALE cookie
// and refreshes, so every page re-renders in that language for this visitor.

export default function LanguageSelector() {
  const router = useRouter();
  const { locale } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(code: string) {
    document.cookie = `${COOKIE_NAME}=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1 nav-link-lh text-[12px] text-espresso/70"
      >
        {current.native} <ChevronDown className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-48 max-h-80 overflow-y-auto bg-cream border border-line shadow-soft-lg z-50 py-2">
          <ul role="listbox">
            {LOCALES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === current.code}
                  onClick={() => choose(l.code)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-beige transition-colors ${
                    l.code === current.code ? "font-medium" : "text-espresso/80"
                  }`}
                >
                  <span>{l.native}</span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-espresso/35">{l.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
