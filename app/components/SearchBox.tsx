"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCurrency } from "./CurrencyProvider";
import { useT } from "./LocaleProvider";

// Header search. The trigger uses the site's exact search glyph; clicking it
// slides a full-width panel down from under the header (opacity + translateY
// transition, matching the live theme's header-search). Typing runs a debounced
// predictive search against /api/search and lists matching products.

type Result = { slug: string; title: string; image: string; price: string; compareAt: string | null };

export default function SearchBox() {
  const { localize } = useCurrency();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced predictive search.
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(res.ok ? await res.json() : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q, open]);

  // Close on outside click or Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const query = q.trim();

  return (
    <div ref={wrapRef} className="flex items-center">
      {/* Trigger — the theme's exact search glyph */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("header.search", "Search")}
        aria-expanded={open}
        className="hover:text-taupe transition-colors"
      >
        <svg
          aria-hidden="true"
          fill="none"
          focusable="false"
          width={24}
          viewBox="0 0 24 24"
          className="icon icon-search block"
        >
          <path
            d="M10.364 3a7.364 7.364 0 1 0 0 14.727 7.364 7.364 0 0 0 0-14.727Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeMiterlimit="10"
          />
          <path
            d="M15.857 15.858 21 21.001"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeMiterlimit="10"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Full-width panel — drops from directly under the header (sticky), with a
          smooth opacity + translateY transition. */}
      <div
        role="dialog"
        aria-label={t("header.search", "Search")}
        className={`absolute left-0 right-0 top-full z-50 origin-top overflow-auto border-t border-line bg-cream text-espresso shadow-soft-lg transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
        style={{ maxHeight: "calc(100vh - var(--lh-header-h, 74px) - 1.25rem)" }}
      >
        <div className="mx-auto w-full max-w-[71.875rem] px-4 py-6 md:px-12">
          <label className="relative block">
            <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-espresso/50">
              <svg aria-hidden="true" fill="none" width={22} viewBox="0 0 24 24">
                <path d="M10.364 3a7.364 7.364 0 1 0 0 14.727 7.364 7.364 0 0 0 0-14.727Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
                <path d="M15.857 15.858 21 21.001" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search.placeholder", "Search our store")}
              className="w-full border-b border-line bg-transparent py-3 pl-9 pr-4 text-base text-espresso placeholder:text-espresso/40 focus:border-espresso focus:outline-none"
            />
          </label>

          {/* Results */}
          {query.length >= 2 && (
            <div className="mt-5">
              {loading && <p className="py-6 text-center text-sm text-espresso/45">{t("search.searching", "Searching…")}</p>}
              {!loading && results.length === 0 && (
                <p className="py-6 text-center text-sm text-espresso/45">{t("search.no_results", "No results found")}</p>
              )}
              {!loading && results.length > 0 && (
                <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                  {results.map((r) => (
                    <li key={r.slug}>
                      <a
                        href={`/products/${r.slug}`}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3"
                      >
                        <span className="relative aspect-square w-14 shrink-0 overflow-hidden bg-white">
                          <Image src={r.image} alt={r.title} fill sizes="56px" className="object-cover" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-espresso group-hover:text-taupe">{r.title}</span>
                          <span className="block text-sm text-espresso/55">
                            {r.compareAt ? (
                              <>
                                <span className="text-plum">{localize(r.price)}</span>{" "}
                                <s className="text-espresso/40">{localize(r.compareAt)}</s>
                              </>
                            ) : (
                              localize(r.price)
                            )}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
