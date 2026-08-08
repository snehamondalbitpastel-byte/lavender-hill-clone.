"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "./Icons";
import { useCurrency } from "./CurrencyProvider";

// Country / currency selector — the full ISO country list (≈200) served
// dynamically by /api/countries (from the `world-countries` dataset). Picking a
// country sets the storefront currency (CurrencyProvider), which converts every
// price for display. Flags render from the 2-letter code via flag-icons.

type Country = { code: string; name: string; currency: string };
const DEFAULT: Country = { code: "IN", name: "India", currency: "INR" };
const KEY = "lh_country";

// The narrow currency symbol for a code ("INR" → "₹"), via Intl.
function symbolOf(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export default function LocalizationSelector() {
  const { setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<Country>(DEFAULT);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Restore the saved country for the flag/label (currency itself is restored by
  // the provider); then load the full list.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const c = JSON.parse(raw) as Country;
        if (c?.code && c?.currency) setSelected(c);
      }
    } catch {
      /* ignore */
    }
    let active = true;
    fetch("/api/countries")
      .then((r) => r.json())
      .then((list: Country[]) => {
        if (active && Array.isArray(list)) setCountries(list);
      })
      .catch(() => {
        /* selector still works with the default */
      });
    return () => {
      active = false;
    };
  }, []);

  // Close on outside click or Escape.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = countries.length ? countries : [DEFAULT];
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q)
    );
  }, [countries, query]);

  function choose(c: Country) {
    setSelected(c);
    setCurrency(c.currency);
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* ignore */
    }
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Change country or currency"
        className="flex items-center gap-2 nav-link-lh text-[13px] text-espresso/70"
      >
        <span className={`fi fi-${selected.code.toLowerCase()} rounded-[2px]`} aria-hidden="true" />
        <span>
          {selected.currency} {symbolOf(selected.currency)}
        </span>
        <ChevronDown className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Country"
          className="absolute right-0 top-full mt-3 w-72 bg-cream border border-line shadow-soft-lg z-50 py-2"
        >
          <p className="px-4 pb-2 pt-1 eyebrow text-espresso/60">Country / region</p>
          <div className="px-3 pb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              autoFocus
              className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === selected.code}
                  onClick={() => choose(c)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-beige transition-colors ${
                    c.code === selected.code ? "font-medium" : "text-espresso/80"
                  }`}
                >
                  <span className={`fi fi-${c.code.toLowerCase()} rounded-[2px] shrink-0`} aria-hidden="true" />
                  <span className="truncate">
                    {c.name} ({c.currency} {symbolOf(c.currency)})
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-espresso/40">No matches.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
