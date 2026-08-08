import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";

// Predictive product search for the header search dropdown.
//   GET /api/search?q=cotton → up to 8 matching products.
// Matches title / product type / category / description (case-insensitive).
// Prices are returned in the base INR string; the client localizes them.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return Response.json([]);

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { productType: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    take: 8,
  });

  const results = products.map((p) => {
    const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
    return {
      slug: p.slug,
      title: p.title,
      image: p.image,
      price: pricing.priceStr,
      compareAt: pricing.compareAtStr,
    };
  });

  return Response.json(results);
}
