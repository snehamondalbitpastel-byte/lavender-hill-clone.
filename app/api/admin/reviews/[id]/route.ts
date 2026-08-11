import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { recomputeProductRating } from "@/lib/reviews";

// PATCH /api/admin/reviews/[id] — moderate: publish / hide a review. Hiding drops
// it from the product's average + count (recomputed) and the shop cards.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const b = await request.json().catch(() => ({}));
  const status = b.status === "hidden" ? "hidden" : b.status === "published" ? "published" : null;
  if (!status) return Response.json({ error: "Invalid status." }, { status: 400 });

  const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!review) return Response.json({ error: "Review not found." }, { status: 404 });

  await prisma.review.update({ where: { id }, data: { status } });
  await recomputeProductRating(review.productId);
  return Response.json({ ok: true });
}

// DELETE /api/admin/reviews/[id] — remove a review for good. Its votes cascade
// (ReviewVote FK). The product's rating/reviews are recomputed afterwards.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);

  const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!review) return Response.json({ error: "Review not found." }, { status: 404 });

  await prisma.review.delete({ where: { id } });
  await recomputeProductRating(review.productId);
  return Response.json({ ok: true });
}
