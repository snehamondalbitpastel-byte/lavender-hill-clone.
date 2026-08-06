import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ReturnBadge } from "@/app/components/OrderStatus";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (d: Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Open returns (needing action) sort to the top.
const PRIORITY: Record<string, number> = { requested: 0, approved: 1, received: 2, refunded: 3, rejected: 4, cancelled: 5 };

// Filter tabs — "All" plus one per return-process state the app actually uses
// (the full return lifecycle: requested → … → refunded, plus rejected/cancelled).
const TABS = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "all";

  const where: Prisma.ReturnWhereInput = tab === "all" ? {} : { status: tab };
  const rows = await prisma.return.findMany({ where, include: { order: true }, orderBy: { createdAt: "desc" } });
  const returns = rows.sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));

  return (
    <div>
      <header className="mb-4">
        <p className="eyebrow text-taupe">Sell</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Returns</h1>
      </header>

      {/* Tabs — live filters, one per return-process state (styled like the Orders page) */}
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-line">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/returns" : `/admin/returns?tab=${t.key}`}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[13px] transition-colors ${
                active ? "border-espresso font-medium text-espresso" : "border-transparent text-espresso/55 hover:text-espresso"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {returns.map((r) => {
          const items = JSON.parse(r.items || "[]") as { title: string; colour: string; size: string; qty: number }[];
          const imgs = JSON.parse(r.images || "[]") as string[];
          return (
            <Link
              key={r.id}
              href={`/admin/returns/${r.id}`}
              className="block rounded-xl border border-line bg-cream p-5 shadow-soft transition-colors hover:border-espresso/30 hover:bg-espresso/[0.02]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-espresso">
                    {r.returnNumber} · <span className="text-espresso/60">{r.order.orderNumber}</span>
                  </p>
                  <p className="text-xs text-espresso/55 mt-0.5">{r.order.email} · {fmt(r.createdAt)}</p>
                </div>
                <ReturnBadge status={r.status} />
              </div>

              <ul className="mt-3 flex flex-col gap-1 text-sm text-espresso/75">
                {items.map((it, i) => (
                  <li key={i}>
                    {it.title} <span className="text-espresso/45">{[it.colour, it.size].filter(Boolean).join(" / ")}</span> × {it.qty}
                  </li>
                ))}
              </ul>
              {r.reason && <p className="mt-2 text-xs text-espresso/55">Reason: “{r.reason}”</p>}

              {imgs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imgs.map((u, i) => (
                    <div key={i} className="relative h-12 w-12 overflow-hidden rounded border border-line">
                      <Image src={u} alt="return proof" fill sizes="48px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                <span className="text-espresso/70">Refund on receipt: <span className="font-medium">{inr(r.refundAmount)}</span></span>
                <span className="text-espresso/60">View details →</span>
              </div>
            </Link>
          );
        })}
        {returns.length === 0 && (
          <p className="bg-cream border border-line rounded-xl shadow-soft p-10 text-center text-espresso/40">
            {tab === "all" ? "No returns yet." : "No returns with this status."}
          </p>
        )}
      </div>
    </div>
  );
}
