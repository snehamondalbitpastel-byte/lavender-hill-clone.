import { getCustomerSession } from "@/lib/customer-auth";
import { computeOrder, type CartLineInput } from "@/lib/orders";

// POST /api/checkout/apply-discount  { items, code }
// Previews a coupon against the current cart. Returns the discount + new total,
// or a clear reason it can't be applied. The real charge is recomputed again at
// payment/order time — this endpoint is only for live feedback at checkout.
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Please sign in to check out." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items = (Array.isArray(body.items) ? body.items : []) as CartLineInput[];
  const code = String(body.code ?? "").trim();
  if (items.length === 0) return Response.json({ error: "Your cart is empty." }, { status: 400 });
  if (!code) return Response.json({ error: "Enter a discount code." }, { status: 400 });

  const order = await computeOrder(items, { code, customerId: session.customerId });
  if (order.couponError) {
    return Response.json({ ok: false, error: order.couponError }, { status: 200 });
  }
  return Response.json({
    ok: true,
    code: order.couponCode,
    discount: order.couponDiscount,
    subtotal: order.subtotal,
    bundleDiscount: order.bundleDiscount,
    total: order.total,
  });
}
