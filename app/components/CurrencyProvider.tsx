"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BASE, FALLBACK_RATES, extractInr, formatMoney, isCurrencyCode, localizeText } from "@/lib/currency";

// Client-side currency state for the storefront. Holds the shopper's chosen
// currency (persisted) + live rates (from /api/rates), and exposes two display
// helpers used everywhere prices show:
//   money(inr)     — an INR number/string → the selected currency string
//   localize(text) — swaps "Rs …" amounts inside a string (badges, "Save Rs X")
// DISPLAY ONLY: the cart maths, orders, and Stripe all stay in INR.

type Ctx = {
  code: string;
  setCurrency: (code: string) => void;
  money: (inr: number | string) => string;
  localize: (s: string) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);
const KEY = "lh_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Start at the base currency on BOTH server and client so the first paint
  // matches (no hydration mismatch); the saved choice is applied after mount.
  const [code, setCode] = useState(BASE);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (isCurrencyCode(saved)) setCode(saved);
    } catch {
      /* localStorage unavailable — stay on base */
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/rates")
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.rates && typeof d.rates === "object") setRates(d.rates);
      })
      .catch(() => {
        /* keep fallback rates */
      });
    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback((c: string) => {
    if (!isCurrencyCode(c)) return;
    setCode(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const rate = rates[code] ?? FALLBACK_RATES[code] ?? 1;

  const money = useCallback((inr: number | string) => formatMoney(extractInr(inr), code, rate), [code, rate]);
  const localize = useCallback((s: string) => localizeText(s, code, rate), [code, rate]);

  return (
    <CurrencyContext.Provider value={{ code, setCurrency, money, localize }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Safe default (identity) so any price display works even outside the provider.
export function useCurrency(): Ctx {
  return (
    useContext(CurrencyContext) ?? {
      code: BASE,
      setCurrency: () => {},
      money: (inr) => String(inr),
      localize: (s) => s,
    }
  );
}
