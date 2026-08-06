import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { regenerateCards } from "@/lib/cards";
import { normalizeProduct, PRODUCTS_PER_PAGE } from "@/lib/products";

// Which list page (1-based) a product sits on, given the list's `order asc`.
async function pageForOrder(order: number): Promise<number> {
  const before = await prisma.product.count({ where: { order: { lt: order } } });
  return Math.floor(before / PRODUCTS_PER_PAGE) + 1;
}

// Ensure the slug is unique (append -2, -3, … if needed).
async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base || "product";
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// POST /api/admin/products — create a product, then rebuild the shop grid.
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = normalizeProduct(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const slug = await uniqueSlug(parsed.slug);
  const max = await prisma.product.aggregate({ _max: { order: true } });

  const product = await prisma.product.create({
    data: { ...parsed.data, slug, order: (max._max.order ?? -1) + 1 },
  });

  await regenerateCards();
  const page = await pageForOrder(product.order);
  return Response.json({ ok: true, id: product.id, slug, page });
}
