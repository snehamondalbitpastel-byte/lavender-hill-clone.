import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// POST /api/admin/menu/[id]/links → add a link to a column { label, href }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const groupId = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const label = String(b.label ?? "").trim();
  const href = String(b.href ?? "").trim();
  if (!label || !href) return Response.json({ error: "A label and link are required." }, { status: 400 });
  const max = await prisma.menuLink.aggregate({ _max: { order: true }, where: { groupId } });
  const link = await prisma.menuLink.create({
    data: { label, href, order: (max._max.order ?? -1) + 1, groupId },
  });
  return Response.json({ ok: true, id: link.id });
}
