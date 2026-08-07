import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();

// GET /api/admin/looks — all "As Styled By You" looks (admin manager).
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const looks = await prisma.look.findMany({ orderBy: { order: "asc" } });
  return Response.json(looks.map((l) => ({ ...l, colors: JSON.parse(l.colors || "[]") })));
}

// POST /api/admin/looks — create a look.
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!s(b.look) || !s(b.name)) {
    return Response.json({ error: "Look image and product name are required." }, { status: 400 });
  }
  const created = await prisma.look.create({
    data: {
      look: s(b.look),
      hotspotTop: s(b.hotspotTop) || "50%",
      hotspotLeft: s(b.hotspotLeft) || "50%",
      name: s(b.name),
      price: s(b.price),
      productImg: s(b.productImg),
      productImgAlt: s(b.productImgAlt) || s(b.productImg),
      colors: JSON.stringify(Array.isArray(b.colors) ? b.colors : []),
      href: s(b.href) || "/shop",
      order: Number(b.order) || 0,
    },
  });
  return Response.json({ ok: true, id: created.id });
}
