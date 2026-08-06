import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { parseAddress } from "../route";

// PUT /api/account/addresses/[id] — edit an address the customer owns.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const owned = await prisma.address.findFirst({
    where: { id, customerId: session.customerId },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });

  const data = parseAddress(await request.json().catch(() => ({})));
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { customerId: session.customerId },
      data: { isDefault: false },
    });
  }
  await prisma.address.update({ where: { id }, data });
  return Response.json({ ok: true });
}

// DELETE /api/account/addresses/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  await prisma.address.deleteMany({ where: { id, customerId: session.customerId } });
  return Response.json({ ok: true });
}
