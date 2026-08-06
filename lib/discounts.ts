// ============================================================================
// Discount / coupon codes — server-side validation (the single source of truth
// for whether a code is usable and how much it takes off). Called from
// computeOrder(), so a tampered client can never fake a discount.
//
// Conditions checked (all of them, in order):
//   • code exists and is active
//   • within its date window (startsAt / endsAt)
//   • global usage limit not exhausted (usageCount < usageLimit)
//   • once-per-customer (no prior PAID order used this code by this customer)
//   • order subtotal meets the minimum
// Amount: percent (capped by maxDiscount) or a flat rupee amount, never more
// than the amount it applies to.
// ============================================================================

import { prisma } from "./prisma";
import { round2 } from "./order-status";

export function normalizeCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type DiscountResult =
  | { ok: true; code: string; type: string; discount: number }
  | { ok: false; error: string };

export async function validateDiscount(opts: {
  code: string;
  subtotal: number; // the amount the coupon reduces (we pass the POST-bundle subtotal)
  customerId?: number | null;
}): Promise<DiscountResult> {
  const code = normalizeCode(opts.code);
  if (!code) return { ok: false, error: "Enter a discount code." };

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc || !dc.active) return { ok: false, error: "This code isn't valid." };

  const now = new Date();
  if (dc.startsAt && dc.startsAt > now) return { ok: false, error: "This code isn't active yet." };
  if (dc.endsAt && dc.endsAt < now) return { ok: false, error: "This code has expired." };

  if (dc.usageLimit != null && dc.usageCount >= dc.usageLimit) {
    return { ok: false, error: "This code has reached its usage limit." };
  }

  if (opts.subtotal < dc.minSubtotal) {
    return { ok: false, error: `Spend at least ${inr(dc.minSubtotal)} to use this code.` };
  }

  // Once-per-customer (admin-controlled): when enabled, a code is spent for a
  // customer once they have a paid order that used it. Orders only exist after
  // successful payment, so this is exact. When disabled, a customer may redeem
  // the code repeatedly, bounded only by the global usage limit / dates.
  if (opts.customerId && dc.oncePerCustomer) {
    const used = await prisma.order.count({
      where: { customerId: opts.customerId, discountCode: code },
    });
    if (used > 0) return { ok: false, error: "You've already used this code." };
  }

  let discount: number;
  if (dc.type === "percent") {
    discount = round2((opts.subtotal * dc.value) / 100);
    if (dc.maxDiscount != null) discount = Math.min(discount, dc.maxDiscount);
  } else {
    discount = dc.value; // fixed rupee amount
  }
  discount = round2(Math.min(discount, opts.subtotal)); // never take the total below zero
  if (discount <= 0) return { ok: false, error: "This code doesn't apply to your cart." };

  return { ok: true, code, type: dc.type, discount };
}
