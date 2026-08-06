import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";
import { normalizeContent } from "@/lib/products";

type Colour = { name: string; hex: string; image: string; hover: string; stock?: number | null; sizeStock?: Record<string, number | null> };

function safeParse(json: string) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

// GET /api/products/[id] — one product's full detail, by numeric id OR slug.
// Powers the dynamic product page (/products/[id]); reflects admin edits.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  const byId = Number.isInteger(numId) && String(numId) === id;

  const product = await prisma.product.findFirst({
    where: byId ? { id: numId } : { slug: id },
  });
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const pricing = productPricing(
    product.price,
    product.compareAtPrice,
    product.discountType,
    product.discountValue
  );
  const saveBadge = pricing.saveBadge;

  let colours: Colour[] = [];
  let sizes: string[] = [];
  try {
    colours = JSON.parse(product.colourData || "[]");
  } catch {}
  try {
    sizes = JSON.parse(product.sizes || "[]");
  } catch {}

  const content = normalizeContent(safeParse(product.content));

  // You Might Also Like — auto: a few other products in the same category.
  const relatedRows = product.category
    ? await prisma.product.findMany({
        where: { category: product.category, id: { not: product.id } },
        orderBy: { order: "asc" },
        take: 6,
      })
    : [];
  const related = relatedRows.map((r) => {
    const rp = productPricing(r.price, r.compareAtPrice, r.discountType, r.discountValue);
    return {
      slug: r.slug,
      title: r.title,
      price: rp.priceStr,
      compareAt: rp.compareAtStr,
      saveBadge: rp.saveBadge,
      image: r.image,
      hover: r.hover,
    };
  });

  return Response.json({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    price: pricing.priceStr,
    compareAtPrice: pricing.compareAtStr,
    saveBadge,
    image: product.image,
    hover: product.hover,
    rating: product.rating,
    reviews: product.reviews,
    // One badge per product: a sale ("Save Rs X") replaces the promo badge —
    // same rule the shop cards use (see regenerateCards in lib/cards.ts).
    badge: saveBadge ? null : product.badge,
    productType: product.productType,
    // Each colour carries its own `stock` (from colourData) — the storefront
    // reads the SELECTED colour's stock. null on a colour = untracked.
    colours,
    sizes,
    content,
    related,
  });
}
