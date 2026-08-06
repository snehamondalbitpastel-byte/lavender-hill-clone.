import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { sendOrderEmail } from "@/lib/email";
import { refundOrderAmount } from "@/lib/refunds";
import {
  canAdvanceFulfillment,
  canCancel,
  fulfillmentTimestampField,
  FULFILLMENT_LABELS,
  logOrderEvent,
  round2,
  shippingNeedsTracking,
  type FulfillmentStatus,
} from "@/lib/order-workflow";

const s = (v: unknown) => String(v ?? "").trim();
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// PATCH /api/admin/orders/[id] — drive an order's fulfillment life.
//   { action: "fulfillment", to, trackingCarrier?, trackingNumber? }
//   { action: "cancel", reason? }
//   { action: "note", message }
// Every accepted change updates the order AND appends an OrderEvent in one
// transaction (audit trail can't drift from state). Illegal moves → 409.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const action = s(body.action);

  // --- Add a note to the timeline (no status change) -----------------------
  if (action === "note") {
    const message = s(body.message);
    if (!message) return Response.json({ error: "A note is required." }, { status: 400 });
    await logOrderEvent(prisma, id, { type: "note", message, actor: "admin" });
    return Response.json({ ok: true });
  }

  // --- Cancel (only before it ships) ---------------------------------------
  if (action === "cancel") {
    if (!canCancel(order.fulfillmentStatus)) {
      return Response.json(
        { error: `An order that is already "${FULFILLMENT_LABELS[order.fulfillmentStatus as FulfillmentStatus] ?? order.fulfillmentStatus}" can't be cancelled.` },
        { status: 409 }
      );
    }
    const reason = s(body.reason);
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { fulfillmentStatus: "cancelled", cancelledAt: new Date() },
      });
      await logOrderEvent(tx, id, {
        type: "cancelled",
        message: reason ? `Order cancelled — ${reason}` : "Order cancelled.",
        actor: "admin",
      });
    });
    if (order.paymentStatus === "paid") {
      // Money is still held — refunds are a separate, deliberate admin action.
      await logOrderEvent(prisma, id, {
        type: "note",
        message: "Order was paid — issue a refund if the customer should be reimbursed.",
        actor: "system",
      });
    }
    sendOrderEmail(order.email, { kind: "cancelled", orderNumber: order.orderNumber }).catch(() => {});
    return Response.json({ ok: true });
  }

  // --- Advance fulfillment: processing → packed → shipped → delivered ------
  if (action === "fulfillment") {
    const to = s(body.to) as FulfillmentStatus;
    if (!canAdvanceFulfillment(order.fulfillmentStatus, to)) {
      return Response.json(
        { error: `Can't move from "${order.fulfillmentStatus}" to "${to}".` },
        { status: 409 }
      );
    }

    const carrier = s(body.trackingCarrier);
    const tracking = s(body.trackingNumber);
    if (shippingNeedsTracking(to) && (!carrier || !tracking)) {
      return Response.json(
        { error: "Both a carrier and a tracking number are required to mark an order as shipped." },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { fulfillmentStatus: to };
    const tsField = fulfillmentTimestampField(to);
    if (tsField) data[tsField] = new Date();
    if (to === "shipped") {
      data.trackingCarrier = carrier;
      data.trackingNumber = tracking;
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data });
      await logOrderEvent(tx, id, {
        type: to,
        message:
          to === "shipped"
            ? `Marked as shipped${carrier ? ` via ${carrier}` : ""}${tracking ? ` (tracking ${tracking})` : ""}.`
            : `Marked as ${FULFILLMENT_LABELS[to].toLowerCase()}.`,
        actor: "admin",
        meta: to === "shipped" ? { trackingCarrier: carrier, trackingNumber: tracking } : {},
      });
    });

    // Customer-facing milestones get an email (best-effort).
    if (to === "shipped") {
      sendOrderEmail(order.email, {
        kind: "shipped",
        orderNumber: order.orderNumber,
        trackingCarrier: carrier,
        trackingNumber: tracking,
      }).catch(() => {});
    } else if (to === "delivered") {
      sendOrderEmail(order.email, { kind: "delivered", orderNumber: order.orderNumber }).catch(() => {});
    }

    return Response.json({ ok: true });
  }

  // --- Generate a shipment (MOCK courier API) → auto-fills tracking + ships --
  // Simulates what a real Shiprocket/Delhivery API would return: the COURIER
  // assigns the carrier + AWB (tracking number) server-side, and we save it —
  // no manual typing. (Swap this block for a real API call when keys exist.)
  if (action === "generate-shipment") {
    if (!canAdvanceFulfillment(order.fulfillmentStatus, "shipped")) {
      return Response.json(
        { error: `A shipment can only be generated for a packed order (this one is "${order.fulfillmentStatus}").` },
        { status: 409 }
      );
    }
    const couriers = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "India Post"];
    const carrier = couriers[Math.floor(Math.random() * couriers.length)];
    const tracking = String(Math.floor(1e11 + Math.random() * 9e11)); // 12-digit AWB

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { fulfillmentStatus: "shipped", trackingCarrier: carrier, trackingNumber: tracking, shippedAt: new Date() },
      });
      await logOrderEvent(tx, id, {
        type: "shipped",
        message: `Marked as shipped via ${carrier} (tracking ${tracking}).`,
        actor: "admin",
        meta: { trackingCarrier: carrier, trackingNumber: tracking },
      });
    });
    sendOrderEmail(order.email, { kind: "shipped", orderNumber: order.orderNumber, trackingCarrier: carrier, trackingNumber: tracking }).catch(() => {});
    return Response.json({ ok: true, carrier, trackingNumber: tracking });
  }

  // --- Refund (full or partial) — via the shared refund engine ------------
  if (action === "refund") {
    const amount = round2(Number(body.amount));
    const result = await refundOrderAmount(order, amount, { actor: "admin" });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    sendOrderEmail(order.email, { kind: "refunded", orderNumber: order.orderNumber, amount: inr(amount) }).catch(() => {});
    return Response.json({ ok: true, refundedTotal: result.refundedTotal, paymentStatus: result.nextStatus });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}

// DELETE /api/admin/orders/[id] — permanently remove an order. Its OrderEvents
// and Returns are removed too (schema cascade). Deleting a paid order does NOT
// refund it — that's a separate, deliberate action; this only erases the record.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  await prisma.order.delete({ where: { id } });
  return Response.json({ ok: true });
}
