// Multi-currency display — fully dynamic. Prices are authored + stored ONCE in
// the base currency (INR, as "Rs. 5,200.00" strings / rupee numbers). These pure
// helpers convert an INR amount into the shopper's chosen currency FOR DISPLAY
// ONLY — orders, Stripe and every server record stay in INR.
//
// No hand-maintained symbol/decimals table: Intl.NumberFormat derives the right
// symbol and decimal rules for EVERY ISO-4217 currency automatically. The country
// list comes from `world-countries` and the rates from a live API — see
// /api/countries and /api/rates.

export const BASE = "INR";

// Offline fallback (1 INR → X). Used ONLY if the live rates API is unreachable;
// the live feed (≈160 currencies) overrides these on load.
export const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0094,
  EUR: 0.011,
  CAD: 0.0164,
  AUD: 0.0181,
  NZD: 0.02,
  JPY: 1.78,
  CNY: 0.0868,
  SGD: 0.0155,
  HKD: 0.0935,
  AED: 0.044,
};

// A currency code is a 3-letter ISO code.
export function isCurrencyCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{3}$/.test(code);
}

// Pull the numeric rupee value out of a price string ("Rs. 4,200.00" → 4200) or
// pass a number straight through.
export function extractInr(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const m = String(v ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

// Convert an INR amount into the target currency and format it. INR keeps the
// catalogue's native "Rs. 5,200.00" style so the default (India) is byte-for-byte
// unchanged; every other currency is formatted by Intl (correct symbol +
// decimals), e.g. "£48.88", "¥9,256", "AED 229.00".
export function formatMoney(inr: number, code: string, rate: number): string {
  const converted = inr * (rate || 1);
  if (code === BASE) {
    return "Rs. " + converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(converted);
  } catch {
    // Unknown/unsupported code → a safe generic format.
    return converted.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " " + code;
  }
}

// Replace every "Rs …" amount inside a free-form string with the converted
// amount, preserving surrounding words. "Save Rs2,000.00" → "Save £18.80".
// Returned untouched when the base currency is selected.
export function localizeText(s: string, code: string, rate: number): string {
  if (!s || code === BASE) return s;
  return s.replace(/Rs\.?\s*([\d,]+(?:\.\d+)?)/g, (_m, n: string) =>
    formatMoney(parseFloat(n.replace(/,/g, "")), code, rate)
  );
}
