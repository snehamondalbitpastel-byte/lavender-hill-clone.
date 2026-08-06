import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// DELETE /api/admin/customers/[id] — remove a customer account (and any of
// their pending login codes). Admin-guarded.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return Response.json({ ok: true });

  await prisma.$transaction([
    prisma.loginCode.deleteMany({ where: { email: customer.email } }),
    prisma.customer.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true });
}
