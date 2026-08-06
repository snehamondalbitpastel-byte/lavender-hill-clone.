import { getCustomerSession, deleteCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

// GET /api/auth/me — lightweight login check for the client (the session
// cookie is httpOnly, so JS can't read it directly).
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return Response.json({ loggedIn: false, email: null });

  // A JWT can outlive its account (e.g. the customer was deleted in the admin).
  // Verify the customer still exists; if not, clear the stale cookie so the
  // storefront treats them as a guest (add-to-cart shows the sign-in gate).
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { email: true },
  });
  if (!customer) {
    await deleteCustomerSession();
    return Response.json({ loggedIn: false, email: null });
  }
  return Response.json({ loggedIn: true, email: customer.email });
}
