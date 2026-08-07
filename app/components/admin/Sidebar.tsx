"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type IconName =
  | "dashboard" | "orders" | "returns" | "discounts" | "products" | "categories" | "customers" | "content" | "hero";

const NAV: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/returns", label: "Returns", icon: "returns" },
  // Promo/coupon codes — created here, entered by customers at checkout.
  { href: "/admin/discounts", label: "Discounts", icon: "discounts" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/categories", label: "Categories", icon: "categories" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/content", label: "Content", icon: "content" },
  { href: "/admin/hero", label: "Hero", icon: "hero" },
];

// Exact Lucide glyphs (viewBox 0 0 24 24, stroke = currentColor).
function NavIcon({ name }: { name: IconName }) {
  const p = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const cls = "h-[18px] w-[18px] shrink-0";
  switch (name) {
    case "dashboard": // layout-dashboard
      return <svg viewBox="0 0 24 24" className={cls}><rect width="7" height="9" x="3" y="3" rx="1" {...p} /><rect width="7" height="5" x="14" y="3" rx="1" {...p} /><rect width="7" height="9" x="14" y="12" rx="1" {...p} /><rect width="7" height="5" x="3" y="16" rx="1" {...p} /></svg>;
    case "orders": // shopping-bag
      return <svg viewBox="0 0 24 24" className={cls}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" {...p} /><path d="M3 6h18" {...p} /><path d="M16 10a4 4 0 0 1-8 0" {...p} /></svg>;
    case "returns": // undo-2
      return <svg viewBox="0 0 24 24" className={cls}><path d="M9 14 4 9l5-5" {...p} /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" {...p} /></svg>;
    case "discounts": // percent
      return <svg viewBox="0 0 24 24" className={cls}><line x1="19" x2="5" y1="5" y2="19" {...p} /><circle cx="6.5" cy="6.5" r="2.5" {...p} /><circle cx="17.5" cy="17.5" r="2.5" {...p} /></svg>;
    case "products": // shirt
      return <svg viewBox="0 0 24 24" className={cls}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" {...p} /></svg>;
    case "categories": // layers
      return <svg viewBox="0 0 24 24" className={cls}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" {...p} /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" {...p} /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" {...p} /></svg>;
    case "customers": // users
      return <svg viewBox="0 0 24 24" className={cls}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...p} /><circle cx="9" cy="7" r="4" {...p} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" {...p} /><path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} /></svg>;
    case "content": // file-text
      return <svg viewBox="0 0 24 24" className={cls}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" {...p} /><path d="M14 2v4a2 2 0 0 0 2 2h4" {...p} /><path d="M16 13H8" {...p} /><path d="M16 17H8" {...p} /><path d="M10 9H8" {...p} /></svg>;
    case "hero": // image
      return <svg viewBox="0 0 24 24" className={cls}><rect width="18" height="18" x="3" y="3" rx="2" {...p} /><circle cx="9" cy="9" r="2" {...p} /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" {...p} /></svg>;
  }
}

export default function Sidebar({ email, pendingReturns = 0 }: { email: string; pendingReturns?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  // Live pending-returns badge: poll the server so a return raised on the
  // storefront shows up here without a manual refresh. Seeded from the server
  // value so there's no flash on load.
  const [pending, setPending] = useState(pendingReturns);
  const seenRef = useRef(pendingReturns);
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/admin/returns/count", { cache: "no-store" });
        if (!active || !res.ok) return;
        const data = await res.json();
        const n = Number(data.pending) || 0;
        setPending(n);
        if (n > seenRef.current) {
          const diff = n - seenRef.current;
          toast.info(`${diff} new return request${diff === 1 ? "" : "s"} — check Returns.`);
          router.refresh(); // pull fresh server data into the current page too
        }
        seenRef.current = n;
      } catch {
        /* transient network error — try again next tick */
      }
    }
    const id = setInterval(poll, 15000);
    return () => { active = false; clearInterval(id); };
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 bg-espresso text-cream/80 min-h-screen flex flex-col sticky top-0 self-start h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-[11px] tracking-[0.26em] uppercase text-cream/60">
          Lavender Hill
        </p>
        <p className="text-sm mt-1 text-cream">Admin</p>
      </div>

      <nav className="flex flex-col gap-1 py-3 flex-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = item.href === "/admin/returns" && pending > 0 ? pending : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between gap-2 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[#c9a87c]/80 text-espresso font-medium"
                  : "text-cream/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-3">
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </span>
              {badge !== null && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#e0533f] px-1.5 text-[11px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <p className="px-3 text-[11px] text-cream/45 truncate mb-2" title={email}>
          {email}
        </p>
        <button
          type="button"
          onClick={logout}
          className="w-full text-left px-3 py-2.5 rounded-md text-sm text-cream/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
