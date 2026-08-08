import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { slugify } from "@/lib/products";

// Which listing page a category shows on. Anything unexpected falls back to "shop".
const PAGES = ["shop", "new-in", "sale"] as const;
export function normalizePage(v: unknown): string {
  return (PAGES as readonly string[]).includes(String(v)) ? String(v) : "shop";
}

// How a collection's product grid is filled. Unknown → "category".
const SOURCES = ["category", "all", "new", "sale", "bestseller"] as const;
export function normalizeSource(v: unknown): string {
  return (SOURCES as readonly string[]).includes(String(v)) ? String(v) : "category";
}

// POST /api/admin/categories — create a category (optionally nested).
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  if (!label) return Response.json({ error: "A name is required." }, { status: 400 });

  const base = slugify(body.handle || label) || "category";
  let handle = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.category.findUnique({ where: { handle }, select: { id: true } })) {
    n += 1;
    handle = `${base}-${n}`;
  }

  const parentId = body.parentId ? Number(body.parentId) : null;
  const max = await prisma.category.aggregate({ _max: { order: true }, where: { parentId } });

  const cat = await prisma.category.create({
    data: {
      label,
      handle,
      parentId,
      order: (max._max.order ?? -1) + 1,
      page: normalizePage(body.page),
      source: normalizeSource(body.source),
      heading: String(body.heading ?? "").trim(),
      description: String(body.description ?? "").trim(),
      bottomDescription: String(body.bottomDescription ?? "").trim(),
    },
  });
  return Response.json({ ok: true, id: cat.id });
}
