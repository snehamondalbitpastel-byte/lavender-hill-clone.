import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { sendOrderEmail } from "@/lib/email";
import { refundOrderAmount } from "@/lib/refunds";
import { canAdvanceReturn, logOrderEvent, round2 } from "@/lib/order-workflow";
import { variantStock, adjustVariantStock } from "@/lib/inventory";
import { flushStockNotifications } from "@/lib/stock-notify";

const s = (v: unknown) => String(v ?? "").trim();
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Put returned units back into inventory, into the SAME (colour, size) VARIANT
// they were sold from (stock is per-variant, in colourData). Return items
// reference the order line by `index`; the order snapshot carries that line's
// productId + colour + size. Untracked variants are skipped. After restocking a
// product, flush any back-in-stock subscriptions that are now satisfiable.
async function restockReturnItems(order: { items: string }, ret: { items: string }, origin: string) {
  let orderItems: { productId?: number; colour?: string; size?: string }[] = [];
  let retItems: { index: number; qty: number }[] = [];
  try { orderItems = JSON.parse(order.items || "[]"); } catch { /* ignore */ }
  try { retItems = JSON.parse(ret.items || "[]"); } catch { /* ignore */ }
  const touched = new Set<number>();
  for (const ri of retItems) {
    const oi = orderItems[ri.index];
    const pid = oi?.productId;
    if (pid == null) continue;
    const colour = oi?.colour ?? "";
    const size = oi?.size ?? "";
    const p = await prisma.product.findUnique({ where: { id: pid }, select: { colourData: true } });
    if (!p) continue;
    if (variantStock(p.colourData, colour, size || undefined) == null) continue; // untracked → skip
    await prisma.product.update({
      where: { id: pid },
      data: { colourData: adjustVariantStock(p.colourData, colour, size || undefined, Math.max(0, Number(ri.qty) || 0)) },
    });
    touched.add(pid);
  }
  for (const pid of touched) await flushStockNotifications(pid, origin);
}

// PATCH /api/admin/returns/[id]  { action, ... }
//   note               → internal note (hidden from customer)
//   approve | reject | receive → status transitions
//   refund { restockingFee, restocked } → refund-after-return via the shared engine
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const ret = await prisma.return.findUnique({ where: { id }, include: { order: true } });
  if (!ret) return Response.json({ error: "Return not found." }, { status: 404 });
  const order = ret.order;

  const body = await request.json().catch(() => ({}));
  const action = s(body.action);

  // --- Internal note (hidden from the customer) — no status change ----------
  if (action === "note") {
    const message = s(body.message);
    if (!message) return Response.json({ error: "A note is required." }, { status: 400 });
    await logOrderEvent(prisma, order.id, { type: "note", message: `Return ${ret.returnNumber}: ${message}`, actor: "admin" });
    return Response.json({ ok: true });
  }

  const target =
    action === "approve" ? "approved" :
    action === "reject" ? "rejected" :
    action === "receive" ? "received" :
    action === "refund" ? "refunded" : "";
  if (!target) return Response.json({ error: "Unknown action." }, { status: 400 });
  if (!canAdvanceReturn(ret.status, target)) {
    return Response.json({ error: `Can't move a return from “${ret.status}” to “${target}”.` }, { status: 409 });
  }

  // --- Refund-after-return (money) with optional restocking fee + restock flag
  if (action === "refund") {
    const restockingFee = Math.max(0, round2(Number(body.restockingFee) || 0));
    const restocked = Boolean(body.restocked);
    const net = round2(Math.max(0, ret.refundAmount - restockingFee)); // amount owed after the fee
    const remaining = round2(order.total - order.refundedAmount); // never over-refund the order
    const amount = Math.min(net, remaining);

    if (amount <= 0) {
      // Fee ≥ item value, or the order was already fully refunded → close, no charge.
      await prisma.$transaction(async (tx) => {
        await tx.return.update({ where: { id }, data: { status: "refunded", refundRef: "already-settled", restockingFee, restocked } });
        await logOrderEvent(tx, order.id, {
          type: "note",
          message: `Return ${ret.returnNumber} closed — no refund issued${restockingFee > 0 ? ` (restocking fee ${inr(restockingFee)})` : ""}.${restocked ? " Item restocked." : ""}`,
          actor: "admin",
        });
      });
      if (restocked) await restockReturnItems(order, ret, new URL(request.url).origin);
      return Response.json({ ok: true });
    }

    const result = await refundOrderAmount(order, amount, { actor: "admin", context: `return ${ret.returnNumber}` });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    await prisma.return.update({ where: { id }, data: { status: "refunded", refundRef: result.refundRef, restockingFee, restocked } });
    if (restocked) await restockReturnItems(order, ret, new URL(request.url).origin);
    if (restocked || restockingFee > 0) {
      await logOrderEvent(prisma, order.id, {
        type: "note",
        message: `Return ${ret.returnNumber}: ${restocked ? "item restocked" : "not restocked"}${restockingFee > 0 ? `, restocking fee ${inr(restockingFee)}` : ""}.`,
        actor: "admin",
      });
    }
    sendOrderEmail(order.email, { kind: "refunded", orderNumber: order.orderNumber, amount: inr(amount) }).catch(() => {});
    return Response.json({ ok: true });
  }

  // --- Non-money transitions (approve / reject / initiate / receive) ---------
  const note = s(body.reason);
  await prisma.$transaction(async (tx) => {
    await tx.return.update({ where: { id }, data: { status: target, ...(action === "reject" && note ? { adminNote: note } : {}) } });
    const evType =
      action === "approve" ? "return_approved" :
      action === "reject" ? "return_rejected" : "return_received";
    const evMsg =
      action === "approve" ? `Return ${ret.returnNumber} approved.` :
      action === "reject" ? `Return ${ret.returnNumber} rejected${note ? ` — ${note}` : ""}.` :
      `Return ${ret.returnNumber} — item received.`;
    await logOrderEvent(tx, order.id, { type: evType, message: evMsg, actor: "admin" });
  });

  if (action === "approve") sendOrderEmail(order.email, { kind: "return_approved", orderNumber: order.orderNumber }).catch(() => {});
  else if (action === "reject") sendOrderEmail(order.email, { kind: "return_rejected", orderNumber: order.orderNumber, reason: note }).catch(() => {});
  else if (action === "receive") sendOrderEmail(order.email, { kind: "return_received", orderNumber: order.orderNumber }).catch(() => {});

  return Response.json({ ok: true });
}
