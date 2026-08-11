import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const s = (v: unknown) => String(v ?? "").trim();
const LOCATIONS = ["shop", "about"] as const;
export const normalizeLocation = (v: unknown) =>
  (LOCATIONS as readonly string[]).includes(String(v)) ? String(v) : "shop";

// Nav mega-menu admin. A MenuGroup is a column (a heading); a MenuLink is a link
// under it that points to a Page (or any URL). `location` scopes the column to a
// nav item ("shop" | "about"). The public /api/menu serves the same data.
//   GET  /api/admin/menu[?location=] → columns + their links (ordered)
//   POST /api/admin/menu             → create a column { title, location, image?, caption?, href? }
export async function GET(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const location = new URL(request.url).searchParams.get("location");
  const groups = await prisma.menuGroup.findMany({
    where: location ? { location } : undefined,
    orderBy: { order: "asc" },
    include: { links: { orderBy: { order: "asc" } } },
  });
  return Response.json(groups);
}

export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const title = s(b.title);
  if (!title) return Response.json({ error: "A column title is required." }, { status: 400 });
  const location = normalizeLocation(b.location);
  const max = await prisma.menuGroup.aggregate({ _max: { order: true }, where: { location } });
  const g = await prisma.menuGroup.create({
    data: {
      title,
      href: s(b.href),
      location,
      image: s(b.image),
      caption: s(b.caption),
      order: (max._max.order ?? -1) + 1,
    },
  });
  return Response.json({ ok: true, id: g.id });
}
