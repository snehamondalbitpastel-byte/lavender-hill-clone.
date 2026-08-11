import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { normalizeItems } from "../route";
import { normalizeSections } from "@/lib/sections";

const s = (v: unknown) => String(v ?? "").trim();

// PUT /api/admin/pages/[id] — update a page's content.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const title = s(body.title);
  if (!title) return Response.json({ error: "A title is required." }, { status: 400 });

  await prisma.page.update({
    where: { id },
    data: {
      title,
      intro: s(body.intro),
      items: JSON.stringify(normalizeItems(body.items)),
      sections: JSON.stringify(normalizeSections(body.sections)),
      active: body.active !== false,
    },
  });
  return Response.json({ ok: true });
}

// DELETE /api/admin/pages/[id] — remove a page.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  await prisma.page.delete({ where: { id } }).catch(() => {});
  return Response.json({ ok: true });
}
