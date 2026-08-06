import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { parseDiscountBody } from "../route";

// PATCH /api/admin/discounts/[id] — update a code.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const existing = await prisma.discountCode.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseDiscountBody(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  // Keep the code unique if it changed.
  if (parsed.data.code !== existing.code) {
    const clash = await prisma.discountCode.findUnique({ where: { code: parsed.data.code }, select: { id: true } });
    if (clash) return Response.json({ error: "That code already exists." }, { status: 409 });
  }

  // usageCount is not editable here — it's a ledger, not a setting.
  await prisma.discountCode.update({ where: { id }, data: parsed.data });
  return Response.json({ ok: true });
}

// DELETE /api/admin/discounts/[id] — remove a code.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.discountCode.delete({ where: { id } }).catch(() => {});
  return Response.json({ ok: true });
}
