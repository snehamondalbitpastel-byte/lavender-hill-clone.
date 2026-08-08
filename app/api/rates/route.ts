import { BASE, FALLBACK_RATES } from "@/lib/currency";

// Live exchange rates (1 INR → every currency), for the storefront currency
// selector. Fetched from a free, no-key provider (≈160 currencies) and cached
// for an hour; if it's unreachable we return the static fallback so prices never
// break. DISPLAY ONLY — orders/Stripe stay in INR.
export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates && typeof data.rates === "object") {
        // Live feed wins; fallback fills any gaps (and guarantees INR = 1).
        return Response.json({ base: BASE, rates: { ...FALLBACK_RATES, ...data.rates }, source: "live" });
      }
    }
  } catch {
    /* provider down — fall through to the static table */
  }
  return Response.json({ base: BASE, rates: FALLBACK_RATES, source: "fallback" });
}
