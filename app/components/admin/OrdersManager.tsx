"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FulfillmentBadge, PaymentBadge } from "@/app/components/OrderStatus";
import ConfirmModal from "./ConfirmModal";

// One row's worth of data, pre-formatted on the server (dates/money as strings,
// raw status strings for the badges). Everything here comes from real orders.
export type OrderRowData = {
  id: number;
  orderNumber: string;
  email: string;
  deletedCustomer: boolean;
  date: string;
  total: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  items: number;
};

const SORTS = [
  { value: "date_desc", label: "Date: Newest" },
  { value: "date_asc", label: "Date: Oldest" },
  { value: "total_desc", label: "Total: High → Low" },
  { value: "total_asc", label: "Total: Low → High" },
];

type PendingDelete = { ids: number[]; label: string };

export default function OrdersManager({
  orders,
  tab,
  q,
  sort,
}: {
  orders: OrderRowData[];
  tab: string;
  q: string;
  sort: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const refreshedOnce = useRef(false);

  // Visible confirmation that the refresh actually ran. The data is often
  // identical, so without feedback the button looks like it does nothing.
  useEffect(() => {
    if (!refreshing && refreshedOnce.current) {
      refreshedOnce.current = false;
      toast.success("Orders refreshed");
    }
  }, [refreshing]);
  function handleRefresh() {
    refreshedOnce.current = true;
    startRefresh(() => router.refresh());
  }

  // The row ⋮ menu is a viewport-FIXED popover (not absolutely inside the
  // horizontally-scrollable table) — an absolute menu made the wrapper's
  // overflow-y compute to `auto`, so a taller menu triggered a scrollbar. Fixed
  // positioning escapes that container entirely. Position is read from the button.
  function toggleMenu(id: number, btn: HTMLButtonElement) {
    if (menuId === id) { setMenuId(null); return; }
    const r = btn.getBoundingClientRect();
    const MENU_H = 84; // ~2 rows; flip above if it would spill past the viewport
    const openUp = r.bottom + MENU_H > window.innerHeight;
    setMenuPos({ top: openUp ? r.top - MENU_H : r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    setMenuId(id);
  }
  // A fixed popover would drift from its button on scroll/resize — close it instead.
  useEffect(() => {
    if (menuId === null) return;
    const close = () => setMenuId(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuId]);

  // Build a /admin/orders URL that preserves the current filters, overriding
  // only what's passed. Any filter/sort/search change resets to page 1 (no page).
  function urlWith(over: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const m = { tab, q, sort, ...over };
    if (m.tab && m.tab !== "all") p.set("tab", m.tab);
    if (m.q) p.set("q", m.q);
    if (m.sort && m.sort !== "date_desc") p.set("sort", m.sort);
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    router.push(urlWith({ q: query.trim() || undefined }));
  }

  async function doDelete() {
    if (!pending) return;
    setBusy(true);
    const results = await Promise.all(
      pending.ids.map((id) =>
        fetch(`/api/admin/orders/${id}`, { method: "DELETE" })
          .then((r) => r.ok)
          .catch(() => false)
      )
    );
    setBusy(false);
    const ok = results.filter(Boolean).length;
    const failed = results.length - ok;
    if (ok > 0) toast.success(`${ok} order${ok === 1 ? "" : "s"} deleted`);
    if (failed > 0) toast.error(`${failed} order${failed === 1 ? "" : "s"} could not be deleted`);
    setPending(null);
    setMenuId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* ---- Toolbar: search · sort · refresh ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={submitSearch} className="relative w-72 max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" /><path d="m11 11 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find order"
            className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-9 text-sm text-espresso focus:border-espresso focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); router.push(urlWith({ q: undefined })); }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-espresso/50 hover:bg-line/60 hover:text-espresso"
            >
              <svg width="10" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
            <span className="text-espresso/50">Sort by</span>
            <select
              value={sort}
              onChange={(e) => router.push(urlWith({ sort: e.target.value }))}
              className="bg-transparent text-espresso accent-espresso focus:outline-none"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-espresso/60 hover:border-espresso/40 hover:text-espresso disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={refreshing ? "animate-spin" : ""}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded-xl border border-line bg-cream shadow-soft">
        <table className="w-full min-w-[940px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-espresso/50">
              <th className="px-3 py-2 pl-4 font-medium">ID Order</th>
              <th className="px-3 py-2 font-medium"><SortHead label="Date" col="date" sort={sort} urlWith={urlWith} /></th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium text-right"><SortHead label="Total" col="total" sort={sort} urlWith={urlWith} align="right" /></th>
              <th className="px-3 py-2 font-medium text-center">Payment Status</th>
              <th className="px-3 py-2 font-medium text-center">Items</th>
              <th className="px-3 py-2 font-medium text-center">Order Status</th>
              <th className="w-12 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              return (
                <tr key={o.id} className="border-b border-line/70 last:border-0 transition-colors hover:bg-espresso/[0.03]">
                  <td className="px-3 py-2 pl-4">
                    <Link href={`/admin/orders/${o.id}`} className="text-espresso hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-espresso/60">{o.date}</td>
                  <td className="max-w-[220px] px-3 py-2 text-espresso/70">
                    <span className="block truncate">{o.email}</span>
                    {o.deletedCustomer && (
                      <span className="mt-1 inline-block rounded bg-espresso/5 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-espresso/45">Deleted customer</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-espresso">{o.total}</td>
                  <td className="px-3 py-2 text-center"><PaymentBadge status={o.paymentStatus} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums text-espresso/80">
                    {o.items} <span className="text-espresso/45">{o.items === 1 ? "item" : "items"}</span>
                  </td>
                  <td className="px-3 py-2 text-center"><FulfillmentBadge status={o.fulfillmentStatus} /></td>
                  <td className="relative px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => toggleMenu(o.id, e.currentTarget)}
                      aria-label={`Actions for ${o.orderNumber}`}
                      aria-haspopup="menu"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-espresso/60 hover:bg-espresso/10 hover:text-espresso"
                    >
                      <svg width="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" /></svg>
                    </button>
                    {menuId === o.id && menuPos && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                        <div className="fixed z-50 w-32 overflow-hidden rounded-md border border-line bg-cream text-left shadow-soft-lg" style={{ top: menuPos.top, right: menuPos.right }}>
                          <Link href={`/admin/orders/${o.id}`} className="block px-3 py-2 text-sm text-espresso hover:bg-espresso/5">View</Link>
                          <button
                            type="button"
                            onClick={() => { setMenuId(null); setPending({ ids: [o.id], label: `Order ${o.orderNumber}` }); }}
                            className="block w-full border-t border-line/70 px-3 py-2 text-left text-sm text-[#b23a3a] hover:bg-[#f4dede]"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-base text-espresso/50">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!pending}
        title={pending && pending.ids.length > 1 ? "Delete these orders?" : "Delete this order?"}
        message={pending ? `${pending.label} will be permanently removed, along with its timeline and any returns. This does NOT refund any payment.` : ""}
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

// A sortable column header — clicking toggles asc/desc for that column and shows
// which way it's sorted. Only Date and Total are sortable (real DB columns).
function SortHead({
  label,
  col,
  sort,
  urlWith,
  align,
}: {
  label: string;
  col: "date" | "total";
  sort: string;
  urlWith: (over: Record<string, string | undefined>) => string;
  align?: "right";
}) {
  const asc = `${col}_asc`;
  const desc = `${col}_desc`;
  const isActive = sort === asc || sort === desc;
  const isAsc = sort === asc;
  const next = isAsc ? desc : asc;
  return (
    <Link
      href={urlWith({ sort: next })}
      className={`inline-flex items-center gap-1 hover:text-espresso ${align === "right" ? "flex-row-reverse" : ""} ${isActive ? "text-espresso" : ""}`}
    >
      <span>{label}</span>
      <svg width="8" height="11" viewBox="0 0 8 11" aria-hidden="true">
        <path d="M4 0l3 4H1z" fill="currentColor" fillOpacity={isActive && !isAsc ? 1 : 0.3} />
        <path d="M4 11L1 7h6z" fill="currentColor" fillOpacity={isActive && isAsc ? 1 : 0.3} />
      </svg>
    </Link>
  );
}
