import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountLogo from "../_components/AccountLogo";
import LogoutButton from "../_components/LogoutButton";
import ProfilePanels from "./ProfilePanels";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

export const metadata: Metadata = {
  title: "Profile - Lavender Hill Clothing",
};

// Always fresh — a name/address saved at checkout must show here immediately.
export const dynamic = "force-dynamic";

const FOOTER_LINKS = [
  "Refund policy",
  "Shipping",
  "Privacy policy",
  "Terms of service",
  "Legal notice",
  "Contact information",
];

export default async function ProfilePage() {
  const session = await requireCustomer();
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
  });
  // Stale session (account renumbered/removed) → force a clean re-login so the
  // storefront always shows the real backend data.
  if (!customer) redirect("/authentication/login");

  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  // Translate the server-rendered chrome (nav, sign-out heading, footer) for the
  // visitor's language. The panels below translate themselves via useT.
  const locale = await getLocale();
  const UI = ["Orders", "Profile", "Sign out", "India", ...FOOTER_LINKS];
  const tvals = await localizeMany(UI, locale);
  const tmap = new Map(UI.map((s, i) => [s, tvals[i]]));
  const t = (s: string) => tmap.get(s) ?? s;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar: logo left · account icon right (→ profile) */}
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
            <path d="M5.7 19.2a6.4 6.4 0 0 1 12.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      {/* Body: nav + content */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-6 md:px-10 md:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <nav className="flex shrink-0 flex-row items-center gap-6 md:w-[180px] md:flex-col md:items-start md:gap-4">
            <Link
              href="/orders"
              className="text-[1.15rem] text-[#8f7060] transition-colors hover:text-[#1a1a1a]"
            >
              {t("Orders")}
            </Link>
            <span className="text-[1.35rem] font-bold text-[#1a1a1a]">{t("Profile")}</span>
          </nav>

          <section className="w-full max-w-[42rem] flex-1">
            <ProfilePanels
              email={customer.email}
              initialName={customer.name ?? ""}
              initialMarketing={customer.marketingConsent}
              addresses={addresses}
            />

            {/* Sign out */}
            <section aria-label="Sign out" className="mt-10">
              <h2 className="mb-3 text-[1.05rem] font-semibold text-[var(--acc-fg)]">{t("Sign out")}</h2>
              <LogoutButton className="rounded-md border border-[var(--acc-line)] px-5 py-2.5 text-[0.9rem] text-[var(--acc-fg)] transition-colors hover:bg-[#f6f6f6]" />
            </section>
          </section>
        </div>
      </main>

      {/* Footer */}
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
