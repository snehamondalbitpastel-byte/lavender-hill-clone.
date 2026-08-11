import { prisma } from "./prisma";
import { validateDiscount } from "./discounts";
import { productPricing } from "./cards";

// ============================================================
// Order pricing — RE-COMPUTED server-side from the product DB. The client cart
// is only trusted for WHICH product/colour/size/qty; every price + discount is
// derived here so a tampered cart can't change what's charged.
// ============================================================

export type CartLineInput = {
  productId: number;
  colour?: string; // localized display name (may be "白" etc.) — NOT reliable for matching
  colourKey?: string; // stable, language-independent colour id (hex, or "i<index>")
  size?: string;
  qty: number;
};

function parseRs(s: string | null | undefined): number {
  const m = (s ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
function parseBundle(badge: string | null): { threshold: number; pct: number } | null {
  if (!badge) return null;
  const pctM = badge.match(/(\d+)\s*%/);
  if (!pctM) return null;
  const thM = badge.match(/(\d+)\s*\+/);
  return { pct: Number(pctM[1]), threshold: thM ? Number(thM[1]) : 1 };
}

export type ComputedLine = {
  productId: number;
  slug: string;
  title: string;
  colour: string; // LOCALIZED display name (kept translated for the receipt/order)
  colourMatch: string; // CANONICAL colour name — used only for stock/restock matching
  size: string;
  image: string;
  price: number;
  compareAt: number | null;
  qty: number;
  lineTotal: number;
  bundleDiscount: number;
  badge: string | null;
};

export type ComputedOrder = {
  lines: ComputedLine[];
  subtotal: number; // sum of lineTotals (before any discount)
  bundleDiscount: number; // sum of "Buy 3+" style badge discounts
  couponDiscount: number; // amount from an applied coupon code (0 if none)
  couponCode: string; // the coupon actually applied (uppercase), or ""
  couponError?: string; // set when a code was supplied but rejected (coupon ignored)
  couponReason?: string; // WHY it was rejected ("below_min" = recoverable, else permanent)
  discount: number; // bundleDiscount + couponDiscount (total off)
  shipping: number;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function computeOrder(
  items: CartLineInput[],
  opts: { code?: string; customerId?: number | null } = {}
): Promise<ComputedOrder> {
  const lines: ComputedLine[] = [];
  let discount = 0;

  for (const it of items) {
    const product = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!product) continue;

    const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
    // Per-product discount (or manual compare-at sale) is applied FIRST, so the
    // unit price already reflects the markdown. The struck-through original goes
    // to `compareAt` for the receipt. Same source of truth as the storefront.
    const pricing = productPricing(product.price, product.compareAtPrice, product.discountType, product.discountValue);
    const price = pricing.selling;
    const compareAt = pricing.compareAtStr ? parseRs(pricing.compareAtStr) : null;
    const lineTotal = round2(price * qty);

    // "Buy 3+" bundle then applies on top of the already-discounted line total
    // (a bundle deal on the sale price), matching how it stacked before.
    const b = parseBundle(product.badge);
    const bundleDiscount = b && qty >= b.threshold ? round2((lineTotal * b.pct) / 100) : 0;
    discount += bundleDiscount;

    // Resolve the colour language-INDEPENDENTLY for MATCHING only. The cart sends a
    // stable `colourKey` (the colour's hex, or "i<index>"); match it against
    // colourData to get the CANONICAL colour name + image even when the shopper
    // browsed in another language ("白" → "White"). The DISPLAYED colour stays the
    // shopper's localized name (translation preserved on the receipt/order); the
    // canonical name is used only for per-variant stock + returns/restock.
    let colourMatch = it.colour ?? "";
    let image = product.image;
    try {
      const cds = JSON.parse(product.colourData || "[]") as { name: string; hex?: string; image?: string }[];
      const key = (it.colourKey ?? "").trim();
      let cd = key ? cds.find((c) => (c.hex ?? "").trim() === key && key !== "") : undefined;
      if (!cd && /^i\d+$/.test(key)) {
        const idx = Number(key.slice(1));
        if (idx >= 0 && idx < cds.length) cd = cds[idx];
      }
      if (!cd) cd = cds.find((c) => c.name === it.colour);
      if (cd) {
        colourMatch = cd.name;
        if (cd.image) image = cd.image;
      }
    } catch {
      /* ignore */
    }
    const colourDisplay = (it.colour ?? "").trim() || colourMatch; // keep the localized name for display

    lines.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      colour: colourDisplay,
      colourMatch,
      size: it.size ?? "",
      image,
      price,
      compareAt,
      qty,
      lineTotal,
      bundleDiscount,
      badge: product.badge,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const bundleDiscount = round2(discount);
  const shipping = 0; // free shipping for now

  // Coupon (optional). It STACKS on top of bundle discounts: it applies to what's
  // left after the bundle discount. Validated server-side — an invalid code is
  // ignored here and reported via `couponError` for the UI/route to handle.
  let couponDiscount = 0;
  let couponCode = "";
  let couponError: string | undefined;
  let couponReason: string | undefined;
  if (opts.code && String(opts.code).trim()) {
    const base = round2(subtotal - bundleDiscount);
    const r = await validateDiscount({ code: opts.code, subtotal: base, customerId: opts.customerId });
    if (r.ok) {
      couponDiscount = r.discount;
      couponCode = r.code;
    } else {
      couponError = r.error;
      couponReason = r.reason;
    }
  }

  const totalDiscount = round2(bundleDiscount + couponDiscount);
  const total = round2(subtotal - totalDiscount + shipping);
  return { lines, subtotal, bundleDiscount, couponDiscount, couponCode, couponError, couponReason, discount: totalDiscount, shipping, total };
}

export function formatRs(n: number): string {
  return "Rs. " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
