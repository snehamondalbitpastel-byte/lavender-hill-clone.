import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PageLink from "@/app/components/admin/PageLink";
import OrdersManager, { type OrderRowData } from "@/app/components/admin/OrdersManager";

export const dynamic = "force-dynamic";

const PER_PAGE = 6; // 6 orders per page; the pager appears once there are 7+.

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: Date) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Total units in an order — summed from its real line-item snapshot. 0 if unreadable.
function countItems(itemsJson: string): number {
  try {
    const arr = JSON.parse(itemsJson || "[]") as { qty?: number }[];
    return arr.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

const TABS = [
  { key: "all", label: "All" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
  { key: "open", label: "Open" },
  { key: "close", label: "Close" },
];
const SORTS = ["date_desc", "date_asc", "total_desc", "total_asc"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; sort?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "all";
  const q = (sp.q ?? "").trim();
  const sort = SORTS.includes(sp.sort ?? "") ? sp.sort! : "date_desc";
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  // ---- Stat cards: global, live counts (independent of the tab/search) ----
  const [totalOrders, returnsCount, fulfilledCount, deliveredCount, allItemsRows] = await Promise.all([
    prisma.order.count(),
    prisma.return.count(),
    prisma.order.count({ where: { fulfillmentStatus: { in: ["shipped", "delivered"] } } }),
    prisma.order.count({ where: { fulfillmentStatus: "delivered" } }),
    prisma.order.findMany({ select: { items: true } }),
  ]);
  const orderedItems = allItemsRows.reduce((s, o) => s + countItems(o.items), 0);
  const stats = [
    { label: "Total Orders", value: totalOrders },
    { label: "Ordered items over time", value: orderedItems },
    { label: "Returns", value: returnsCount },
    { label: "Fulfilled orders over time", value: fulfilledCount },
    { label: "Delivered orders overtime", value: deliveredCount },
  ];

  // ---- Filtered + sorted + paginated list ----
  const where: Prisma.OrderWhereInput = {};
  if (tab === "unfulfilled") where.fulfillmentStatus = "unfulfilled";
  else if (tab === "unpaid") where.paymentStatus = { in: ["pending", "failed"] };
  else if (tab === "paid") where.paymentStatus = "paid";
  else if (tab === "open") where.fulfillmentStatus = { notIn: ["delivered", "cancelled"] };
  else if (tab === "close") where.fulfillmentStatus = { in: ["delivered", "cancelled"] };
  if (q) where.OR = [{ orderNumber: { contains: q } }, { email: { contains: q } }];

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === "date_asc" ? { createdAt: "asc" }
    : sort === "total_desc" ? { total: "desc" }
    : sort === "total_asc" ? { total: "asc" }
    : { createdAt: "desc" };

  const totalFiltered = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.order.findMany({
    where,
    orderBy,
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
  });
  const orders: OrderRowData[] = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    deletedCustomer: o.customerId === null,
    date: fmtDate(o.createdAt),
    total: inr(o.total),
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    items: countItems(o.items),
  }));

  // Query-string builder for tab links + pagination (preserves the other filters).
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const m = { tab, q, sort, page: undefined as string | number | undefined, ...over };
    if (m.tab && m.tab !== "all") p.set("tab", String(m.tab));
    if (m.q) p.set("q", String(m.q));
    if (m.sort && m.sort !== "date_desc") p.set("sort", String(m.sort));
    if (m.page && Number(m.page) > 1) p.set("page", String(m.page));
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <header className="mb-4">
        <p className="eyebrow text-taupe">Sales</p>
        <h1 className="text-xl mt-1 tracking-[0.04em]">Orders</h1>
      </header>

      {/* Stat cards — real, live counts. Red top-border accent. */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line border-t-4 border-t-[#c0392b] bg-cream p-4 shadow-soft">
            <p className="text-[10px] uppercase leading-tight tracking-[0.08em] text-espresso/50">{s.label}</p>
            <p className="mt-2 text-xl tabular-nums text-espresso">{s.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      {/* Tabs — live filters */}
      <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-line">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={qs({ tab: t.key })}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[13px] transition-colors ${
                active ? "border-espresso font-medium text-espresso" : "border-transparent text-espresso/55 hover:text-espresso"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <OrdersManager orders={orders} tab={tab} q={q} sort={sort} />

      {/* Pagination — only appears once there are more than 6 orders in view */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-1.5 text-sm" aria-label="Pagination">
          {page > 1 && (
            <PageLink href={qs({ page: page - 1 })} ariaLabel="Previous page" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-espresso/70 hover:border-espresso">‹</PageLink>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
            n === page ? (
              <span key={n} aria-current="page" className="flex h-9 w-9 items-center justify-center rounded-md bg-espresso text-cream tabular-nums">{n}</span>
            ) : (
              <PageLink key={n} href={qs({ page: n })} className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-espresso/70 hover:border-espresso tabular-nums">{n}</PageLink>
            )
          )}
          {page < totalPages && (
            <PageLink href={qs({ page: page + 1 })} ariaLabel="Next page" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-espresso/70 hover:border-espresso">›</PageLink>
          )}
        </nav>
      )}
    </div>
  );
}
