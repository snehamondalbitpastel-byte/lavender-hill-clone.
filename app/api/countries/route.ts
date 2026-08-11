import countries from "world-countries";
import { MARKET_CURRENCY } from "@/lib/markets";

// The country → currency list for the storefront localization selector. The SET
// of countries and each one's display currency are matched to the live Lavender
// Hill site (see lib/markets). Names come from the `world-countries` ISO dataset
// (English common name; the UI localises them), flags render client-side from the
// 2-letter code. Anything not in MARKET_CURRENCY is excluded (no extra countries).
export const dynamic = "force-static";

export function GET() {
  const list = countries
    .map((c) => {
      const currency = MARKET_CURRENCY[c.cca2];
      if (!currency) return null; // not a market the live site offers → exclude
      return { code: c.cca2, name: c.name.common, currency };
    })
    .filter((c): c is { code: string; name: string; currency: string } => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json(list);
}
