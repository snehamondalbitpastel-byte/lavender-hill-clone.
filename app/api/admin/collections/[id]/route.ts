import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();

// PATCH /api/admin/collections/[id] — update a tile (only fields provided).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = s(b.title);
  if (b.href !== undefined) data.href = s(b.href) || "/shop";
  if (b.image !== undefined) data.image = s(b.image);
  if (b.order !== undefined) data.order = Number(b.order) || 0;
  await prisma.collection.update({ where: { id }, data });
  return Response.json({ ok: true });
}

// DELETE /api/admin/collections/[id] — remove a tile.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.collection.delete({ where: { id } });
  return Response.json({ ok: true });
}
