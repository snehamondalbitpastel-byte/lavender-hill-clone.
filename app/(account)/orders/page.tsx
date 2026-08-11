import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountLogo from "../_components/AccountLogo";
import LogoutButton from "../_components/LogoutButton";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { FulfillmentBadge } from "@/app/components/OrderStatus";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";
import { FULFILLMENT_LABELS } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Orders - Lavender Hill Clothing",
};

// Always fresh — a newly placed order must show here immediately.
export const dynamic = "force-dynamic";

const FOOTER_LINKS = [
  "Refund policy",
  "Shipping",
  "Privacy policy",
  "Terms of service",
  "Legal notice",
  "Contact information",
];

export default async function OrdersPage() {
  const session = await requireCustomer();
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
  });
  if (!customer) redirect("/authentication/login");
  const greetName = customer.name?.trim();

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  // Translate every fixed UI string on this page for the visitor's language
  // (engine + cache — same as product content). A full page reload on language
  // change (LanguageSelector) re-renders this server component in the new locale.
  const locale = await getLocale();
  const UI = [
    "Orders", "Profile", "Shop now", "No orders yet",
    "When you place an order it will appear here, with tracking and order details.",
    "Order placed", "Welcome", "Signed in as", "item", "items", "India",
    ...FOOTER_LINKS, ...Object.values(FULFILLMENT_LABELS),
  ];
  const tvals = await localizeMany(UI, locale);
  const tmap = new Map(UI.map((s, i) => [s, tvals[i]]));
  const t = (s: string) => tmap.get(s) ?? s;

  const inr = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar: logo left · account icon right */}
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 md:px-10">
        <AccountLogo className="w-[160px] h-auto" />
        <Link
          href="/profile"
          aria-label="Account"
          className="text-[#3a3a3a] transition-colors hover:text-black"
        >
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M5.7 19.2a6.4 6.4 0 0 1 12.6 0"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </header>

      {/* Body: sidebar nav + content */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-6 md:px-10 md:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <nav className="flex shrink-0 flex-row items-center gap-6 md:w-[180px] md:flex-col md:items-start md:gap-4">
            <span className="text-[1.35rem] font-bold text-[#1a1a1a]">{t("Orders")}</span>
            <Link
              href="/profile"
              className="text-[1.15rem] text-[#8f7060] transition-colors hover:text-[#1a1a1a]"
            >
              {t("Profile")}
            </Link>
            <LogoutButton className="text-[0.95rem] text-[#8f7060] transition-colors hover:text-[#1a1a1a] md:mt-2" />
          </nav>

          <section className="flex-1">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div>
                <p className="text-[1.35rem] font-bold text-[#1a1a1a]">
                  {t("Welcome")}{greetName ? `, ${greetName}` : ""}
                </p>
                <p className="mt-1 text-[0.95rem] text-[#6b6b6b]">
                  {t("Signed in as")} {customer.email}
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 rounded-md bg-[#847a8a] px-5 py-2.5 text-[0.9rem] text-white transition-colors hover:bg-[#736979]"
              >
                {t("Shop now")}
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#e0e0e0] bg-white p-10 text-center">
                <p className="text-[1.05rem] font-semibold text-[#1a1a1a]">{t("No orders yet")}</p>
                <p className="mx-auto mt-1 max-w-sm text-[0.9rem] text-[#6b6b6b]">
                  {t("When you place an order it will appear here, with tracking and order details.")}
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {orders.map((o) => {
                  const items = JSON.parse(o.items || "[]") as { qty: number }[];
                  const count = items.reduce((n, it) => n + (it.qty || 0), 0);
                  // Customer-friendly label: "unfulfilled" reads as "Order placed";
                  // other statuses show their translated fulfillment label.
                  const chipLabel =
                    o.fulfillmentStatus === "unfulfilled"
                      ? t("Order placed")
                      : t(FULFILLMENT_LABELS[o.fulfillmentStatus as keyof typeof FULFILLMENT_LABELS] ?? o.fulfillmentStatus);
                  return (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-start justify-between gap-4 rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:border-[#c9c9c9]"
                    >
                      <div>
                        <p className="text-[1rem] font-semibold text-[#1a1a1a]">{o.orderNumber}</p>
                        <p className="mt-0.5 text-[0.85rem] text-[#6b6b6b]">{fmtDate(o.createdAt)} · {count} {count === 1 ? t("item") : t("items")}</p>
                      </div>
                      {/* status chip on top, price below — top-right corner */}
                      <div className="flex flex-col items-end gap-2">
                        <FulfillmentBadge status={o.fulfillmentStatus} label={chipLabel} />
                        <span className="text-[0.95rem] font-medium text-[#1a1a1a]">{inr(o.total)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer: country selector + policy links */}
      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-6 md:px-10">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[0.85rem] text-[#8f7060] transition-colors hover:text-[#1a1a1a]"
        >
          {t("India")}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="m1 3.5 4 4 4-4" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </button>
        {FOOTER_LINKS.map((label) => (
          <a
            key={label}
            href="#"
            className="text-[0.85rem] text-[#8f7060] underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current hover:text-[#1a1a1a]"
          >
            {t(label)}
          </a>
        ))}
      </footer>
    </div>
  );
}
