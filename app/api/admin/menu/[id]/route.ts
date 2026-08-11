import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { normalizeLocation } from "../route";

const s = (v: unknown) => String(v ?? "").trim();

// PATCH /api/admin/menu/[id] — update a column (title/href/image/caption/location/order).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const title = s(b.title);
  if (!title) return Response.json({ error: "A column title is required." }, { status: 400 });
  await prisma.menuGroup.update({
    where: { id },
    data: {
      title,
      href: s(b.href),
      location: normalizeLocation(b.location),
      image: s(b.image),
      caption: s(b.caption),
      ...(b.order != null ? { order: Number(b.order) || 0 } : {}),
    },
  });
  return Response.json({ ok: true });
}

// DELETE /api/admin/menu/[id] — remove a column (its links cascade away).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.menuLink.deleteMany({ where: { groupId: id } });
  await prisma.menuGroup.delete({ where: { id } }).catch(() => {});
  return Response.json({ ok: true });
}

// POST /api/admin/menu/[id] — add a link to this column { label, href }.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const groupId = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const label = s(b.label);
  if (!label) return Response.json({ error: "A link label is required." }, { status: 400 });
  const max = await prisma.menuLink.aggregate({ _max: { order: true }, where: { groupId } });
  const link = await prisma.menuLink.create({
    data: { label, href: s(b.href), groupId, order: (max._max.order ?? -1) + 1 },
  });
  return Response.json({ ok: true, id: link.id });
}
