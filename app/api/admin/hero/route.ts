import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();
const ALIGNS = ["start", "center", "end"];

// GET /api/admin/hero — every slide (incl. hidden ones) for the admin manager.
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const slides = await prisma.heroSlide.findMany({ orderBy: { order: "asc" } });
  return Response.json(slides.map((x) => ({ ...x, buttons: JSON.parse(x.buttons || "[]") })));
}

// POST /api/admin/hero — create a new slide.
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!s(b.image) || !s(b.title)) {
    return Response.json({ error: "Image and title are required." }, { status: 400 });
  }
  const created = await prisma.heroSlide.create({
    data: {
      title: s(b.title),
      bold: Boolean(b.bold),
      align: ALIGNS.includes(b.align) ? b.align : "center",
      image: s(b.image),
      position: s(b.position) || "center",
      gradient: s(b.gradient),
      overlay: s(b.overlay),
      titleSize: s(b.titleSize),
      box: s(b.box),
      buttons: JSON.stringify(Array.isArray(b.buttons) ? b.buttons : []),
      order: Number(b.order) || 0,
      active: b.active !== false,
    },
  });
  return Response.json({ ok: true, id: created.id });
}
