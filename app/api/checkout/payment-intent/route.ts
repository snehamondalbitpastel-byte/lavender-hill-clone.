import { getCustomerSession } from "@/lib/customer-auth";
import { computeOrder, type CartLineInput } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

// POST /api/checkout/payment-intent — { items } → a Stripe PaymentIntent for the
// server-computed total (or a mock when Stripe isn't configured).
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return Response.json({ error: "Please sign in to check out." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const items = (Array.isArray(body.items) ? body.items : []) as CartLineInput[];
  const code = String(body.code ?? "").trim();
  if (items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // Recompute (with the coupon, if any) server-side — this is the amount charged.
  const order = await computeOrder(items, { code, customerId: session.customerId });

  // A code that no longer qualifies (e.g. the cart dropped below its minimum) is
  // NOT a hard error — computeOrder already ignored it, so we just report the
  // reason back and let the checkout gracefully remove it and continue.
  const summary = {
    subtotal: order.subtotal,
    bundleDiscount: order.bundleDiscount,
    couponDiscount: order.couponDiscount,
    couponCode: order.couponCode,
    couponError: order.couponError ?? null,
    total: order.total,
  };

  // Free order (e.g. a 100%-off coupon) — no payment step; the client places it directly.
  if (order.total <= 0) {
    return Response.json({ free: true, mock: true, ...summary });
  }

  if (!stripe) {
    return Response.json({ mock: true, ...summary });
  }

  const pi = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100), // amount in paise
    currency: "inr",
    // Card-only → a clean card field (no Stripe Link "save my info" signup,
    // whose internal layout Stripe controls and we can't reorder).
    payment_method_types: ["card"],
    metadata: { customerId: String(session.customerId), email: session.email, code: order.couponCode },
  });
  return Response.json({ mock: false, clientSecret: pi.client_secret, ...summary });
}
