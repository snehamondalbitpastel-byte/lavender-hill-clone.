import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();

// PATCH /api/admin/looks/[id] — update a look (only the fields provided).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.look !== undefined) data.look = s(b.look);
  if (b.hotspotTop !== undefined) data.hotspotTop = s(b.hotspotTop) || "50%";
  if (b.hotspotLeft !== undefined) data.hotspotLeft = s(b.hotspotLeft) || "50%";
  if (b.name !== undefined) data.name = s(b.name);
  if (b.price !== undefined) data.price = s(b.price);
  if (b.productImg !== undefined) data.productImg = s(b.productImg);
  if (b.productImgAlt !== undefined) data.productImgAlt = s(b.productImgAlt);
  if (b.colors !== undefined) data.colors = JSON.stringify(Array.isArray(b.colors) ? b.colors : []);
  if (b.href !== undefined) data.href = s(b.href) || "/shop";
  if (b.order !== undefined) data.order = Number(b.order) || 0;
  await prisma.look.update({ where: { id }, data });
  return Response.json({ ok: true });
}

// DELETE /api/admin/looks/[id] — remove a look.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.look.delete({ where: { id } });
  return Response.json({ ok: true });
}
