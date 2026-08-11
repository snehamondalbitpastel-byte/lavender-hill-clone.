"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "./Icons";
import { LOCALES, COOKIE_NAME } from "@/lib/i18n/config";
import { useT } from "./LocaleProvider";

// Language dropdown (header). Picking a language writes the NEXT_LOCALE cookie
// and does a FULL reload, so every page re-renders in that language — including
// client-fetched content (product title/colours, bestsellers, looks). A soft
// router.refresh() only re-renders server components, leaving useFetch data (the
// product detail, cards, looks) stuck in the previous language.

export default function LanguageSelector() {
  const { locale } = useT();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
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
    if (code === locale) { setOpen(false); return; }
    document.cookie = `${COOKIE_NAME}=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    // Show a full-screen loader while the page reloads + re-fetches everything in
    // the new language, so the shopper sees it's working (no frozen/stale flash).
    setSwitching(true);
    // Full reload → server AND client-fetched content both re-render in the new
    // language (router.refresh() would leave useFetch data in the old language).
    window.location.reload();
  }

  return (
    <>
    {switching && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream/70 backdrop-blur-[1px]" role="status" aria-live="polite">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-espresso/20 border-t-espresso" aria-hidden="true" />
      </div>
    )}
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
    </>
  );
}
