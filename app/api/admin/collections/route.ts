import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();

// GET /api/admin/collections — all home-page category tiles (admin manager).
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.collection.findMany({ orderBy: { order: "asc" } });
  return Response.json(items);
}

// POST /api/admin/collections — create a tile.
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!s(b.title) || !s(b.image)) {
    return Response.json({ error: "Title and image are required." }, { status: 400 });
  }
  const created = await prisma.collection.create({
    data: {
      title: s(b.title),
      href: s(b.href) || "/shop",
      image: s(b.image),
      order: Number(b.order) || 0,
    },
  });
  return Response.json({ ok: true, id: created.id });
}
