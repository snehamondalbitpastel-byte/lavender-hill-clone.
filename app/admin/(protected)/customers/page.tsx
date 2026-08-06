import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CustomerSearch from "@/app/components/admin/CustomerSearch";
import CustomerDeleteButton from "@/app/components/admin/CustomerDeleteButton";
import PageLink from "@/app/components/admin/PageLink";

// Always fresh — storefront edits (name/marketing) reflect on the next load.
export const dynamic = "force-dynamic";

const PER_PAGE = 10;

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = q
    ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
    : {};

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params}`;
  };

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">People</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Customers</h1>
        <p className="text-sm text-espresso/55 mt-1">
          {q
            ? `${total} match${total === 1 ? "" : "es"} for “${q}”`
            : `${total} registered customer${total === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="mb-4">
        <CustomerSearch initialQ={q} />
      </div>

      <div className={`bg-cream border border-line rounded-xl shadow-soft overflow-x-auto${totalPages > 1 ? " min-h-[610px]" : ""}`}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-espresso/50 border-b border-line">
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium text-center">Marketing</th>
              <th className="py-3 px-4 font-medium text-right">Joined</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/70 last:border-0">
                <td className="py-3 px-4">
                  <div className="min-w-0">
                    <p className="text-espresso truncate max-w-[320px]">{c.email}</p>
                    <p className="text-[11px] text-espresso/40">{c.name || "No name"}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {c.marketingConsent ? (
                    <span className="text-[9px] uppercase tracking-[0.08em] bg-[#d4e3cb] text-[#307a07] rounded px-1.5 py-0.5">Active</span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-[0.08em] bg-espresso/8 text-espresso/45 rounded px-1.5 py-0.5">Inactive</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-espresso/70 whitespace-nowrap tabular-nums">{fmtDate(c.createdAt)}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <Link href={`/admin/customers/${c.id}`} className="text-xs text-espresso hover:underline mr-3">View</Link>
                  <CustomerDeleteButton id={c.id} email={c.email} compact />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-12 text-center text-espresso/70 text-base">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 mt-6 text-sm" aria-label="Pagination">
          {page > 1 && (
            <PageLink href={qs(page - 1)} ariaLabel="Previous page" className="w-9 h-9 flex items-center justify-center border border-line rounded-md text-espresso/70 hover:border-espresso">‹</PageLink>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
            n === page ? (
              <span key={n} aria-current="page" className="w-9 h-9 flex items-center justify-center rounded-md bg-espresso text-cream tabular-nums">{n}</span>
            ) : (
              <PageLink key={n} href={qs(n)} className="w-9 h-9 flex items-center justify-center border border-line rounded-md text-espresso/70 hover:border-espresso tabular-nums">{n}</PageLink>
            )
          )}
          {page < totalPages && (
            <PageLink href={qs(page + 1)} ariaLabel="Next page" className="w-9 h-9 flex items-center justify-center border border-line rounded-md text-espresso/70 hover:border-espresso">›</PageLink>
          )}
        </nav>
      )}
    </div>
  );
}
