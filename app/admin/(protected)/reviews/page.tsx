import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { fmtReviewDate } from "@/lib/reviews";
import ReviewsManager from "@/app/components/admin/ReviewsManager";

export default async function AdminReviewsPage() {
  await requireAdmin();
  const rows = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true, slug: true } } },
  });
  const reviews = rows.map((r) => ({
    id: r.id,
    productTitle: r.product?.title ?? `Product #${r.productId}`,
    productSlug: r.product?.slug ?? "",
    author: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    verified: r.verified,
    up: r.helpfulUp,
    down: r.helpfulDown,
    date: fmtReviewDate(r.createdAt),
  }));

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Reviews</h1>
        <p className="text-sm text-espresso/55 mt-1">
          Customer product reviews. Hide keeps the row but removes it from the storefront; delete is permanent.
          Either way the product&apos;s star rating and count recompute automatically.
        </p>
      </header>
      <ReviewsManager reviews={reviews} />
    </div>
  );
}
