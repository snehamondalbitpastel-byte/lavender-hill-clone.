import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// Shop mega-menu admin. A MenuGroup is a column (a heading); a MenuLink is a link
// under it that points to a collection (or any URL). The public /api/menu serves
// the same data to the storefront dropdown.
//   GET  /api/admin/menu → all columns + their links (ordered)
//   POST /api/admin/menu → create a column { title, href? }
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const groups = await prisma.menuGroup.findMany({
    orderBy: { order: "asc" },
    include: { links: { orderBy: { order: "asc" } } },
  });
  return Response.json(groups);
}

export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const title = String(b.title ?? "").trim();
  if (!title) return Response.json({ error: "A column title is required." }, { status: 400 });
  const max = await prisma.menuGroup.aggregate({ _max: { order: true } });
  const g = await prisma.menuGroup.create({
    data: { title, href: String(b.href ?? "").trim(), order: (max._max.order ?? -1) + 1 },
  });
  return Response.json({ ok: true, id: g.id });
}
