import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();

// PATCH /api/admin/menu/links/[id] — update a link { label, href, order? }.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const label = s(b.label);
  if (!label) return Response.json({ error: "A link label is required." }, { status: 400 });
  await prisma.menuLink.update({
    where: { id },
    data: { label, href: s(b.href), ...(b.order != null ? { order: Number(b.order) || 0 } : {}) },
  });
  return Response.json({ ok: true });
}

// DELETE /api/admin/menu/links/[id] — remove a link.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.menuLink.delete({ where: { id } }).catch(() => {});
  return Response.json({ ok: true });
}
