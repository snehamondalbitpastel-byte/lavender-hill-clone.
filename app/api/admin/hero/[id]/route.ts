import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();
const ALIGNS = ["start", "center", "end"];

// PATCH /api/admin/hero/[id] — update a slide (only the fields provided).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = s(b.title);
  if (b.bold !== undefined) data.bold = Boolean(b.bold);
  if (b.align !== undefined) data.align = ALIGNS.includes(b.align) ? b.align : "center";
  if (b.image !== undefined) data.image = s(b.image);
  if (b.position !== undefined) data.position = s(b.position) || "center";
  if (b.gradient !== undefined) data.gradient = s(b.gradient);
  if (b.overlay !== undefined) data.overlay = s(b.overlay);
  if (b.titleSize !== undefined) data.titleSize = s(b.titleSize);
  if (b.box !== undefined) data.box = s(b.box);
  if (b.buttons !== undefined) data.buttons = JSON.stringify(Array.isArray(b.buttons) ? b.buttons : []);
  if (b.order !== undefined) data.order = Number(b.order) || 0;
  if (b.active !== undefined) data.active = Boolean(b.active);
  await prisma.heroSlide.update({ where: { id }, data });
  return Response.json({ ok: true });
}

// DELETE /api/admin/hero/[id] — remove a slide.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.heroSlide.delete({ where: { id } });
  return Response.json({ ok: true });
}
