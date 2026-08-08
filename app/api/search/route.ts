import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";

// Predictive search for the header dropdown (two tabs: Products + Collections).
//   GET /api/search?q=cotton        → { products:[…up to 24], collections:[…up to 12] }
//   GET /api/search?q=cotton&limit=8 → cap the products returned (dropdown uses this)
// Matches product title/type/category/description and collection label/heading.
// Prices are the base INR string; the client localizes them.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 48);
  if (q.length < 2) return Response.json({ products: [], collections: [] });

  const [productRows, catRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { productType: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      take: limit,
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

  const products = productRows.map((p) => {
    const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
    return {
      slug: p.slug,
      title: p.title,
      image: p.image,
      price: pricing.priceStr,
      compareAt: pricing.compareAtStr,
    };
  });

  const collections = catRows.map((c) => ({ handle: c.handle, label: c.heading || c.label }));

  return Response.json({ products, collections });
}
