"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCurrency } from "./CurrencyProvider";
import { useT } from "./LocaleProvider";

// Header search. The trigger uses the theme's exact search glyph; clicking it
// slides a full-width panel down from under the header. Typing runs a debounced
// predictive search (/api/search) with two tabs — Products & Collections. The
// results grid is a fixed 4-up row with its own limited height + inner scroll;
// a "View all results" button links to the full /search page.

type Product = { slug: string; title: string; image: string; price: string; compareAt: string | null };
type Collection = { handle: string; label: string };
type Results = { products: Product[]; collections: Collection[] };

const EMPTY: Results = { products: [], collections: [] };

export default function SearchBox() {
  const { localize } = useCurrency();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [tab, setTab] = useState<"products" | "collections">("products");
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced predictive search.
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(res.ok ? await res.json() : EMPTY);
      } catch {
        setResults(EMPTY);
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
  const productCount = results.products.length;
  const collectionCount = results.collections.length;
  const activeCount = tab === "products" ? productCount : collectionCount;

  const tabCls = (active: boolean) =>
    `pb-2 text-[0.8rem] uppercase tracking-[0.16em] transition-colors ${
      active ? "text-espresso border-b-2 border-espresso" : "text-espresso/45 hover:text-espresso"
    }`;

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
        <svg aria-hidden="true" fill="none" focusable="false" width={24} viewBox="0 0 24 24" className="icon icon-search block">
          <path d="M10.364 3a7.364 7.364 0 1 0 0 14.727 7.364 7.364 0 0 0 0-14.727Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
          <path d="M15.857 15.858 21 21.001" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
        </svg>
      </button>

      {/* Full-width panel — drops from under the header with a smooth transition */}
      <div
        role="dialog"
        aria-label={t("header.search", "Search")}
        className={`absolute left-0 right-0 top-full z-50 origin-top overflow-hidden border-t border-line bg-cream text-espresso shadow-soft-lg transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="w-full px-4 py-4 md:px-12 lg:px-[53px]">
          {/* Form control — glyph + input + close ✕ (left-aligned, no underline) */}
          <div className="flex items-center gap-3">
            <svg aria-hidden="true" fill="none" focusable="false" width={20} viewBox="0 0 24 24" className="icon icon-search block shrink-0 text-espresso/70">
              <path d="M10.364 3a7.364 7.364 0 1 0 0 14.727 7.364 7.364 0 0 0 0-14.727Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
              <path d="M15.857 15.858 21 21.001" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              name="q"
              spellCheck={false}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("header.search", "Search")}
              placeholder={t("search.placeholder", "Search for...")}
              className="min-w-0 flex-1 border-0 bg-transparent font-heading font-light uppercase tracking-[0.18em] leading-[1.6] text-[0.9625rem] sm:text-[1.2375rem] text-espresso placeholder:text-espresso/40 focus:outline-none"
            />
            <button type="button" onClick={() => setOpen(false)} className="shrink-0 text-espresso/70 transition-colors hover:text-espresso">
              <span className="sr-only">Close</span>
              <svg aria-hidden="true" focusable="false" fill="none" width={16} viewBox="0 0 16 16" className="icon icon-close block">
                <path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          {/* Results */}
          {query.length >= 2 && (
            <div className="mt-4">
              {loading && <p className="py-8 text-center text-sm text-espresso/45">{t("search.searching", "Searching…")}</p>}

              {!loading && productCount === 0 && collectionCount === 0 && (
                <p className="py-8 text-center text-sm text-espresso/45">{t("search.no_results", "No results found")}</p>
              )}

              {!loading && (productCount > 0 || collectionCount > 0) && (
                <>
                  {/* Tabs */}
                  <div className="flex gap-6 border-b border-line">
                    <button type="button" onClick={() => setTab("products")} className={tabCls(tab === "products")}>
                      Products <span className="text-espresso/40">({productCount})</span>
                    </button>
                    <button type="button" onClick={() => setTab("collections")} className={tabCls(tab === "collections")}>
                      Collections <span className="text-espresso/40">({collectionCount})</span>
                    </button>
                  </div>

                  {/* Limited-height, inner-scrolling results area */}
                  <div className="mt-5 max-h-[52vh] overflow-y-auto pr-1">
                    {tab === "products" ? (
                      productCount === 0 ? (
                        <p className="py-8 text-center text-sm text-espresso/45">{t("search.no_results", "No results found")}</p>
                      ) : (
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                          {results.products.map((p) => (
                            <li key={p.slug}>
                              <a href={`/products/${p.slug}`} onClick={() => setOpen(false)} className="group block">
                                <span className="relative block aspect-[2/3] overflow-hidden bg-white">
                                  <Image src={p.image} alt={p.title} fill sizes="(max-width:640px) 45vw, 22vw" className="object-cover transition-opacity duration-300 group-hover:opacity-90" />
                                </span>
                                <span className="mt-2 block text-sm text-espresso group-hover:text-taupe">{p.title}</span>
                                <span className="block text-sm text-espresso/60">
                                  {p.compareAt ? (
                                    <>
                                      <span className="text-plum">{localize(p.price)}</span>{" "}
                                      <s className="text-espresso/40">{localize(p.compareAt)}</s>
                                    </>
                                  ) : (
                                    localize(p.price)
                                  )}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : collectionCount === 0 ? (
                      <p className="py-8 text-center text-sm text-espresso/45">{t("search.no_results", "No results found")}</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {results.collections.map((c) => (
                          <li key={c.handle}>
                            <a
                              href={`/collections/${c.handle}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between border border-line px-4 py-3 text-sm uppercase tracking-[0.1em] text-espresso hover:bg-beige transition-colors"
                            >
                              <span>{c.label}</span>
                              <span aria-hidden="true">→</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* View all results */}
                  {activeCount > 0 && (
                    <div className="mt-5 text-center">
                      <a
                        href={tab === "products" ? `/search?q=${encodeURIComponent(query)}` : "/collections/view-all-products"}
                        onClick={() => setOpen(false)}
                        className="btn-lh"
                      >
                        View all results
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
