import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// Predictive search for the header dropdown (two tabs: Products + Collections).
//   GET /api/search?q=cotton         → { products:[…full cards], collections:[…] }
//   GET /api/search?q=cotton&limit=8 → cap the products returned
// Products come back as full shop CARDS (colour swatches + rating + price), one
// per product, so the dropdown/search page render the same card as the shop grid.
// Titles/badges are localized; prices stay INR (the client localizes currency).

type CardRow = { colors: string; sizes: string; title: string; badge: string | null; colour: string | null };
const parse = (c: CardRow) => ({ ...c, colors: JSON.parse(c.colors) as string[], sizes: JSON.parse(c.sizes) as string[] });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 48);
  if (q.length < 2) return Response.json({ products: [], collections: [] });

  const [productRows, catRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        hiddenFromShop: false, // look-only / hidden products never appear in search
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { productType: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      take: limit,
      select: { slug: true },
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { label: { contains: q, mode: "insensitive" } },
          { heading: { contains: q, mode: "insensitive" } },
          { handle: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ order: "asc" }, { label: "asc" }],
      take: 12,
    }),
  ]);

  // One card per matching product (the first colour), in product order.
  const slugs = productRows.map((p) => p.slug);
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
