import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ReturnBadge } from "@/app/components/OrderStatus";
import OrderProgress, { type ProgressStep, type StepIconName } from "@/app/components/OrderProgress";
import OrderTimeline from "@/app/components/OrderTimeline";
import ReturnActions from "@/app/components/admin/ReturnActions";
import ReturnRefundPanel from "@/app/components/admin/ReturnRefundPanel";
import ReturnNote from "@/app/components/admin/ReturnNote";
import ReturnPhotos from "@/app/components/admin/ReturnPhotos";
import CopyButton from "@/app/components/admin/CopyButton";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (d: Date | string) => new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type RItem = { title: string; colour: string; size: string; image: string; price: number; qty: number };

// 5 display steps mapped onto the simplified real states.
const RSTEPS = ["Requested", "Approved", "Item Received", "Refund", "Completed"];
const RICONS: StepIconName[] = ["clipboard-plus", "badge-check", "package-check", "wallet", "circle-check-big"];

// Contextual status banner shown in the Return Actions card.
const STATUS_INFO: Record<string, { cls: string; msg: string }> = {
  requested: { cls: "bg-[#d9e6f2] text-[#2f5c85]", msg: "Review this request — approve or reject it." },
  approved: { cls: "bg-[#fdeecb] text-[#8a6d1a]", msg: "Waiting for the returned item to arrive — mark it received when it does." },
  received: { cls: "bg-[#d9e6f2] text-[#2f5c85]", msg: "Item received — process the refund below." },
  refunded: { cls: "bg-[#d4e3cb] text-[#307a07]", msg: "Return completed and refunded." },
  rejected: { cls: "bg-[#f4d6da] text-[#a23140]", msg: "This return was rejected." },
};

const card = "rounded-xl border border-line bg-cream p-5 shadow-soft";
const h2Cls = "text-sm font-medium text-espresso mb-4";

