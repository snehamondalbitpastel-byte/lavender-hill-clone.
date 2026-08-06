import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

// The shop grid (`Card`) is DERIVED from products: one card per colour. Whenever
// a product is created / edited / deleted, call regenerateCards() so the grid
// stays in sync. Products keep an `order`; colours keep their order in colourData.
// The seed passes its own client so seed and admin use ONE implementation.

export type Colour = { name: string; hex: string; image: string; hover: string };

function num(price: string | null | undefined): number {
  // Pull the first number out of e.g. "Rs. 4,200.00" or "Save Rs2,000.00".
  const m = (price ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
// Format a whole-rupee number back into the catalogue's price string style.
function fmtRs(n: number): string {
  return "Rs. " + Math.round(n).toLocaleString("en-US") + ".00";
}
function niceTitle(t: string): string {
  return t.replace(/T-Shirt/gi, "t-shirt");
}
function parse<T>(s: string | null | undefined, fallback: T): T {
  try {
    return JSON.parse(s ?? "") as T;
  } catch {
    return fallback;
  }
}

// ── The one place that decides what a product actually sells for ──────────────
// Given a product's list `price`, its manual `compareAtPrice`, and its per-product
// discount, returns the selling price, the struck-through "was" price, and the
// "Save Rs X" badge. Used by the shop grid (regenerateCards), every storefront
// API, and checkout (computeOrder) so they can never disagree.
//
// Precedence (no double-counting): an active per-product discount is THE sale —
// it computes off `price`, and the struck-through "was" becomes `price`. With no
// discount, the legacy compare-at path is preserved exactly (compareAt > price →
// on sale). Both effects never stack on each other.
export type PricingType = string | null | undefined;
export function productPricing(
  price: string,
  compareAtPrice: string | null,
  discountType?: PricingType,
  discountValue?: number | null
) {
  const list = num(price);
  const type = discountType ?? "";
  const value = Number(discountValue) || 0;

  let discountAmt = 0; // per-unit rupees taken off, kept to whole rupees
  if (list > 0 && value > 0) {
    if (type === "percent") discountAmt = Math.round((list * Math.min(value, 100)) / 100);
    else if (type === "fixed") discountAmt = Math.min(Math.round(value), list);
  }
  const hasDiscount = discountAmt > 0;
  const selling = Math.max(0, list - discountAmt);

  // Struck-through "was" price: the active discount wins; else a manual compare-at
  // that's genuinely higher than the price (the legacy sale).
  const manual = num(compareAtPrice);
  const compareAtNum = hasDiscount ? list : manual > list && list > 0 ? manual : 0;
  const onSale = compareAtNum > selling && compareAtNum > 0;
  const save = onSale ? compareAtNum - selling : 0;

  return {
    onSale,
    hasDiscount,
    selling, // number — the price actually charged (for checkout)
    list, // number — the pre-discount price
    discountAmt, // number — per-unit rupees off (0 if none)
    // Strings for display (match the catalogue's "Rs. X.00" style):
    priceStr: hasDiscount ? fmtRs(selling) : price,
    compareAtStr: onSale ? (hasDiscount ? price : compareAtPrice) : null,
    saveBadge: onSale
      ? "Save Rs" + Math.round(save).toLocaleString("en-US") + ".00"
      : null,
  };
}

// On-sale check + the "Save Rs X" badge. Thin wrapper over productPricing() kept
// for existing callers — identical output when there's no per-product discount.
export function saleInfo(price: string, compareAtPrice: string | null) {
  const r = productPricing(price, compareAtPrice);
  return { onSale: r.onSale, saveBadge: r.saveBadge };
}

// Rebuild the whole Card table from all products.
export async function regenerateCards(
  db: PrismaClient = defaultPrisma
): Promise<number> {
  const products = await db.product.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const rows: Prisma.CardCreateManyInput[] = [];
  let order = 0;

  for (const p of products) {
    const colours = parse<Colour[]>(p.colourData, []).filter((c) => c && c.name);
    const swatches = parse<string[]>(p.colors, []);
    const sizes = parse<string[]>(p.sizes, []);
    const allHex =
      swatches.length > 0 ? swatches : colours.map((c) => c.hex).filter(Boolean);
    // Bake any per-product discount (or manual compare-at sale) into the card's
    // price + save badge, so the grid shows exactly what the customer will pay.
    const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
    const saveBadge = pricing.saveBadge;
    const badge = saveBadge ? null : p.badge; // sale badge replaces the promo badge

    // A product with no colours becomes a single colourless card.
    const list: Array<Colour | null> = colours.length > 0 ? colours : [null];

    for (const c of list) {
      rows.push({
        order: order++,
        productSlug: p.slug,
        colour: c ? c.name : null,
        title: c ? `${c.name} ${niceTitle(p.title)}` : p.title,
        price: pricing.priceStr,
        image: (c && c.image) || p.image,
        hover: (c && c.hover) || (c && c.image) || p.hover,
        rating: p.rating,
        reviews: p.reviews,
        badge,
        saveBadge,
        swatch: (c && c.hex) || "",
        colors: JSON.stringify(allHex),
        productType: p.productType,
        sizes: JSON.stringify(sizes),
        bestseller: p.bestseller,
      });
    }
  }

  await db.$transaction([
    db.card.deleteMany(),
    db.card.createMany({ data: rows }),
  ]);

  return rows.length;
}
