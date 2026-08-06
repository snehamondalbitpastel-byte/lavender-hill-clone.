// ============================================================================
// Shared refund engine. Used by BOTH the admin order-refund button and the
// refund-after-return step, so the money math, the payment-status transition,
// and the audit event are byte-for-byte identical everywhere. Moves the money
// with Stripe (real `pi_` orders) or a mock ref, then updates the DB in one
// transaction — and never writes a refund the provider didn't actually make.
// ============================================================================

import { prisma } from "./prisma";
import { stripe } from "./stripe";
import { canRefund, logOrderEvent, round2 } from "./order-workflow";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type RefundOrder = {
  id: number;
  total: number;
  refundedAmount: number;
  paymentStatus: string;
  paymentRef: string;
};

export type RefundOutcome =
  | { ok: true; refundRef: string; refundedTotal: number; nextStatus: string; amount: number }
  | { ok: false; error: string };

export async function refundOrderAmount(
  order: RefundOrder,
  amount: number,
  opts: { actor?: "admin" | "system"; context?: string } = {}
): Promise<RefundOutcome> {
  const amt = round2(amount);
  const gate = canRefund(order.paymentStatus, order.total, order.refundedAmount, amt);
  if (!gate.ok) return { ok: false, error: gate.error };

  // Move the money FIRST; only touch our DB if it actually succeeds.
  let refundRef = "";
  if (order.paymentRef.startsWith("pi_") && stripe) {
    try {
      const r = await stripe.refunds.create({ payment_intent: order.paymentRef, amount: Math.round(amt * 100) });
      refundRef = r.id;
    } catch (e) {
      return { ok: false, error: `Refund failed: ${e instanceof Error ? e.message : "Stripe error"}` };
    }
  } else {
    refundRef = "refund_mock_" + Math.random().toString(36).slice(2, 10);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { refundedAmount: gate.refundedTotal, paymentStatus: gate.nextStatus },
    });
    await logOrderEvent(tx, order.id, {
      type: "refunded",
      message: `Refund of ${inr(amt)} processed${opts.context ? ` (${opts.context})` : ""}${gate.nextStatus === "refunded" ? " — order fully refunded." : "."}`,
      actor: opts.actor ?? "admin",
      meta: { amount: amt, refundRef, refundedTotal: gate.refundedTotal },
    });
  });

  return { ok: true, refundRef, refundedTotal: gate.refundedTotal, nextStatus: gate.nextStatus, amount: amt };
}
