import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { normalizePage, normalizeSource } from "../route";

// PUT /api/admin/categories/[id] — rename / re-parent.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  if (!label) return Response.json({ error: "A name is required." }, { status: 400 });

  let parentId = body.parentId ? Number(body.parentId) : null;
  if (parentId === id) parentId = null; // can't be its own parent

  await prisma.category.update({
    where: { id },
    data: {
      label,
      parentId,
      page: normalizePage(body.page),
      source: normalizeSource(body.source),
      heading: String(body.heading ?? "").trim(),
      description: String(body.description ?? "").trim(),
      bottomDescription: String(body.bottomDescription ?? "").trim(),
    },
  });
  return Response.json({ ok: true });
}

// DELETE /api/admin/categories/[id] — remove; its children move up one level
// (re-parented to the deleted node's own parent) rather than jumping to the top.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const target = await prisma.category.findUnique({ where: { id }, select: { parentId: true } });
  if (!target) return Response.json({ ok: true });

  await prisma.$transaction([
    prisma.category.updateMany({ where: { parentId: id }, data: { parentId: target.parentId } }),
    prisma.category.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true });
}
