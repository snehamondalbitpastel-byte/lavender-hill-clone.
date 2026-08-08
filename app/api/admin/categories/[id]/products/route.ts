import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// PUT /api/admin/categories/[id]/products — set EXACTLY which products belong to
// this (category-source) collection, in one save. Membership is the collection's
// handle in each product's `categories` tag list (and its primary `category`).
// Products not in the list are removed from the collection; listed ones are added.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return Response.json({ error: "Not found" }, { status: 404 });
  const handle = cat.handle;

  const body = await request.json().catch(() => ({}));
  const wanted = new Set(
    (Array.isArray(body.productIds) ? body.productIds : []).map(Number).filter(Number.isFinite)
  );

  const products = await prisma.product.findMany({ select: { id: true, category: true, categories: true } });
  for (const p of products) {
    const isIn = p.category === handle || p.categories.includes(handle);
    const should = wanted.has(p.id);
    if (isIn === should) continue;
    if (should) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categories: [...new Set([...p.categories, handle])] },
      });
    } else {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          categories: p.categories.filter((h) => h !== handle),
          ...(p.category === handle ? { category: "" } : {}),
        },
      });
    }
  }

  return Response.json({ ok: true, count: wanted.size });
}
