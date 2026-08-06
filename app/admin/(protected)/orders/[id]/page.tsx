import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { nextFulfillment, canCancel, FULFILLMENT_LABELS, RETURN_LABELS } from "@/lib/order-status";
import { FulfillmentBadge, PaymentBadge, ReturnBadge } from "@/app/components/OrderStatus";
import OrderTimeline from "@/app/components/OrderTimeline";
import OrderActions from "@/app/components/admin/OrderActions";
// import RefundPanel from "@/app/components/admin/RefundPanel"; // hidden per request — restore to re-enable admin refunds
import FulfillmentProgress from "@/app/components/admin/FulfillmentProgress";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type OrderItem = {
  title: string; colour: string; size: string; image: string;
  price: number; qty: number; bundleDiscount: number;
};
const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A human-friendly payment method from whatever the order recorded: a card
// brand + last-4 if present, otherwise inferred from the transaction reference.
function paymentMethodLabel(o: { paymentBrand: string; paymentLast4: string; paymentRef: string }): string {
  if (o.paymentBrand && o.paymentLast4) {
    const brand = o.paymentBrand.charAt(0).toUpperCase() + o.paymentBrand.slice(1);
    return `${brand} •••• ${o.paymentLast4}`;
  }
  if (o.paymentRef.toUpperCase().startsWith("UPI")) return "UPI";
  if (o.paymentRef.startsWith("pi_")) return "Card";
  return "—";
}

// Show a transaction reference without exposing the full internal gateway id
// (e.g. the Stripe "pi_…"): keep only the last few characters, masked.
function maskRef(ref: string): string {
  if (!ref) return "—";
  if (ref.length <= 8) return ref;
  return `•••• ${ref.slice(-5)}`;
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const order = await prisma.order.findUnique({ where: { id }, include: { events: true } });
  if (!order) notFound();
  const items = JSON.parse(order.items || "[]") as OrderItem[];

  // Returns on this order (most recent first). The latest drives the header chip
  // so the return's live state stays in sync with the rest of the order UI.
  const returns = await prisma.return.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } });
  const latestReturn = returns[0] ?? null;

  const next = nextFulfillment(order.fulfillmentStatus);
  const nextLabel = next ? FULFILLMENT_LABELS[next] : null;

  const addressLines = [
    [order.firstName, order.lastName].filter(Boolean).join(" "),
    order.company, order.address1, order.address2,
    [order.city, order.state, order.postcode].filter(Boolean).join(", "),
    order.country, order.phone,
  ].filter(Boolean);

  const paidOn = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <div>
      <Link href="/admin/orders" className="text-xs text-espresso/60 hover:text-espresso">← All orders</Link>
      <div className="mx-auto max-w-4xl mt-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-taupe">Order</p>
          <h1 className="text-2xl mt-1 tracking-[0.04em]">{order.orderNumber}</h1>
          <p className="text-sm text-espresso/55 mt-1">
            {new Date(order.createdAt).toLocaleString("en-GB")} · {order.email}
            {order.customerId === null && (
              <span className="ml-2 rounded bg-espresso/5 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-espresso/45 align-middle">
                Deleted customer
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FulfillmentBadge status={order.fulfillmentStatus} />
          <PaymentBadge status={order.paymentStatus} />
          {latestReturn && (
            <ReturnBadge
              status={latestReturn.status}
              label={`Return · ${RETURN_LABELS[latestReturn.status as keyof typeof RETURN_LABELS] ?? latestReturn.status}`}
            />
          )}
        </div>
      </header>

      {/* Row 1 — order summary (Items) + fulfillment controls, side by side */}
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Items */}
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-4">Items</h2>
          <ul className="flex flex-col gap-4">
            {items.map((it, i) => (
              <li key={i} className="flex gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded border border-line bg-white">
                  {it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-espresso">{it.title}</p>
                  <p className="text-xs text-espresso/50">{[it.colour, it.size].filter(Boolean).join(" / ")} · Qty {it.qty}</p>
                </div>
                <p className="text-sm text-espresso/80">{inr(it.price * it.qty - (it.bundleDiscount || 0))}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-3 text-sm">
            <Row label="Subtotal" value={inr(order.subtotal)} />
            {order.discount > 0 && <Row label={order.discountCode ? `Discount (${order.discountCode})` : "Discounts"} value={`− ${inr(order.discount)}`} />}
            <Row label="Shipping" value={order.shipping > 0 ? inr(order.shipping) : "Free"} />
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-medium">
              <span>Total</span><span>{inr(order.total)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <div className="mt-1 flex justify-between text-[#a23140]">
                <span>Refunded</span><span>− {inr(order.refundedAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fulfillment controls */}
        <div className="flex flex-col gap-6">
          <OrderActions
            orderId={order.id}
            nextStatus={next}
            nextLabel={nextLabel}
            canCancel={canCancel(order.fulfillmentStatus)}
            trackingCarrier={order.trackingCarrier}
            trackingNumber={order.trackingNumber}
          />

          {/* Refunds hidden per request — restore this block to re-enable admin refunds.
          <RefundPanel
            orderId={order.id}
            total={order.total}
            refundedAmount={order.refundedAmount}
            paymentStatus={order.paymentStatus}
          />
          */}
        </div>
      </div>

      {/* Row 2 — Fulfilment progress, below Items & Fulfillment; reflects the status advanced above */}
      <div className="mt-6">
        <FulfillmentProgress status={order.fulfillmentStatus} />
      </div>

      {/* Row 3 — Delivery + Payment details, same row */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5 text-sm leading-relaxed">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-3">Delivery</h2>
          {addressLines.map((l, i) => <p key={i} className="text-espresso/85">{l}</p>)}
          {order.trackingNumber && (
            <p className="mt-3 text-espresso/70">
              Tracking: <span className="font-medium">{order.trackingCarrier ? `${order.trackingCarrier} ` : ""}{order.trackingNumber}</span>
            </p>
          )}
        </div>

        {/* Payment details — status badge + method, transaction ref, paid-on, amount and refunded amount */}
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60">Payment details</h2>
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <Row label="Payment Method" value={paymentMethodLabel(order)} />
          <Row label="Transaction ID" value={<span className="font-mono text-xs">{maskRef(order.paymentRef)}</span>} />
          <Row label="Paid On" value={paidOn} />
          <Row label="Amount" value={inr(order.total)} />
          <Row label="Refunded Amount" value={inr(order.refundedAmount)} />
          {order.note && <p className="mt-3 text-espresso/70">Note: {order.note}</p>}
        </div>
      </div>

      {/* Row 4 — Activity, full-width */}
      <div className="mt-6 bg-cream border border-line rounded-xl shadow-soft p-5">
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-4">Activity</h2>
        <OrderTimeline events={order.events} />
      </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-espresso/70">{label}</span>
      <span>{value}</span>
    </div>
  );
}
