import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";

// PUT /api/account/profile — update the signed-in customer's name / marketing
// preference. Guarded: only the owner of the session can edit their record.
export async function PUT(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const marketingConsent = body.marketingConsent !== false;

  // updateMany (not update) so a stale session id can't throw a 500.
  await prisma.customer.updateMany({
    where: { id: session.customerId },
    data: { name: name || null, marketingConsent },
  });
  return Response.json({ ok: true });
}
