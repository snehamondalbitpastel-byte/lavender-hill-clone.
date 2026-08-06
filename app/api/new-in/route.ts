import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";

// GET /api/new-in — products flagged "New In page" in the admin (isNew = true).
// Now DB-backed (was a static JSON), so ticking "New In" on a product makes it
// appear here immediately. One card per product, in the catalogue order.
export async function GET() {
  const rows = await prisma.product.findMany({
    where: { isNew: true },
    orderBy: { order: "asc" },
  });

  const result = rows.map((p) => {
    const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
    const saveBadge = pricing.saveBadge;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: pricing.priceStr,
      compareAt: pricing.compareAtStr,
      image: p.image,
      hover: p.hover,
      rating: p.rating,
      reviews: p.reviews,
      badge: saveBadge ? null : p.badge,
      saveBadge,
      colors: JSON.parse(p.colors) as string[],
      productType: p.productType,
      sizes: JSON.parse(p.sizes) as string[],
      bestseller: p.bestseller,
    };
  });

  return Response.json(result);
}
