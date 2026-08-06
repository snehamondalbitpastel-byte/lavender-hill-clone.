import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { canRequestReturn } from "@/lib/order-status";
import { getReturnableItems, returnNumberFor } from "@/lib/returns";
import { logOrderEventGlobal } from "@/lib/order-workflow";

// POST /api/returns  { orderId, items: [{ index, qty }], reason }
// A customer opens a return against THEIR delivered order (within the 14-day
// window). Every quantity is re-validated server-side against what's still
// returnable — the client is never trusted.
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const orderId = Number(body.orderId);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== session.customerId) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  if (!canRequestReturn(order)) {
    return Response.json({ error: "This order isn't eligible for a return." }, { status: 400 });
  }

  const returnable = await getReturnableItems(orderId);
  const byIndex = new Map(returnable.map((r) => [r.index, r]));
  const reqItems = (Array.isArray(body.items) ? body.items : []) as { index: number; qty: number }[];

  const chosen: { index: number; title: string; colour: string; size: string; image: string; price: number; qty: number }[] = [];
  let refundAmount = 0;
  for (const it of reqItems) {
    const r = byIndex.get(Number(it.index));
    const qty = Math.floor(Number(it.qty) || 0);
    if (!r || qty <= 0) continue;
    if (qty > r.available) {
      return Response.json({ error: `You can return at most ${r.available} of “${r.title}”.` }, { status: 400 });
    }
    chosen.push({ index: r.index, title: r.title, colour: r.colour, size: r.size, image: r.image, price: r.price, qty });
    refundAmount += r.price * qty;
  }
  if (chosen.length === 0) {
    return Response.json({ error: "Select at least one item to return." }, { status: 400 });
  }
  refundAmount = Math.round(refundAmount * 100) / 100;
  const reason = String(body.reason ?? "").trim();
  // Only accept URLs we issued (from /api/returns/upload), capped at 4.
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("/uploads/returns/"))
    .slice(0, 4);

  const created = await prisma.return.create({
    data: {
      returnNumber: `pending-${Date.now()}`,
      orderId,
      customerId: session.customerId,
      status: "requested",
      reason,
      items: JSON.stringify(chosen),
      images: JSON.stringify(images),
      refundAmount,
    },
  });
  const returnNumber = returnNumberFor(created.id);
  await prisma.return.update({ where: { id: created.id }, data: { returnNumber } });

  const units = chosen.reduce((n, c) => n + c.qty, 0);
  await logOrderEventGlobal(orderId, {
    type: "return_requested",
    message: `Return requested (${returnNumber}) — ${units} item${units === 1 ? "" : "s"}.`,
    actor: "customer",
    meta: { returnNumber, refundAmount },
  });

  return Response.json({ ok: true, id: created.id, returnNumber });
}
