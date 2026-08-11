import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// GET /api/looks — the "As Styled By You" carousel. When a look is linked to a
// product (productSlug), its card — name, price, images, colours, and the "View
// product" link — is DERIVED from that product, so the card always matches where
// the button goes. The lifestyle photo + hotspot stay on the look. Looks with no
// linked product fall back to their stored fields.
export async function GET() {
  const looks = await prisma.look.findMany({ orderBy: { order: "asc" } });

  const slugs = [...new Set(looks.map((l) => l.productSlug).filter(Boolean))];
  const products = slugs.length
    ? await prisma.product.findMany({ where: { slug: { in: slugs } } })
    : [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const resolved = looks.map((l) => {
    const p = l.productSlug ? bySlug.get(l.productSlug) : undefined;
    if (p) {
      const pr = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
      let hex: string[] = [];
      try {
        hex = JSON.parse(p.colors) as string[];
      } catch {}
      return {
        ...l,
        name: p.title,
        price: pr.priceStr,
        productImg: p.image,
        productImgAlt: p.hover || p.image,
        colors: hex,
        href: `/products/${p.slug}`,
      };
    }
    let colors: string[] = [];
    try {
      colors = JSON.parse(l.colors) as string[];
    } catch {}
    return { ...l, colors };
  });

  const locale = await getLocale();
  const names = await localizeMany(resolved.map((l) => l.name), locale);

  return Response.json(resolved.map((l, i) => ({ ...l, name: names[i] })));
}
