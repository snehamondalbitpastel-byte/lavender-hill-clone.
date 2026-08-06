import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import AccountLogo from "../(account)/_components/AccountLogo";
import CheckoutForm from "./CheckoutForm";
import CheckoutBagButton from "./CheckoutBagButton";

export const metadata: Metadata = { title: "Checkout - Lavender Hill Clothing" };

export default async function CheckoutPage() {
  // Checkout requires login (same rule as add-to-cart) — come back here after.
  const session = await getCustomerSession();
  if (!session) redirect("/authentication/login?redirect=/checkout");
  const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
  if (!customer) redirect("/authentication/login?redirect=/checkout");

  // Pre-fill delivery from the default saved address.
  let addr = await prisma.address.findFirst({
    where: { customerId: customer.id, isDefault: true },
  });
  if (!addr) addr = await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: { id: "asc" } });

  const initialDelivery = addr
    ? {
        country: addr.country || "India",
        firstName: addr.firstName,
        lastName: addr.lastName,
        company: addr.company,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state: addr.state,
        postcode: addr.postcode,
        phone: addr.phone,
      }
    : null;

  return (
    <div className="min-h-screen bg-white text-espresso">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" aria-label="Lavender Hill — home">
            <AccountLogo className="w-[150px] h-auto" />
          </Link>
          <CheckoutBagButton />
        </div>
      </header>

      <CheckoutForm
        email={customer.email}
        initialDelivery={initialDelivery}
        stripeKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      />
    </div>
  );
}
