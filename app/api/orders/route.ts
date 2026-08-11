import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { computeOrder, formatRs, type CartLineInput } from "@/lib/orders";
import { stripe } from "@/lib/stripe";
import { logOrderEventGlobal } from "@/lib/order-workflow";
import { variantStock, adjustVariantStock, MAX_PER_ORDER } from "@/lib/inventory";

const s = (v: unknown) => String(v ?? "").trim();

// POST /api/orders — place an order. Verifies payment (Stripe test mode or mock),
// re-computes all prices server-side, and stores the order.
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return Response.json({ error: "Please sign in to check out." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const items = (Array.isArray(body.items) ? body.items : []) as CartLineInput[];
  if (items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const d = body.delivery ?? {};
  const delivery = {
    country: s(d.country) || "India",
    firstName: s(d.firstName),
    lastName: s(d.lastName),
    company: s(d.company),
    address1: s(d.address1),
    address2: s(d.address2),
    city: s(d.city),
    state: s(d.state),
    postcode: s(d.postcode),
    phone: s(d.phone),
  };
  if (!delivery.address1 || !delivery.city) {
    return Response.json({ error: "Please enter your delivery address and city." }, { status: 400 });
  }

  const code = s(body.code);
  const computed = await computeOrder(items, { code, customerId: session.customerId });
  if (computed.lines.length === 0 || computed.total < 0) {
    return Response.json({ error: "Your cart is no longer valid." }, { status: 400 });
  }
  // A code supplied but no longer valid (expired / limit hit between apply and pay)
  // must stop checkout — otherwise we'd charge a different amount than was shown.
  if (code && computed.couponError) {
    return Response.json({ error: computed.couponError }, { status: 400 });
  }

  // Per-order cap — no single line may exceed MAX_PER_ORDER units (the cart also
  // enforces this; re-checked here so a tampered request can't get past it).
  // Checked BEFORE payment so a bad request is rejected before any charge.
  for (const l of computed.lines) {
    if (l.qty > MAX_PER_ORDER) {
      return Response.json(
        { error: `You can order at most ${MAX_PER_ORDER} of “${l.title}”${l.colour ? ` (${l.colour})` : ""} per order.` },
        { status: 400 }
      );
    }
  }

  // --- Payment verification (or free order) ---
  let paymentRef = "";
  let paymentBrand = "";
  let paymentLast4 = "";
  if (computed.total === 0) {
    // Free order (e.g. a 100%-off coupon) — no payment step is needed.
    paymentRef = "free_" + Math.random().toString(36).slice(2, 12);
  } else if (stripe) {
    const paymentIntentId = s(body.paymentIntentId);
    if (!paymentIntentId) {
      return Response.json({ error: "Payment not completed." }, { status: 400 });
    }
    // Idempotency: if this exact payment was already turned into an order (a
    // double-submit or network retry), return that order — never charge/create twice.
    const dupe = await prisma.order.findFirst({ where: { paymentRef: paymentIntentId } });
    if (dupe) return Response.json({ ok: true, id: dupe.id, orderNumber: dupe.orderNumber });
    // Expand the charge so we can capture the card brand + last-4 for display.
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    if (pi.status !== "succeeded") {
      return Response.json({ error: "Payment was not successful." }, { status: 400 });
    }
    if (pi.amount !== Math.round(computed.total * 100)) {
      return Response.json({ error: "Payment amount mismatch." }, { status: 400 });
    }
    paymentRef = pi.id;
    const charge = pi.latest_charge;
    if (charge && typeof charge !== "string") {
      const card = charge.payment_method_details?.card;
      paymentBrand = card?.brand ?? ""; // e.g. "visa" — never the full number
      paymentLast4 = card?.last4 ?? "";
    }
  } else {
    // Mock payment — always succeeds.
    paymentRef = "mock_" + Math.random().toString(36).slice(2, 12);
  }

  // Snapshot the line items into the order.
  const itemsSnapshot = computed.lines.map((l) => ({
    productId: l.productId,
    slug: l.slug,
    title: l.title,
    colour: l.colour, // localized display (translation preserved)
    colourMatch: l.colourMatch, // canonical — for returns/restock matching
    size: l.size,
    image: l.image,
    price: l.price,
    compareAt: l.compareAt,
    qty: l.qty,
    lineTotal: l.lineTotal,
    bundleDiscount: l.bundleDiscount,
    badge: l.badge,
  }));

  // Units needed per (product, COLOUR, SIZE) — stock is tracked per variant.
  const need = new Map<string, { productId: number; colour: string; size: string; qty: number }>();
  for (const l of computed.lines) {
    // Match stock by the CANONICAL colour (language-independent), not the display name.
    const k = `${l.productId}|${l.colourMatch}|${l.size}`;
    const cur = need.get(k);
    if (cur) cur.qty += l.qty;
    else need.set(k, { productId: l.productId, colour: l.colourMatch, size: l.size, qty: l.qty });
  }

  // Create the order + decrement each variant's stock ATOMICALLY, re-checking
  // availability so two shoppers can't buy the same last unit (oversell guard).
  // Untracked variants (stock = null) are skipped. If short, the whole thing
  // aborts — nothing saved. Stock lives in each product's colourData JSON.
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      for (const { productId, colour, size, qty } of need.values()) {
        const p = await tx.product.findUnique({ where: { id: productId }, select: { colourData: true, title: true } });
        if (!p) continue;
        const avail = variantStock(p.colourData, colour, size || undefined);
        if (avail != null) {
          if (avail < qty) {
            const label = [colour, size].filter(Boolean).join(" / ");
            throw new Error(`OUT_OF_STOCK:Only ${avail} of “${p.title}”${label ? ` (${label})` : ""} left — please reduce the quantity.`);
          }
          await tx.product.update({ where: { id: productId }, data: { colourData: adjustVariantStock(p.colourData, colour, size || undefined, -qty) } });
        }
      }
      return tx.order.create({
        data: {
          orderNumber: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          customerId: session.customerId,
          email: session.email,
          ...delivery,
          items: JSON.stringify(itemsSnapshot),
          subtotal: computed.subtotal,
          discount: computed.discount,
          shipping: computed.shipping,
          total: computed.total,
          currency: "INR",
          status: "paid",
          paymentRef,
          paymentBrand,
          paymentLast4,
          discountCode: computed.couponCode,
          note: s(body.note),
        },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("OUT_OF_STOCK:")) {
      return Response.json({ error: msg.slice("OUT_OF_STOCK:".length) }, { status: 409 });
    }
    throw e;
  }

  // Count the coupon redemption (best-effort — never fail a paid order over it).
  // Recorded AFTER the order exists so once-per-customer counting stays correct.
  if (computed.couponCode) {
    try {
      await prisma.discountCode.update({
        where: { code: computed.couponCode },
        data: { usageCount: { increment: 1 } },
      });
    } catch {
      /* usage counter is non-critical */
    }
  }

  // Human-friendly, sequential order number now that we have the id.
  const orderNumber = `LH${String(10000 + created.id)}`;
  await prisma.order.update({ where: { id: created.id }, data: { orderNumber } });

  // Open the order's audit trail. Best-effort: a logging hiccup must never fail
  // an order the customer has already paid for.
  try {
    await logOrderEventGlobal(created.id, {
      type: "placed",
      message: `Order placed and paid (${formatRs(computed.total)}).`,
      actor: "customer",
      meta: { total: computed.total, paymentRef },
    });
  } catch {
    /* timeline is non-critical — the order is already placed */
  }

  // --- Sync the account from what they typed at checkout ---------------------
  // Real-world flow: the details entered here populate the customer's profile
  // (name + saved address) so the account/admin show them AND the NEXT checkout
  // auto-fills. Best-effort: a sync hiccup must never fail an already-paid order.
  try {
    const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
    const fullName = [delivery.firstName, delivery.lastName].filter(Boolean).join(" ").trim();
    // Fill the account name only if it's still blank (don't overwrite a chosen name).
    if (customer && !s(customer.name) && fullName) {
      await prisma.customer.update({ where: { id: customer.id }, data: { name: fullName } });
    }

    // Save/refresh this address in the address book (matched on address1 + postcode
    // so repeat orders to the same place update rather than duplicate).
    const addrData = {
      country: delivery.country,
      firstName: delivery.firstName,
      lastName: delivery.lastName,
      company: delivery.company,
      address1: delivery.address1,
      address2: delivery.address2,
      city: delivery.city,
      state: delivery.state,
      postcode: delivery.postcode,
      phone: delivery.phone,
    };
    const existing = await prisma.address.findFirst({
      where: { customerId: session.customerId, address1: delivery.address1, postcode: delivery.postcode },
    });
    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data: addrData });
    } else {
      const count = await prisma.address.count({ where: { customerId: session.customerId } });
      await prisma.address.create({
        data: { ...addrData, customerId: session.customerId, isDefault: count === 0 },
      });
    }
  } catch {
    /* profile sync is non-critical — the order is already placed */
  }

  return Response.json({ ok: true, id: created.id, orderNumber });
}
