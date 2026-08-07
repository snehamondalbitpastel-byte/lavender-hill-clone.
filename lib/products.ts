// Validation + normalisation of the admin product form into a Prisma-ready
// shape. Pure functions (no DB, no next/headers) so they're easy to test/reuse.

// Products per page in the admin list. Shared so the "jump to the product's
// page after saving" redirect matches the list's pagination exactly.
export const PRODUCTS_PER_PAGE = 7;

// Per-colour / per-size stock lives here (in colourData). `stock` is the
// colour-level fallback (used when the product has no sizes); `sizeStock` maps
// each offered size → units (null = that size untracked). null = unlimited.
export type ColourInput = {
  name: string;
  hex: string;
  image: string;
  hover: string;
  stock: number | null;
  sizeStock?: Record<string, number | null>;
};

// ---- Rich product-detail content (all admin-editable per product) ----
export type FeatureItem = { title: string; desc: string };
export type MaterialBadge = { label: string; icon: string };
export type AccordionItem = { title: string; body: string };
export type ProductContent = {
  materialMatters: MaterialBadge[];
  accordions: AccordionItem[];
  keyFeatures: { intro: string; image: string; items: FeatureItem[] };
  whyYouLoveIt: { image: string; items: FeatureItem[] };
  stylingTips: { image: string; tips: string[]; closing: string };
  behindTheSeams: { description: string; videoUrl: string; poster: string; images: string[] };
};

