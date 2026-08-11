import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { slugify } from "@/lib/products";
import { normalizeSections } from "@/lib/sections";

const s = (v: unknown) => String(v ?? "").trim();

export type PageItem = { image: string; link: string; alt: string };

// Sanitise the image-card list: [{ image, link, alt }]. Drops entries with no image.
export function normalizeItems(v: unknown): PageItem[] {
  if (!Array.isArray(v)) return [];
  return v
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((it: any) => ({ image: s(it?.image), link: s(it?.link), alt: s(it?.alt) }))
    .filter((it) => it.image);
}

// GET /api/admin/pages — list all content pages (admin).
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const pages = await prisma.page.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return Response.json(pages);
}

// POST /api/admin/pages — create a page (unique slug auto-derived from title).
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = s(body.title);
  if (!title) return Response.json({ error: "A title is required." }, { status: 400 });

  const base = slugify(body.slug || title) || "page";
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.page.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const max = await prisma.page.aggregate({ _max: { order: true } });
  const page = await prisma.page.create({
    data: {
      slug,
      title,
      intro: s(body.intro),
      items: JSON.stringify(normalizeItems(body.items)),
      sections: JSON.stringify(normalizeSections(body.sections)),
      order: (max._max.order ?? -1) + 1,
      active: body.active !== false,
    },
  });
  return Response.json({ ok: true, id: page.id, slug: page.slug });
}
