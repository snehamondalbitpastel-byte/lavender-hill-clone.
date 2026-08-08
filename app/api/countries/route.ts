import countries from "world-countries";

// The full country → currency list for the storefront localization selector,
// derived dynamically from the `world-countries` ISO dataset (≈250 countries).
// No hand-maintained list: each country carries its ISO-4217 currency; the flag
// is rendered client-side from the 2-letter code (flag-icons). Built once and
// cached — it never changes at runtime.
export const dynamic = "force-static";

export function GET() {
  const list = countries
    .map((c) => {
      const currency = Object.keys(c.currencies ?? {})[0];
      if (!currency) return null; // skip territories with no currency
      return { code: c.cca2, name: c.name.common, currency };
    })
    .filter((c): c is { code: string; name: string; currency: string } => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json(list);
}
