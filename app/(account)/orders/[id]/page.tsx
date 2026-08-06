import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { canRequestReturn, returnDeadline, returnWindowOpen, RETURN_WINDOW_DAYS } from "@/lib/order-status";
import { getReturnableItems } from "@/lib/returns";
import { FulfillmentBadge, PaymentBadge, ReturnBadge } from "@/app/components/OrderStatus";
import OrderTimeline from "@/app/components/OrderTimeline";
import OrderProgress, { type ProgressStep } from "@/app/components/OrderProgress";
import TrackButton from "@/app/components/TrackButton";
import ReturnRequest from "@/app/components/ReturnRequest";
import ReturnProgressMini from "@/app/components/ReturnProgressMini";
import ReceiptButton from "@/app/checkout/success/[id]/ReceiptButton";
import CopyButton from "@/app/components/admin/CopyButton";
import AccountLogo from "../../_components/AccountLogo";

export const metadata: Metadata = { title: "Order details - Lavender Hill Clothing" };
export const dynamic = "force-dynamic";

type OrderItem = {
  title: string; colour: string; size: string; image: string;
  price: number; qty: number; bundleDiscount: number;
};

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const paymentMethodLabel = (o: { paymentBrand: string; paymentLast4: string; paymentRef: string }) =>
  o.paymentBrand && o.paymentLast4 ? `${cap(o.paymentBrand)} •••• ${o.paymentLast4}` : o.paymentRef.startsWith("mock") ? "Test payment" : "Card";

// Customer-facing timeline copy. The stored event messages are written for the
// admin log (they carry internal refs like the return number and courier notes),
// so for the customer we render clean, plain-language milestones derived from the
// event *type* and its real metadata (carrier / tracking) — never invented data.
function customerEventMessage(e: { type: string; message: string; meta: string }): string {
  let meta: { trackingCarrier?: string; trackingNumber?: string } = {};
  try { meta = JSON.parse(e.meta || "{}"); } catch { /* keep defaults */ }
  switch (e.type) {
    case "placed": return "Order placed.";
    case "confirmed": return "Order confirmed.";
    case "processing": return "Your order is being prepared.";
    case "packed": return "Your order has been packed.";
    case "shipped":
      return meta.trackingCarrier
        ? `Shipped via ${meta.trackingCarrier}${meta.trackingNumber ? ` — tracking ${meta.trackingNumber}` : ""}.`
        : "Your order has been shipped.";
    case "delivered": return "Your order has been delivered.";
    case "cancelled": return "Your order was cancelled.";
    case "refunded": return "Refund processed to your original payment method.";
    case "return_requested": return "Return requested.";
    case "return_approved": return "Your return was approved.";
    case "return_rejected": return "Your return request was declined.";
    case "return_received": return "Your returned item has been picked up.";
    default: return e.message; // unknown types fall back to the stored text
  }
}

