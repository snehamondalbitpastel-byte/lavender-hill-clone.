import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CustomerDeleteButton from "@/app/components/admin/CustomerDeleteButton";

// Always render fresh — a name/marketing/address change made on the storefront
// must show here on the next load (no route caching).
export const dynamic = "force-dynamic";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const addresses = await prisma.address.findMany({
    where: { customerId: id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  const orders = await prisma.order.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
  });
  const inr = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rows: { label: string; value: string }[] = [
    { label: "Email", value: customer.email },
    { label: "Name", value: customer.name || "—" },
    { label: "Joined", value: fmtDateTime(customer.createdAt) },
    { label: "Customer ID", value: `#${customer.id}` },
  ];
  const active = customer.marketingConsent;

  return (
    <div>
      {/* Back link stays at the top-left corner */}
      <Link href="/admin/customers" className="text-xs text-espresso/60 hover:text-espresso">← All customers</Link>

      {/* Everything else is centred and nudged down */}
      <div className="mx-auto max-w-2xl mt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-taupe">Customer</p>
          <h1 className="text-2xl mt-1 tracking-[0.04em] break-all">{customer.email}</h1>
        </div>
        <CustomerDeleteButton id={customer.id} email={customer.email} />
      </header>

      {/* Details */}
      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-4 px-5 py-3.5">
            <span className="w-32 shrink-0 text-[11px] uppercase tracking-[0.1em] text-espresso/50 pt-0.5">{r.label}</span>
            <span className="text-sm text-espresso break-all">{r.value}</span>
          </div>
        ))}
        {/* Marketing — shown as an Active / Inactive status pill */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <span className="w-32 shrink-0 text-[11px] uppercase tracking-[0.1em] text-espresso/50">Marketing</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              active ? "bg-[#d4e3cb] text-[#307a07]" : "bg-espresso/8 text-espresso/50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#307a07]" : "bg-espresso/40"}`} />
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Addresses — mirrors what the customer saved on /profile (read-only) */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-3">Addresses</h2>
        {addresses.length === 0 ? (
          <div className="bg-cream border border-dashed border-line rounded-xl p-6 text-center text-sm text-espresso/50">
            No addresses saved.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((a) => (
              <div key={a.id} className="bg-cream border border-line rounded-xl shadow-soft p-5 text-sm leading-relaxed text-espresso/90">
                {(a.firstName || a.lastName) && (
                  <p className="font-medium text-espresso">{[a.firstName, a.lastName].filter(Boolean).join(" ")}</p>
                )}
                {a.company && <p>{a.company}</p>}
                <p>{a.address1}</p>
                {a.address2 && <p>{a.address2}</p>}
                {[a.city, a.state, a.postcode].filter(Boolean).length > 0 && (
                  <p>{[a.city, a.state, a.postcode].filter(Boolean).join(", ")}</p>
                )}
                <p>{a.country}</p>
                {a.phone && <p className="text-espresso/55">{a.phone}</p>}
                {a.isDefault && (
                  <span className="mt-2 inline-block rounded-full bg-taupe/15 px-2.5 py-0.5 text-[11px] text-taupe">Default</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders — this customer's real orders (synced from checkout) */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">Orders</h2>
          {orders.length > 0 && (
            <span className="text-xs text-espresso/45">
              {orders.length} order{orders.length === 1 ? "" : "s"} ·{" "}
              {inr(orders.reduce((s, o) => s + o.total, 0))} total
            </span>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="bg-cream border border-dashed border-line rounded-xl p-8 text-center">
            <p className="text-sm text-espresso/60">No orders yet.</p>
          </div>
        ) : (
          <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line overflow-hidden">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-espresso/[0.03] transition-colors"
              >
                <div>
                  <p className="text-sm text-espresso">{o.orderNumber}</p>
                  <p className="text-[11px] text-espresso/45 mt-0.5">{fmtDateTime(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] capitalize ${
                      o.status === "paid" ? "bg-[#d4e3cb] text-[#307a07]" : "bg-espresso/8 text-espresso/50"
                    }`}
                  >
                    {o.status}
                  </span>
                  <span className="text-sm tabular-nums text-espresso">{inr(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
