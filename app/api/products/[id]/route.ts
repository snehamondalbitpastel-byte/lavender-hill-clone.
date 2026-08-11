import { prisma } from "@/lib/prisma";
import { productPricing } from "@/lib/cards";
import { normalizeContent } from "@/lib/products";
import { getLocale } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localizeMany } from "@/lib/i18n/translations";

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

  // You Might Also Like — automatic recommendations. Prefer products in the same
  // primary category; if none (or the product has no category), fall back to any
  // that share a collection tag; finally, fall back to any other products — so the
  // section is never empty when there's more than one product in the store.
  const notThis = { id: { not: product.id }, hiddenFromShop: false };
  let relatedRows = product.category
    ? await prisma.product.findMany({
        where: { ...notThis, category: product.category },
        orderBy: { order: "asc" },
        take: 6,
      })
    : [];
  if (relatedRows.length === 0 && product.categories.length > 0) {
    relatedRows = await prisma.product.findMany({
      where: { ...notThis, categories: { hasSome: product.categories } },
      orderBy: { order: "asc" },
      take: 6,
    });
  }
  if (relatedRows.length === 0) {
    relatedRows = await prisma.product.findMany({
      where: notThis,
      orderBy: { order: "asc" },
      take: 6,
    });
  }
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

  const payload = {
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
    // UK 8–16 sizing + "Size chart" modal on the detail page (constant guide).
    sizeChart: product.sizeChart,
    content,
    related,
  };

  return Response.json(await localizeProduct(payload, await getLocale()));
}

type LocalizableProduct = {
  title: string;
  description: string;
  productType: string;
  badge: string | null;
  sizes: string[];
  colours: Colour[];
  related: { title: string; [k: string]: unknown }[];
  content: ReturnType<typeof normalizeContent>;
};

// Translate every text field of the product detail for the caller's language in
// one batched pass (title, description, type, colour names, related titles, and
// all rich-content copy). Prices/images/ids are untouched. Base locale → no-op.
async function localizeProduct<T extends LocalizableProduct>(
  payload: T,
  locale: string
): Promise<T> {
  if (locale === DEFAULT_LOCALE) return payload;
  const c = payload.content;

  const sources: string[] = [
    payload.title,
    payload.description,
    payload.productType ?? "",
    payload.badge ?? "",
    ...payload.sizes,
    ...payload.colours.map((x) => x.name),
    ...payload.related.map((x) => x.title),
    ...c.materialMatters.map((x) => x.label),
    ...c.accordions.flatMap((x) => [x.title, x.body]),
    c.keyFeatures.intro,
    ...c.keyFeatures.items.flatMap((x) => [x.title, x.desc]),
    ...c.whyYouLoveIt.items.flatMap((x) => [x.title, x.desc]),
    ...c.stylingTips.tips,
    c.stylingTips.closing,
    c.behindTheSeams.description,
  ];

  const translated = await localizeMany(sources, locale);
  const map = new Map<string, string>();
  sources.forEach((s, i) => {
    if (s) map.set(s, translated[i]);
  });
  const tr = (s: string) => (s ? map.get(s) ?? s : s);

  payload.title = tr(payload.title);
  payload.description = tr(payload.description);
  if (payload.productType) payload.productType = tr(payload.productType);
  if (payload.badge) payload.badge = tr(payload.badge);
  payload.sizes = payload.sizes.map(tr);
  payload.colours = payload.colours.map((x) => ({ ...x, name: tr(x.name) }));
  payload.related = payload.related.map((x) => ({ ...x, title: tr(x.title) }));
  payload.content = {
    ...c,
    materialMatters: c.materialMatters.map((x) => ({ ...x, label: tr(x.label) })),
    accordions: c.accordions.map((x) => ({ ...x, title: tr(x.title), body: tr(x.body) })),
    keyFeatures: {
      ...c.keyFeatures,
      intro: tr(c.keyFeatures.intro),
      items: c.keyFeatures.items.map((x) => ({ ...x, title: tr(x.title), desc: tr(x.desc) })),
    },
    whyYouLoveIt: {
      ...c.whyYouLoveIt,
      items: c.whyYouLoveIt.items.map((x) => ({ ...x, title: tr(x.title), desc: tr(x.desc) })),
    },
    stylingTips: {
      ...c.stylingTips,
      tips: c.stylingTips.tips.map(tr),
      closing: tr(c.stylingTips.closing),
    },
    behindTheSeams: { ...c.behindTheSeams, description: tr(c.behindTheSeams.description) },
  };

  return payload;
}
