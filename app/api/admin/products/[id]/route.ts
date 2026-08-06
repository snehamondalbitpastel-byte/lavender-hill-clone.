import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { regenerateCards } from "@/lib/cards";
import { normalizeProduct, PRODUCTS_PER_PAGE } from "@/lib/products";
import { flushStockNotifications } from "@/lib/stock-notify";

async function uniqueSlug(base: string, excludeId: number): Promise<string> {
  let slug = base || "product";
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await prisma.product.findFirst({
      where: { slug, id: { not: excludeId } },
      select: { id: true },
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// PUT /api/admin/products/[id] — update, then rebuild the shop grid.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const parsed = normalizeProduct(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const slug = await uniqueSlug(parsed.slug, id);
  await prisma.product.update({ where: { id }, data: { ...parsed.data, slug } });

  // Fire back-in-stock alerts for any variant this save made available again.
  await flushStockNotifications(id, new URL(request.url).origin);

  await regenerateCards();
  // The list is ordered by `order asc` (unchanged on edit) → jump to that page.
  const before = await prisma.product.count({ where: { order: { lt: existing.order } } });
  const page = Math.floor(before / PRODUCTS_PER_PAGE) + 1;
  return Response.json({ ok: true, slug, page });
}

// DELETE /api/admin/products/[id] — remove, then rebuild the shop grid.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number((await params).id);
  await prisma.product.delete({ where: { id } }).catch(() => {});

  await regenerateCards();
  return Response.json({ ok: true });
}
