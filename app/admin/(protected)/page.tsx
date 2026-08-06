import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { productPricing } from "@/lib/cards";

export default async function AdminDashboard() {
  const session = await requireAdmin();

  const [products, saleRows, newIn, customers, orderCount, revenueAgg, recent] = await Promise.all([
    prisma.product.count(),
    // Pricing fields for every product, so "on sale" is computed the SAME way as
    // the storefront (productPricing → saveBadge covers compare-at AND per-product
    // discounts — a compareAtPrice-only count misses discount-based sales).
    prisma.product.findMany({ select: { price: true, compareAtPrice: true, discountType: true, discountValue: true } }),
    prisma.product.count({ where: { isNew: true } }),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const onSale = saleRows.filter(
    (p) => !!productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue).saveBadge
  ).length;

  const name = session.email.split("@")[0];
  const revenue = revenueAgg._sum.total ?? 0;
  const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Business metrics — now REAL (orders + revenue + customers), each clickable.
  const business: { label: string; value: string; href?: string }[] = [
    { label: "Revenue", value: inr(revenue), href: "/admin/orders" },
    { label: "Orders", value: String(orderCount), href: "/admin/orders" },
    { label: "Customers", value: String(customers), href: "/admin/customers" },
  ];

  const catalog = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "New In", value: newIn, href: "/admin/products?filter=new-in" },
    { label: "On sale", value: onSale, href: "/admin/products?filter=on-sale" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow text-taupe">Dashboard</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Welcome back, {name}</h1>
      </header>

      {/* Sales & orders — real revenue/orders once checkout is live */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">Store performance</h2>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#307a07] bg-[#d4e3cb] rounded-full px-3 py-1">
            Live
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {business.map((s) =>
            s.href ? (
              <Link key={s.label} href={s.href} className="bg-cream border border-line rounded-xl p-5 shadow-soft hover:border-line-strong transition-colors">
                <p className="text-3xl font-light tabular-nums">{s.value}</p>
                <p className="text-xs uppercase tracking-[0.1em] text-espresso/55 mt-2">{s.label}</p>
              </Link>
            ) : (
              <div key={s.label} className="bg-cream border border-line rounded-xl p-5 shadow-soft">
                <p className="text-3xl font-light tabular-nums text-espresso/40">{s.value}</p>
                <p className="text-xs uppercase tracking-[0.1em] text-espresso/50 mt-2">{s.label}</p>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-espresso/45 mt-2">
          Revenue and order counts are live — they update as customers check out.
        </p>
      </section>

      {/* Catalogue health */}
      <section>
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-3">Catalogue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {catalog.map((s) => (
            <Link key={s.label} href={s.href} className="bg-cream border border-line rounded-xl p-5 shadow-soft hover:border-line-strong transition-colors">
              <p className="text-3xl font-light tabular-nums">{s.value}</p>
              <p className="text-xs uppercase tracking-[0.1em] text-espresso/55 mt-2">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently added */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">Recently added</h2>
          <Link href="/admin/products" className="text-xs text-espresso/60 hover:text-espresso">View all →</Link>
        </div>
        <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
          {recent.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}/edit`} className="flex items-center gap-3 px-4 py-3 hover:bg-beige/50 transition-colors">
              <Image src={p.image} alt="" width={30} height={40} className="rounded object-cover border border-line shrink-0" />
              <span className="text-sm text-espresso truncate flex-1">{p.title}</span>
              <span className="text-xs text-espresso/50 tabular-nums">{p.price}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
