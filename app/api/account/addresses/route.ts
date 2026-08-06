import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";

const s = (v: unknown) => String(v ?? "").trim();

export function parseAddress(b: Record<string, unknown>) {
  return {
    country: s(b.country),
    firstName: s(b.firstName),
    lastName: s(b.lastName),
    company: s(b.company),
    address1: s(b.address1),
    address2: s(b.address2),
    city: s(b.city),
    state: s(b.state),
    postcode: s(b.postcode),
    phone: s(b.phone),
    isDefault: b.isDefault === true,
  };
}

// POST /api/account/addresses — add an address for the signed-in customer.
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = parseAddress(await request.json().catch(() => ({})));
  if (!data.country || !data.address1) {
    return Response.json({ error: "Country and address are required." }, { status: 400 });
  }

  // First address (or one marked default) becomes the default; clear others.
  const existing = await prisma.address.count({ where: { customerId: session.customerId } });
  const makeDefault = data.isDefault || existing === 0;
  if (makeDefault) {
    await prisma.address.updateMany({
      where: { customerId: session.customerId },
      data: { isDefault: false },
    });
  }
  await prisma.address.create({
    data: { ...data, isDefault: makeDefault, customerId: session.customerId },
  });
  return Response.json({ ok: true });
}