export default async function CustomerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCustomer();
  const id = Number((await params).id);
  const order = await prisma.order.findUnique({ where: { id }, include: { events: true } });
  if (!order) notFound();
  if (order.customerId !== session.customerId) notFound(); // only your own order

  const items = JSON.parse(order.items || "[]") as OrderItem[];
  // Customer-facing timeline: hide internal notes, rewrite each remaining event
  // in plain customer language (no admin refs / courier jargon), drop the internal
  // actor tag (admin/customer), then split into the order vs the return story.
  const publicEvents = order.events
    .filter((e) => e.type !== "note")
    .map((e) => ({ ...e, message: customerEventMessage(e), actor: "system" }));
  const orderEvents = publicEvents.filter((e) => !e.type.startsWith("return_"));
  const returnEvents = publicEvents.filter((e) => e.type.startsWith("return_"));

  // Refund reference id (from the most recent "refunded" event's metadata) — for
  // the refund receipt / support reference. No schema field needed.
  const refundEvent = [...order.events]
    .filter((e) => e.type === "refunded")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  let refundRef = "";
  try { refundRef = refundEvent ? String(JSON.parse(refundEvent.meta || "{}").refundRef || "") : ""; } catch { /* ignore */ }

  const addressLines = [
    [order.firstName, order.lastName].filter(Boolean).join(" "),
    order.company, order.address1, order.address2,
    // City/state/postcode and country flow together on one line (wraps naturally
    // by length) so short addresses keep "…, India" on the same row.
    [order.city, order.state, order.postcode, order.country].filter(Boolean).join(", "),
    order.phone,
  ].filter(Boolean);
  const placed = fmt(order.createdAt);

  // --- Build the visual stepper from the fulfillment status ----------------
  const status = order.fulfillmentStatus;
  const eventTime = (type: string) => order.events.find((e) => e.type === type)?.createdAt;

  let steps: ProgressStep[];
  if (status === "cancelled") {
    steps = [
      { label: "Order placed", state: "done", at: placed, icon: "placed" },
      { label: "Order cancelled", state: "cancelled", at: order.cancelledAt ? fmt(order.cancelledAt) : undefined, icon: "cancelled" },
    ];
  } else {
    // Highest COMPLETED milestone (Order placed is always complete):
    //   unfulfilled → 0 · processing/packed → 1 · shipped → 2 · delivered → 3
    const done = status === "delivered" ? 3 : status === "shipped" ? 2 : status === "processing" || status === "packed" ? 1 : 0;
    const times = [
      placed,
      eventTime("processing") ? fmt(eventTime("processing")!) : eventTime("packed") ? fmt(eventTime("packed")!) : undefined,
      order.shippedAt ? fmt(order.shippedAt) : undefined,
      order.deliveredAt ? fmt(order.deliveredAt) : undefined,
    ];
    const labels = ["Order placed", "Processing", "Shipped", "Delivered"];
    const stepIcons = ["placed", "processing", "shipped", "delivered"] as const;
    steps = labels.map((label, i) => ({
      label,
      // Completed steps are green; the ONE next step is the "current" highlight;
      // once delivered there's no next step, so every step is green.
      state: i <= done ? "done" : i === done + 1 ? "current" : "upcoming",
      at: i <= done ? times[i] : undefined,
      icon: stepIcons[i],
    }));
  }

  // Returns for this order + what's still returnable + whether a new one is allowed.
  const returns = await prisma.return.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" } });
  const returnable = (await getReturnableItems(id)).filter((r) => r.available > 0);
  const returnEligible = canRequestReturn(order);
  const returnBy = returnDeadline(order.deliveredAt); // last day a return can be requested
  const returnWindowClosed = order.fulfillmentStatus === "delivered" && !returnWindowOpen(order.deliveredAt);

  // Timestamps for the return-progress steps, read from the order's events.
  const retTime = (type: string) => {
    const e = order.events
      .filter((x) => x.type === type)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return e ? fmt(e.createdAt) : undefined;
  };
  // Aligned to: [requested, approved, item received, refunded]
  const returnTimes = [retTime("return_requested"), retTime("return_approved"), retTime("return_received"), retTime("refunded")];

  // Once a return exists, CONTINUE the same top stepper with the return journey:
  // Return initiated → Item pickup → Refund. Driven by the latest return so the
  // whole order→return story reads as one bar. (A return implies the order was
  // delivered, so every order step is complete by now.)
  const latestReturn = returns[0];
  if (latestReturn) {
    steps = steps.map((s): ProgressStep => ({ ...s, state: "done" }));
    const rs = latestReturn.status;
    if (rs === "rejected" || rs === "cancelled") {
      steps.push(
        { label: "Return initiated", state: "done", at: retTime("return_requested"), icon: "clipboard-plus" },
        { label: rs === "rejected" ? "Return rejected" : "Return cancelled", state: "cancelled", at: retTime(rs === "rejected" ? "return_rejected" : "return_cancelled"), icon: "cancelled" },
      );
    } else {
      // reached: 0 = initiated done · 1 = item received · 2 = refunded
      const rReached = rs === "refunded" ? 2 : rs === "received" ? 1 : 0;
      const rLabels = ["Return initiated", "Item pickup", "Refund"];
      const rIcons = ["clipboard-plus", "package-search", "wallet"] as const;
      const rTimes = [retTime("return_requested"), retTime("return_received"), retTime("refunded")];
      rLabels.forEach((label, i) => {
        steps.push({
          label,
          state: i <= rReached ? "done" : i === rReached + 1 ? "current" : "upcoming",
          at: i <= rReached ? rTimes[i] : undefined,
          icon: rIcons[i],
        });
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-6 py-6 md:px-10">
        <Link href="/"><AccountLogo className="w-[160px] h-auto" /></Link>
        <Link href="/profile" aria-label="Account" className="text-[#3a3a3a] transition-colors hover:text-black">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.7 19.2a6.4 6.4 0 0 1 12.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-6 md:px-10">
        <Link href="/orders" className="text-[0.85rem] text-[#8f7060] transition-colors hover:text-[#1a1a1a]">← All orders</Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[1.5rem] font-bold text-[#1a1a1a]">Order {order.orderNumber}</h1>
              <CopyButton text={order.orderNumber} label="Copy order number" />
            </div>
            <p className="mt-1 text-[0.85rem] text-[#6b6b6b]">
              Placed on {placed} · Order ID: {order.orderNumber} · Invoice: INV-{order.orderNumber.replace(/^LH/, "")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FulfillmentBadge status={order.fulfillmentStatus} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>

        {order.refundedAmount > 0 && (
          <div className="mt-4 rounded-xl border border-[#cfe3c4] bg-[#f1f7ed] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#307a07] text-white">
                <svg width="14" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <p className="text-[0.95rem] font-semibold text-[#1a1a1a]">Refund processed</p>
            </div>
            <div className="mt-3 grid gap-x-8 gap-y-2 pl-8 text-[0.85rem] sm:grid-cols-2">
              <RefundRow label="Refund amount" value={inr(order.refundedAmount)} />
              <RefundRow label="Refund method" value={paymentMethodLabel(order)} />
              <RefundRow label="Expected credit" value="2–5 business days" />
              {refundRef && <RefundRow label="Reference ID" value={refundRef} mono />}
            </div>
          </div>
        )}

        {/* Status stepper + actions */}
        <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-white p-6">
          <h2 className="mb-5 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Order status</h2>
          <OrderProgress steps={steps} animate />
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#eee] pt-5">
            {order.trackingNumber && order.fulfillmentStatus !== "cancelled" && (
              <TrackButton carrier={order.trackingCarrier} trackingNumber={order.trackingNumber} />
            )}
            <ReceiptButton
              order={{
                orderNumber: order.orderNumber, email: order.email, placed,
                items, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total,
                addressLines,
              }}
            />
          </div>
        </div>

        {/* Order summary | (Delivery + Payment in one card) — two columns, natural height */}
        <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-start">
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            <h2 className="mb-4 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Order summary</h2>
            <ul className="flex flex-col gap-4">
              {items.map((it, i) => (
                <li key={i} className="flex gap-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded border border-[#e5e5e5] bg-white">
                    {it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9rem] text-[#1a1a1a]">{it.title}</p>
                    <p className="text-[0.8rem] text-[#6b6b6b]">{[it.colour, it.size].filter(Boolean).join(" / ")} · Qty {it.qty}</p>
                  </div>
                  <p className="text-[0.9rem] text-[#1a1a1a]">{inr(it.price * it.qty - (it.bundleDiscount || 0))}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-[#e5e5e5] pt-3 text-[0.9rem]">
              <Row label="Subtotal" value={inr(order.subtotal)} />
              {order.discount > 0 && <Row label={order.discountCode ? `Discount (${order.discountCode})` : "Discounts"} value={`− ${inr(order.discount)}`} />}
              <Row label="Shipping" value={order.shipping > 0 ? inr(order.shipping) : "Free"} />
              <div className="mt-2 flex justify-between border-t border-[#e5e5e5] pt-2 font-semibold text-[#1a1a1a]">
                <span>Total</span><span>{inr(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery + Payment in ONE card, split by a divider line */}
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 text-[0.9rem]">
            <h2 className="mb-3 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Delivery details</h2>
            <div className="leading-relaxed">
              {addressLines.length > 0 ? addressLines.map((l, i) => <p key={i} className="text-[#333]">{l}</p>) : <p className="text-[#9b9b9b]">—</p>}
            </div>

            <div className="mt-4 border-t border-[#e5e5e5] pt-4">
              <h2 className="mb-3 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Payment details</h2>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[#6b6b6b]">Status</span>
                <PaymentBadge status={order.paymentStatus} />
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[#6b6b6b]">Method</span>
                <span className="text-[#1a1a1a]">{paymentMethodLabel(order)}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[#6b6b6b]">Paid on</span>
                <span className="text-[#1a1a1a]">{fmtDay(order.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Returns — full width, appears under the three cards once eligible */}
        {(returns.length > 0 || order.fulfillmentStatus === "delivered") && (
          <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-white p-6">
            <h2 className="mb-4 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Returns</h2>
            {returns.length > 0 && (
              <ul className="mb-4 flex flex-col gap-3">
                {returns.map((r) => {
                  const its = JSON.parse(r.items || "[]") as { title: string; qty: number }[];
                  const rimgs = JSON.parse(r.images || "[]") as string[];
                  return (
                    <li key={r.id} className="rounded-lg border border-[#eee] p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* return details */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[0.9rem] font-medium text-[#1a1a1a]">{r.returnNumber}</p>
                            <ReturnBadge status={r.status} />
                          </div>
                          <p className="mt-2 text-[0.82rem] text-[#1a1a1a]">{its.map((i) => `${i.title} × ${i.qty}`).join(", ")}</p>
                          {r.reason && <p className="mt-1 text-[0.8rem] text-[#6b6b6b]">Return reason: {r.reason}</p>}
                          <p className="mt-1 text-[0.8rem] text-[#6b6b6b]">Refund amount: <span className="text-[#1a1a1a]">{inr(r.refundAmount)}</span></p>
                          {r.status === "refunded" && (
                            <p className="mt-1 text-[0.8rem] text-[#6b6b6b]">Refunded on: <span className="text-[#1a1a1a]">{fmtDay(r.updatedAt)}</span></p>
                          )}
                          {r.returnTrackingNumber && (
                            <p className="mt-1 text-[0.78rem] text-[#5b4b9b]">Return via {r.returnCarrier} · {r.returnTrackingNumber}</p>
                          )}
                          {r.adminNote && <p className="mt-1 text-[0.78rem] text-[#a23140]">{r.adminNote}</p>}
                          {rimgs.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {rimgs.map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noreferrer" className="relative block h-12 w-12 overflow-hidden rounded border border-[#e5e5e5]" title="Open full size">
                                  <Image src={u} alt="return proof" fill sizes="48px" className="object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* return progress */}
                        <div className="sm:border-l sm:border-[#eee] sm:pl-4">
                          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.1em] text-[#a7a29b]">Return progress</p>
                          <ReturnProgressMini status={r.status} times={returnTimes} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {returnEligible && returnable.length > 0 ? (
              <ReturnRequest
                orderId={order.id}
                items={returnable}
                note={returnBy ? (
                  <>Returns are accepted until <span className="font-medium text-[#1a1a1a]">{fmtDay(returnBy)}</span> — within {RETURN_WINDOW_DAYS} days of delivery.</>
                ) : null}
              />
            ) : returnWindowClosed ? (
              <p className="text-[0.82rem] text-[#a23140]">
                The {RETURN_WINDOW_DAYS}-day return window closed{returnBy ? ` on ${fmtDay(returnBy)}` : ""}. This order is no longer eligible for a return.
              </p>
            ) : returnable.length === 0 && returns.length > 0 ? (
              null
            ) : returns.length === 0 ? (
              // Only the "you can start a return" hint — hidden once a return exists.
              <p className="text-[0.82rem] text-[#6b6b6b]">Returns can be requested within {RETURN_WINDOW_DAYS} days of delivery.</p>
            ) : null}
          </div>
        )}

        {/* Activity timeline — full width */}
        <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-white p-5">
          <h2 className="mb-4 text-[0.8rem] uppercase tracking-[0.1em] text-[#6b6b6b]">Activity timeline</h2>
          {returnEvents.length > 0 ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#a7a29b]">Order</p>
                <OrderTimeline events={orderEvents} />
              </div>
              <div className="border-t border-[#eee] pt-4">
                <p className="mb-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#a7a29b]">Return</p>
                <OrderTimeline events={returnEvents} />
              </div>
            </div>
          ) : (
            <OrderTimeline events={publicEvents} />
          )}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1000px] flex-wrap items-center justify-center gap-3 px-6 py-8 md:px-10">
        <Link href="/shop" className="rounded-md bg-[#847a8a] px-5 py-2.5 text-[0.9rem] text-white transition-colors hover:bg-[#736979]">
          Continue shopping
        </Link>
        <a
          href={`mailto:support@lavenderhill.example?subject=${encodeURIComponent(`Help with order ${order.orderNumber}`)}`}
          className="rounded-md border border-[#d4d0cb] bg-white px-5 py-2.5 text-[0.9rem] text-[#1a1a1a] transition-colors hover:bg-[#faf9f7]"
        >
          Need help?
        </a>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-[#6b6b6b]">{label}</span>
      <span className="text-[#1a1a1a]">{value}</span>
    </div>
  );
}

function RefundRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.06em] text-[#6b8a5e]">{label}</p>
      <p className={`text-[#1a1a1a] ${mono ? "font-mono text-[0.8rem] break-all" : ""}`}>{value}</p>
    </div>
  );
}
