import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// PUT    /api/admin/menu/links/[linkId] → update a link (label / href / order)
// DELETE /api/admin/menu/links/[linkId] → delete a link
export async function PUT(request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).linkId);
  const b = await request.json().catch(() => ({}));
  const data: { label?: string; href?: string; order?: number } = {};
  if (typeof b.label === "string") data.label = b.label.trim();
  if (typeof b.href === "string") data.href = b.href.trim();
  if (b.order != null && Number.isFinite(Number(b.order))) data.order = Number(b.order);
  await prisma.menuLink.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).linkId);
  await prisma.menuLink.delete({ where: { id } });
  return Response.json({ ok: true });
}