export const EMPTY_CONTENT: ProductContent = {
  materialMatters: [],
  accordions: [],
  keyFeatures: { intro: "", image: "", items: [] },
  whyYouLoveIt: { image: "", items: [] },
  stylingTips: { image: "", tips: [], closing: "" },
  behindTheSeams: { description: "", videoUrl: "", poster: "", images: [] },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const s = (v: unknown) => String(v ?? "").trim();
const sArr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const featItems = (v: unknown): FeatureItem[] =>
  Array.isArray(v)
    ? v
        .map((x: any) => ({ title: s(x?.title), desc: s(x?.desc) }))
        .filter((x) => x.title || x.desc)
    : [];

// Sanitise an incoming content object into a stable ProductContent shape.
export function normalizeContent(input: any): ProductContent {
  const c = input && typeof input === "object" ? input : {};
  return {
    materialMatters: Array.isArray(c.materialMatters)
      ? c.materialMatters
          .map((m: any) => ({ label: s(m?.label), icon: s(m?.icon) }))
          .filter((m: MaterialBadge) => m.label)
      : [],
    accordions: Array.isArray(c.accordions)
      ? c.accordions
          .map((a: any) => ({ title: s(a?.title), body: s(a?.body) }))
          .filter((a: AccordionItem) => a.title)
      : [],
    keyFeatures: {
      intro: s(c.keyFeatures?.intro),
      image: s(c.keyFeatures?.image),
      items: featItems(c.keyFeatures?.items),
    },
    whyYouLoveIt: {
      image: s(c.whyYouLoveIt?.image),
      items: featItems(c.whyYouLoveIt?.items),
    },
    stylingTips: {
      image: s(c.stylingTips?.image),
      tips: sArr(c.stylingTips?.tips),
      closing: s(c.stylingTips?.closing),
    },
    behindTheSeams: {
      description: s(c.behindTheSeams?.description),
      videoUrl: s(c.behindTheSeams?.videoUrl),
      poster: s(c.behindTheSeams?.poster),
      images: sArr(c.behindTheSeams?.images),
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type ProductData = {
  title: string;
  description: string;
  category: string;
  categories: string[];
  productType: string;
  price: string;
  compareAtPrice: string | null;
  discountType: string; // "" (none) | percent | fixed
  discountValue: number; // percent (0–100) or fixed rupees
  image: string;
  hover: string;
  rating: number;
  reviews: number;
  stock: number | null; // units in stock; null = not tracked (unlimited)
  badge: string | null;
  colors: string; // JSON
  sizes: string; // JSON
  colourData: string; // JSON
  content: string; // JSON (ProductContent)
  bestseller: boolean;
  isNew: boolean;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Accepts "5200" or "Rs. 5,200.00" → "Rs. 5,200.00". Returns null if no number.
export function normPrice(v: unknown): string | null {
  const m = String(v ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Math.round(parseFloat(m[0]));
  return "Rs. " + n.toLocaleString("en-US") + ".00";
}

type Result =
  | { ok: true; data: ProductData; slug: string }
  | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProduct(body: any): Result {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };

  const title = String(body.title ?? "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const price = normPrice(body.price);
  if (!price) return { ok: false, error: "A valid price is required (e.g. 5200)." };

  const sizes: string[] = Array.isArray(body.sizes)
    ? body.sizes.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];

  // blank/empty → null (untracked / unlimited); a number → clamped ≥ 0.
  const parseStock = (v: unknown): number | null =>
    v === "" || v == null ? null : Math.max(0, Math.floor(Number(v) || 0));

  const colours: ColourInput[] = Array.isArray(body.colours)
    ? body.colours
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c && c.name && c.image)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => {
          const base: ColourInput = {
            name: String(c.name).trim(),
            hex: String(c.hex || "#cccccc").trim(),
            image: String(c.image).trim(),
            hover: String(c.hover || c.image).trim(),
            // Colour-level stock — the fallback used only when there are NO sizes.
            stock: parseStock(c.stock),
          };
          // When the product offers sizes, stock is tracked PER SIZE: one entry per
          // offered size (blank → null = untracked). This supersedes `stock`.
          if (sizes.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const provided = c.sizeStock && typeof c.sizeStock === "object" ? (c.sizeStock as any) : {};
            const ss: Record<string, number | null> = {};
            for (const sz of sizes) ss[sz] = parseStock(provided[sz]);
            base.sizeStock = ss;
          }
          return base;
        })
    : [];

  const image = colours[0]?.image ?? String(body.image ?? "").trim();
  const hover = colours[0]?.hover ?? String(body.hover ?? image).trim();
  if (!image) {
    return { ok: false, error: "Add at least one colour with an image URL." };
  }

  const compareAtPrice = body.compareAtPrice ? normPrice(body.compareAtPrice) : null;

  // Per-product discount: type must be percent|fixed (anything else = none).
  // Percent is capped at 100; a discount with no type or a zero value is "none".
  const dt = String(body.discountType ?? "").trim();
  const discountType = dt === "percent" || dt === "fixed" ? dt : "";
  let discountValue = Math.max(0, Number(body.discountValue) || 0);
  if (discountType === "percent") discountValue = Math.min(discountValue, 100);
  if (!discountType) discountValue = 0;

  const data: ProductData = {
    title,
    description: String(body.description ?? "").trim(),
    category: String(body.category ?? "").trim(),
    categories: Array.isArray(body.categories)
      ? body.categories.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [],
    productType: String(body.productType ?? "").trim(),
    price,
    compareAtPrice,
    discountType,
    discountValue,
    image,
    hover,
    rating: Math.max(0, Math.min(5, Number(body.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(body.reviews) || 0)),
    // Stock: blank/empty → null (not tracked / unlimited); a number → clamped ≥ 0.
    stock: body.stock === "" || body.stock == null ? null : Math.max(0, Math.floor(Number(body.stock) || 0)),
    badge: body.badge ? String(body.badge).trim() : null,
    colors: JSON.stringify(colours.map((c) => c.hex)),
    sizes: JSON.stringify(sizes),
    colourData: JSON.stringify(colours),
    content: JSON.stringify(normalizeContent(body.content)),
    bestseller: !!body.bestseller,
    isNew: !!body.isNew,
  };

  return { ok: true, data, slug: slugify(body.slug || title) };
}
