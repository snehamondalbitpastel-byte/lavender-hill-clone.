import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";

// GET /api/products            — all products
// GET /api/products?bestseller=true — only the homepage bestsellers
// (colours + sizes parsed from their JSON strings).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bestseller = searchParams.get("bestseller") === "true";

  const products = await prisma.product.findMany({
    where: bestseller ? { bestseller: true } : undefined,
    orderBy: { id: "asc" },
  });

  const result = products.map((p) => {
    // Reflect any per-product discount (or compare-at sale) in the price shown.
    const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
    return {
      ...p,
      price: pricing.priceStr,
      compareAt: pricing.compareAtStr,
      saveBadge: pricing.saveBadge,
      badge: pricing.saveBadge ? null : p.badge, // a sale replaces the promo badge
      colors: JSON.parse(p.colors) as string[],
      sizes: JSON.parse(p.sizes) as string[],
    };
  });

  return Response.json(result);
}
