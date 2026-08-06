import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in - Lavender Hill Clothing",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  // Only allow internal paths (block open redirects).
  const dest =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/orders";

  // Already signed in AND the account still exists → skip to the destination.
  // (A stale session whose customer was removed stays here so it can re-auth.)
  const session = await getCustomerSession();
  if (session) {
    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: { id: true },
    });
    if (customer) redirect(dest);
  }
  return <LoginForm redirect={redirectParam} />;
}
