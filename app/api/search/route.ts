import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// Predictive search for the header dropdown (two tabs: Products + Collections).
//   GET /api/search?q=cotton         → { products:[…full cards], collections:[…] }
//   GET /api/search?q=cotton&limit=8 → cap the products returned
// Products come back as full shop CARDS (colour swatches + rating + price), one
// per product, so the dropdown/search page render the same card as the shop grid.
// Titles/badges are localized; prices stay INR (the client localizes currency).
//
// Real-world relevance search: the query is split into WORDS and each word is
// matched (as a substring, case-insensitive) across the product's title, COLOUR
// names, product type, category and description. A product that matches ANY word
// shows up, and results are RANKED so the closest matches come first. So "red
// shirt" surfaces red t-shirts first, then red tops / red shorts (matched on the
// colour "red") — instead of "no results". Simple plural→singular folding means
// "shirts"/"shorts" also match "shirt"/"short".

type CardRow = { colors: string; sizes: string; title: string; badge: string | null; colour: string | null };
const parse = (c: CardRow) => ({ ...c, colors: JSON.parse(c.colors) as string[], sizes: JSON.parse(c.sizes) as string[] });

// The colour names inside a product's colourData JSON, lowercased (for ranking).
function colourNamesOf(colourData: string): string[] {
  try {
    const arr = JSON.parse(colourData || "[]");
    return Array.isArray(arr) ? arr.map((c) => String(c?.name ?? "").toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 48);
  if (q.length < 2) return Response.json({ products: [], collections: [] });

  const qLower = q.toLowerCase();

  // Split into words (≥2 chars). For each word keep its variants: the word itself
  // plus a plural→singular form ("shirts"→"shirt") so both match. Falls back to
  // the whole query if nothing splits out.
  const words = qLower.split(/[^a-z0-9]+/i).filter((w) => w.length >= 2);
  const terms = (words.length ? words : [qLower]).map((w) => {
    const variants = new Set<string>([w]);
    if (w.length > 3 && w.endsWith("s")) variants.add(w.slice(0, -1)); // plural → singular
    return { variants: [...variants] };
  });

  // Broad "any word, any field" candidate net (colourData is the JSON that holds
  // each colour's name, so searching it makes "red" match red products).
  const productOr = terms.flatMap((term) =>
    term.variants.flatMap((v) => [
      { title: { contains: v, mode: "insensitive" as const } },
      { productType: { contains: v, mode: "insensitive" as const } },
      { category: { contains: v, mode: "insensitive" as const } },
      { description: { contains: v, mode: "insensitive" as const } },
      { colourData: { contains: v, mode: "insensitive" as const } },
    ])
  );
  const collectionOr = terms.flatMap((term) =>
    term.variants.flatMap((v) => [
      { label: { contains: v, mode: "insensitive" as const } },
      { heading: { contains: v, mode: "insensitive" as const } },
      { handle: { contains: v, mode: "insensitive" as const } },
    ])
  );

  const [candidates, catRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        hiddenFromShop: false, // look-only / hidden products never appear in search
        OR: productOr,
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      take: 300, // cap the candidate pool; ranking + limit trims below
      select: { slug: true, title: true, productType: true, category: true, description: true, colourData: true },
    }),
    prisma.category.findMany({
      where: { OR: collectionOr },
      orderBy: [{ order: "asc" }, { label: "asc" }],
      take: 12,
    }),
  ]);

  // ---- Rank candidates by relevance --------------------------------------
  // Per word we take the best field it matched (title > colour > type > category
  // > description), sum those, then add bonuses for matching EVERY word and for
  // an exact phrase in the title. Keeps the closest matches at the top.
  // Regex-escape a term, then match it at a WORD START in the description — so
  // "red" matches the word "red" (or "reddish") but NOT "laye-red"/"cove-red".
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function scoreOf(p: (typeof candidates)[number]): { score: number; matched: number } {
    const title = p.title.toLowerCase();
    const type = (p.productType || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const colours = colourNamesOf(p.colourData);
    let score = 0;
    let matched = 0;
    for (const term of terms) {
      let best = 0;
      for (const v of term.variants) {
        if (title.includes(v)) best = Math.max(best, 10);
        if (colours.some((c) => c.includes(v))) best = Math.max(best, 8);
        if (type.includes(v)) best = Math.max(best, 6);
        if (cat.includes(v)) best = Math.max(best, 4);
        // Description: whole-word match only (avoids "red" ⊂ "layered" noise).
        if (new RegExp(`\\b${esc(v)}`, "i").test(desc)) best = Math.max(best, 2);
      }
      if (best > 0) matched++;
      score += best;
    }
    if (matched === terms.length) score += 20; // every word found → strong match
    if (title.includes(qLower)) score += 30; // exact phrase in the name → top
    return { score, matched };
  }

  const ranked = candidates
    .map((p) => ({ p, ...scoreOf(p) }))
    .filter((x) => x.matched > 0)
    .sort((a, b) => b.score - a.score); // stable: equal scores keep order-asc
  const slugs = ranked.slice(0, limit).map((x) => x.p.slug);

  // One card per matching product (the first colour), in relevance order.
  const cardRows = await prisma.card.findMany({ where: { productSlug: { in: slugs } }, orderBy: { order: "asc" } });
  const bySlug = new Map<string, (typeof cardRows)[number]>();
  for (const c of cardRows) if (!bySlug.has(c.productSlug)) bySlug.set(c.productSlug, c);
  const products = slugs.map((s) => bySlug.get(s)).filter(Boolean).map((c) => parse(c as CardRow));

  // Strip the colour prefix so the title reads as the product name.
  for (const c of products) {
    if (c.colour && c.title.startsWith(`${c.colour} `)) c.title = c.title.slice(c.colour.length + 1);
  }

  // Localize product titles/badges + collection labels for the caller's language.
  const locale = await getLocale();
  const [titles, badges, colLabels] = await Promise.all([
    localizeMany(products.map((c) => c.title), locale),
    localizeMany(products.map((c) => c.badge ?? ""), locale),
    localizeMany(catRows.map((c) => c.heading || c.label), locale),
  ]);
  products.forEach((c, i) => {
    c.title = titles[i];
    if (c.badge) c.badge = badges[i];
  });
  const collections = catRows.map((c, i) => ({ handle: c.handle, label: colLabels[i] }));

  return Response.json({ products, collections });
}
