import { deleteCustomerSession } from "@/lib/customer-auth";

// POST /api/auth/logout — clears the customer session cookie.
export async function POST() {
  await deleteCustomerSession();
  return Response.json({ ok: true });
}
