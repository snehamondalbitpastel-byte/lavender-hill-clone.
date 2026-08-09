import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// PUT    /api/admin/menu/[id] → update a column (title / href / order)
// DELETE /api/admin/menu/[id] → delete a column (its links cascade)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const data: { title?: string; href?: string; order?: number } = {};
  if (typeof b.title === "string") data.title = b.title.trim();
  if (typeof b.href === "string") data.href = b.href.trim();
  if (b.order != null && Number.isFinite(Number(b.order))) data.order = Number(b.order);
  if (data.title === "") return Response.json({ error: "A column title is required." }, { status: 400 });
  await prisma.menuGroup.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.menuGroup.delete({ where: { id } });
  return Response.json({ ok: true });
}
