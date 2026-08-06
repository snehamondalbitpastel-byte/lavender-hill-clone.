import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeleteButton from "@/app/components/admin/DeleteButton";
import ProductSearch from "@/app/components/admin/ProductSearch";
import PageLink from "@/app/components/admin/PageLink";
import { PRODUCTS_PER_PAGE as PER_PAGE } from "@/lib/products";
import { productPricing } from "@/lib/cards";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter ?? "";
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  // Filter chips from the dashboard map to a where-clause + label.
  const filterWhere =
    filter === "new-in" ? { isNew: true }
    : filter === "on-sale"
      ? { OR: [{ compareAtPrice: { not: null } }, { discountValue: { gt: 0 } }] }
    : filter === "bestseller" ? { bestseller: true }
    : {};
  const filterLabel =
    filter === "new-in" ? "New In"
    : filter === "on-sale" ? "On sale"
    : filter === "bestseller" ? "Bestsellers"
    : "";

  const where = { ...filterWhere, ...(q ? { title: { contains: q } } : {}) };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // If the requested page no longer exists (e.g. the last product on it was
  // deleted), redirect to the current last page instead of an empty page.
  if (requestedPage > totalPages) {
    const p = new URLSearchParams();
    if (filter) p.set("filter", filter);
    if (q) p.set("q", q);
    if (totalPages > 1) p.set("page", String(totalPages));
    redirect(`/admin/products${p.toString() ? `?${p}` : ""}`);
  }
  const page = requestedPage;

  // Every product in the catalogue, paginated — a product added via the form
  // appears here immediately (it is created with order = max+1).
  const rows = await prisma.product.findMany({
    where,
    // Same sort key as regenerateCards() (order, then id) so the admin list is
    // always in lock-step with the shop grid — even if two products ever share
    // an `order` value, both break the tie the same way.
    orderBy: [{ order: "asc" }, { id: "asc" }],
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
  });

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params}`;
  };
  // The current list URL (page + any filter/search) — threaded to the edit page
  // so its "← Products" / Cancel return here instead of always page 1.
  const backToList = `/admin/products${qs(page)}`;
  const clearFilterHref = q ? `?q=${encodeURIComponent(q)}` : "/admin/products";
  const countLabel = filterLabel
    ? `${total} ${filterLabel}`
    : `${total} product${total === 1 ? "" : "s"}`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-taupe">Catalog</p>
          <h1 className="text-2xl mt-1 tracking-[0.04em]">Products</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-espresso/55">{countLabel}</p>
            {filterLabel && (
              <Link
                href={clearFilterHref}
                className="text-[11px] uppercase tracking-[0.08em] bg-espresso text-cream rounded-full pl-2.5 pr-2 py-0.5 flex items-center gap-1 hover:bg-espresso/85"
              >
                {filterLabel}
                <svg width="8" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="2.5" /></svg>
              </Link>
            )}
          </div>
        </div>
        <Link href="/admin/products/new" className="btn-lh">+ Add product</Link>
      </header>

      <div className="mb-4">
        <ProductSearch initialQ={q} filter={filter} />
      </div>

      <div className={`bg-cream border border-line rounded-xl shadow-soft overflow-x-auto${totalPages > 1 ? " min-h-[540px]" : ""}`}>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-espresso/50 border-b border-line">
              <th className="py-3 px-4 font-medium">Product</th>
              <th className="py-3 px-4 font-medium">Category</th>
              <th className="py-3 px-4 font-medium text-right">Price</th>
              <th className="py-3 px-4 font-medium text-center">On</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const pricing = productPricing(p.price, p.compareAtPrice, p.discountType, p.discountValue);
              const onSale = pricing.onSale;
              return (
                <tr key={p.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Image src={p.image} alt="" width={34} height={45} className="rounded object-cover border border-line shrink-0" />
                      <div className="min-w-0">
                        <p className="text-espresso truncate max-w-[260px]">{p.title}</p>
                        <p className="text-[11px] text-espresso/40">{p.productType || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-espresso/70">{p.category || "—"}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-espresso/80">
                    {pricing.priceStr}
                    {onSale && <span className="block text-[10px] text-[#533a59]">sale</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {p.bestseller && <Flag>Home</Flag>}
                      {p.isNew && <Flag>New</Flag>}
                      {onSale && <Flag>Sale</Flag>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Link href={`/admin/products/${p.id}/edit?from=${encodeURIComponent(backToList)}`} className="text-xs text-espresso hover:underline mr-3">Edit</Link>
                    <DeleteButton id={p.id} title={p.title} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-espresso/70 text-base">No products found.</td></tr>
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

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.08em] bg-taupe/15 text-taupe rounded px-1.5 py-0.5">
      {children}
    </span>
  );
}
