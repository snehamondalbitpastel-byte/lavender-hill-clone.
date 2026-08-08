import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

type CardRow = { colors: string; sizes: string; title: string; badge: string | null };
const parse = (c: CardRow) => ({
  ...c,
  colors: JSON.parse(c.colors) as string[],
  sizes: JSON.parse(c.sizes) as string[],
});

// Parse + localize a set of cards for the caller's language, then respond.
// Card titles (and promo badges) are translated for the current locale; the base
// language returns unchanged. Prices stay INR — the client localizes currency.
async function respond<T extends CardRow>(cards: T[]) {
  const parsed = cards.map(parse);
  const locale = await getLocale();
  const [titles, badges] = await Promise.all([
    localizeMany(parsed.map((c) => c.title), locale),
    localizeMany(parsed.map((c) => c.badge ?? ""), locale),
  ]);
  parsed.forEach((c, i) => {
    c.title = titles[i];
    if (c.badge) c.badge = badges[i];
  });
  return Response.json(parsed);
}

// The shop grid is DERIVED from products (one card per colour) and kept in sync
// by regenerateCards(). These views read the whole live set — nothing is capped,
// so a product added in the admin shows up here immediately.
//   GET /api/cards                 — every card (the shop grid).
//   GET /api/cards?category=handle — only cards whose product is in that category.
//   GET /api/cards?sale=true       — only on-sale cards.
//   GET /api/cards?new=true        — only "New In" cards (product.isNew).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sale = searchParams.get("sale");
  const newIn = searchParams.get("new");
  const bestseller = searchParams.get("bestseller");

  // Sale view — every on-sale card.
  if (sale === "true") {
    const cards = await prisma.card.findMany({
      where: { saveBadge: { not: null } },
      orderBy: { order: "asc" },
    });
    return respond(cards);
  }

  // New In view — only cards whose product is flagged "New In" (isNew), so the
  // New In page reuses the shop grid+filter against just these products.
  if (newIn === "true") {
    const products = await prisma.product.findMany({
      where: { isNew: true },
      select: { slug: true },
    });
    const slugs = products.map((p) => p.slug);
    const cards = await prisma.card.findMany({
      where: { productSlug: { in: slugs } },
      orderBy: { order: "asc" },
    });
    return respond(cards);
  }

  // Bestsellers view — cards whose product is flagged "Bestseller" (the home
  // page "Our Bestselling T-Shirts" section reads this).
  if (bestseller === "true") {
    const products = await prisma.product.findMany({
      where: { bestseller: true },
      select: { slug: true },
    });
    const slugs = products.map((p) => p.slug);
    const cards = await prisma.card.findMany({
      where: { productSlug: { in: slugs } },
      orderBy: { order: "asc" },
    });
    return respond(cards);
  }

  // Category view — only cards whose product belongs to this category.
  if (category) {
    const products = await prisma.product.findMany({
      where: { OR: [{ category }, { categories: { has: category } }] },
      select: { slug: true },
    });
    const slugs = products.map((p) => p.slug);
    const cards = await prisma.card.findMany({
      where: { productSlug: { in: slugs } },
      orderBy: { order: "asc" },
    });
    return respond(cards);
  }

  // Full shop grid.
  const cards = await prisma.card.findMany({ orderBy: { order: "asc" } });
  return respond(cards);
}
