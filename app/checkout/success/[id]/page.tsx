import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import AccountLogo from "../../../(account)/_components/AccountLogo";
import ReceiptButton from "./ReceiptButton";

export const metadata: Metadata = { title: "Order confirmed - Lavender Hill Clothing" };

type OrderItem = {
  title: string; colour: string; size: string; image: string;
  price: number; compareAt: number | null; qty: number; bundleDiscount: number; badge: string | null;
};

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/authentication/login");
  const id = Number((await params).id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) notFound();
  if (order.customerId !== session.customerId) notFound(); // only your own order

  const items = JSON.parse(order.items || "[]") as OrderItem[];
  const placed = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const addressLines = [
    [order.firstName, order.lastName].filter(Boolean).join(" "),
    order.company,
    order.address1,
    order.address2,
    [order.city, order.state, order.postcode].filter(Boolean).join(", "),
    order.country,
    order.phone,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-espresso">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[820px] items-center px-6 py-5">
          <Link href="/"><AccountLogo className="w-[150px] h-auto" /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-6 py-10">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4e3cb] text-[#307a07]">
            <svg width="22" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <p className="eyebrow text-espresso/50">Order {order.orderNumber}</p>
            <h1 className="text-2xl mt-1">Thank you{order.firstName ? `, ${order.firstName}` : ""}!</h1>
            <p className="mt-1 text-sm text-espresso/70">Your order is confirmed. A copy has been noted to {order.email}.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          {/* Items */}
          <div className="rounded-xl border border-line p-5">
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-4">Order summary</h2>
            <ul className="flex flex-col gap-4">
              {items.map((it, i) => {
                const line = it.price * it.qty - (it.bundleDiscount || 0);
                return (
                  <li key={i} className="flex gap-3">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded border border-line bg-white">
                      {it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{it.title}</p>
                      <p className="text-xs text-espresso/55">{[it.colour, it.size].filter(Boolean).join(" / ")} · Qty {it.qty}</p>
                    </div>
                    <p className="text-sm">{inr(line)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={inr(order.subtotal)} />
              {order.discount > 0 && <Row label={order.discountCode ? `Discount (${order.discountCode})` : "Discounts"} value={`− ${inr(order.discount)}`} plum />}
              <Row label="Shipping" value={order.shipping > 0 ? inr(order.shipping) : "Free"} />
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-medium">
                <span>Total</span><span>{inr(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-xl border border-line p-5 text-sm leading-relaxed">
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/60 mb-3">Delivery</h2>
            {addressLines.length > 0 ? addressLines.map((l, i) => <p key={i} className="text-espresso/85">{l}</p>) : <p className="text-espresso/50">—</p>}
            <p className="mt-4 text-xs text-espresso/45">Placed {placed}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ReceiptButton
            order={{
              orderNumber: order.orderNumber, email: order.email, placed,
              items, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total,
              addressLines,
            }}
          />
          <Link href="/" className="text-sm text-espresso/70 hover:text-espresso underline underline-offset-2">
            Back to home
          </Link>
          <Link href="/orders" className="text-sm text-espresso/70 hover:text-espresso underline underline-offset-2">
            View my orders
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, plum }: { label: string; value: string; plum?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-espresso/70">{label}</span>
      <span className={plum ? "text-plum" : ""}>{value}</span>
    </div>
  );
}
