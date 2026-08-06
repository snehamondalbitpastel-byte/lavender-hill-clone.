import { prisma } from "@/lib/prisma";

type CardRow = { colors: string; sizes: string };
const parse = (c: CardRow) => ({
  ...c,
  colors: JSON.parse(c.colors) as string[],
  sizes: JSON.parse(c.sizes) as string[],
});

// The shop grid is DERIVED from products (one card per colour) and kept in sync
// by regenerateCards(). These views read the whole live set — nothing is capped,
// so a product added in the admin shows up here immediately.
//   GET /api/cards                 — every card (the shop grid).
//   GET /api/cards?category=handle — only cards whose product is in that category.
//   GET /api/cards?sale=true       — only on-sale cards.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sale = searchParams.get("sale");

  // Sale view — every on-sale card.
  if (sale === "true") {
    const cards = await prisma.card.findMany({
      where: { saveBadge: { not: null } },
      orderBy: { order: "asc" },
    });
    return Response.json(cards.map(parse));
  }

  // Category view — only cards whose product belongs to this category.
  if (category) {
    const products = await prisma.product.findMany({
      where: { category },
      select: { slug: true },
    });
    const slugs = products.map((p) => p.slug);
    const cards = await prisma.card.findMany({
      where: { productSlug: { in: slugs } },
      orderBy: { order: "asc" },
    });
    return Response.json(cards.map(parse));
  }

  // Full shop grid.
  const cards = await prisma.card.findMany({ orderBy: { order: "asc" } });
  return Response.json(cards.map(parse));
}