export default async function AdminReturnDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const ret = await prisma.return.findUnique({ where: { id }, include: { order: { include: { events: true } } } });
  if (!ret) notFound();
  const order = ret.order;
  const items = JSON.parse(ret.items || "[]") as RItem[];
  const itemsTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  // Proof photos the customer attached when raising the return (may be empty).
  let images: string[] = [];
  try { images = JSON.parse(ret.images || "[]") as string[]; } catch { images = []; }

  const paymentMethod =
    order.paymentBrand && order.paymentLast4 ? `${cap(order.paymentBrand)} •••• ${order.paymentLast4}` :
    order.paymentRef.startsWith("mock") ? "Original payment (test)" : "Original payment (card)";

  // Reason vs customer note — the customer form stores "<Reason>: <comment>".
  const [reasonHead, ...reasonRest] = (ret.reason || "").split(":");
  const reasonLabel = (reasonHead || "").trim() || "—";
  const customerNote = reasonRest.join(":").trim();

  // Timestamps for the progress steps, from the order's events.
  const evTime = (type: string) => {
    const e = order.events.filter((x) => x.type === type).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return e ? fmt(e.createdAt) : undefined;
  };
  const stepTimes = [fmt(ret.createdAt), evTime("return_approved"), evTime("return_received"), evTime("refunded"), evTime("refunded")];

  // Progress steps
  let steps: ProgressStep[];
  if (ret.status === "rejected" || ret.status === "cancelled") {
    steps = [
      { label: "Requested", state: "done", at: fmt(ret.createdAt), icon: "clipboard-plus" },
      { label: ret.status === "rejected" ? "Rejected" : "Cancelled", state: "cancelled", icon: "cancelled" },
    ];
  } else {
    const reached =
      ret.status === "requested" ? 0 : ret.status === "approved" ? 1 :
      ret.status === "received" ? 2 : ret.status === "refunded" ? 4 : 0;
    // Only COMPLETED steps go green (each keeps its own icon); everything else is
    // grey. The green tick (circle-check-big) only lights up at "Completed".
    steps = RSTEPS.map((label, i) => ({
      label,
      state: i <= reached ? "done" : "upcoming",
      at: i <= reached ? stepTimes[i] : label === "Refund" ? "Pending" : undefined,
      icon: RICONS[i],
    }));
  }

  const returnEvents = order.events.filter((e) => e.type.startsWith("return_") || e.type === "refunded");
  const info = STATUS_INFO[ret.status];

  return (
    <div>
      <Link href="/admin/returns" className="text-xs text-espresso/60 hover:text-espresso">← Back to all returns</Link>
      <div className="mx-auto max-w-4xl">
      {/* header */}
      <header className="mt-4">
        <p className="eyebrow text-taupe">Return</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl tracking-[0.02em]">{ret.returnNumber}</h1>
          <CopyButton text={ret.returnNumber} label="Copy return number" />
          <ReturnBadge status={ret.status} />
        </div>
        <p className="mt-1.5 text-sm text-espresso/60">
          Order <Link href={`/admin/orders/${order.id}`} className="text-espresso hover:underline">{order.orderNumber}</Link>
          {" · "}{order.email}{" · "}{fmt(ret.createdAt)}
        </p>
      </header>

      {/* Row 1 — Returned Item | Return Details */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className={card}>
          <h2 className={h2Cls}>Returned Item</h2>
          <ul className="flex flex-col gap-4">
            {items.map((it, i) => (
              <li key={i} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded border border-line bg-white">
                  {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Row 1: title · Row 2: colour/size + quantity together */}
                  <p className="text-sm text-espresso">{it.title}</p>
                  <p className="mt-1 text-xs text-espresso/50">
                    {[it.colour, it.size].filter(Boolean).join(" / ")}
                    {(it.colour || it.size) ? " · " : ""}Qty: {it.qty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {/* light divider, then a bold Total: label at the left edge, amount at the right */}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm font-semibold text-espresso">Total</span>
            <span className="text-sm font-semibold text-espresso">{inr(itemsTotal)}</span>
          </div>
        </div>

        <div className={card}>
          <h2 className={h2Cls}>Return Details</h2>
          <Row label="Reason" value={reasonLabel} />
          <Row label="Return Type" value="Return & Refund" />
          <Row label="Delivery Method" value="Self ship" />
          <Row label="Return Tracking ID" value={ret.returnTrackingNumber ? `${ret.returnCarrier ? ret.returnCarrier + " " : ""}${ret.returnTrackingNumber}` : "—"} />
          {customerNote ? (
            <div className="py-1.5 text-sm">
              <p className="text-espresso/55">Customer Note</p>
              <p className="mt-0.5 text-espresso/85">{customerNote}</p>
            </div>
          ) : (
            <Row label="Customer Note" value="—" />
          )}
          {images.length > 0 && (
            <div className="mt-2 border-t border-line pt-3 text-sm">
              <p className="text-espresso/55">Customer Photos</p>
              <ReturnPhotos images={images} />
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Return Progress */}
      <div className={`mt-5 ${card}`}>
        <h2 className={h2Cls}>Return Progress</h2>
        <OrderProgress steps={steps} variant="plain" animate />
      </div>

      {/* Return Actions (left) | Refund (right) */}
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.5fr] md:items-start">
        <div className={card}>
          <h2 className={h2Cls}>Return Actions</h2>
          {info && <div className={`mb-3 rounded-md px-3 py-2 text-sm ${info.cls}`}>⚠ {info.msg}</div>}
          <ReturnActions returnId={ret.id} status={ret.status} />
        </div>

        <ReturnRefundPanel returnId={ret.id} status={ret.status} refundAmount={ret.refundAmount} paymentMethod={paymentMethod} />
      </div>

      {/* Activity Timeline — full width, below the two cards */}
      <div className={`mt-5 ${card}`}>
        <h2 className={h2Cls}>Activity Timeline</h2>
        <OrderTimeline events={returnEvents} />
      </div>

      {/* Warehouse notes — full width */}
      <div className={`mt-5 ${card}`}>
        <h2 className={h2Cls}>Warehouse notes <span className="font-normal text-espresso/40">(internal)</span></h2>
        <ReturnNote returnId={ret.id} />
      </div>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-espresso/55">{label}</span>
      <span className="text-right text-espresso/85">{value}</span>
    </div>
  );
}
