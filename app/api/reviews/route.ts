import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import {
  REVIEWS_PER_PAGE,
  asSort,
  normalizeReview,
  displayName,
  toReviewDTO,
  recomputeProductRating,
  ANON_VOTES_COOKIE,
  parseAnonVotes,
} from "@/lib/reviews";

// GET /api/reviews?productId=&sort=&rating=&page=
// Returns the overall summary (avg, total, per-star breakdown) + ONE page of
// reviews for the current filter/sort, plus the viewer's own vote on each.
// Filtering, sorting and pagination all happen in the DB (server-side).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = Number(url.searchParams.get("productId"));
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "A valid productId is required." }, { status: 400 });
  }
  const sort = asSort(url.searchParams.get("sort"));
  const ratingParam = Number(url.searchParams.get("rating"));
  const rating = ratingParam >= 1 && ratingParam <= 5 ? Math.round(ratingParam) : null;
  const mediaOnly = url.searchParams.get("media") === "1"; // the "With media" toggle
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));

  // Overall summary — always across ALL published reviews (unfiltered).
  const [agg, grouped] = await Promise.all([
    prisma.review.aggregate({ where: { productId, status: "published" }, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({ by: ["rating"], where: { productId, status: "published" }, _count: true }),
  ]);
  const stars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) stars[g.rating] = g._count;
  const summary = { average: Math.round((agg._avg.rating ?? 0) * 10) / 10, total: agg._count, stars };

  // Filtered + sorted + paginated list (the DB does the work).
  const where: Prisma.ReviewWhereInput = { productId, status: "published" };
  if (rating != null) where.rating = rating;
  if (mediaOnly || sort === "media") where.media = { not: "[]" };
  if (sort === "verified") where.verified = true;

  const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
    sort === "highest" ? [{ rating: "desc" }, { createdAt: "desc" }]
    : sort === "lowest" ? [{ rating: "asc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];

  const filteredTotal = await prisma.review.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredTotal / REVIEWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = await prisma.review.findMany({
    where,
    orderBy,
    skip: (safePage - 1) * REVIEWS_PER_PAGE,
    take: REVIEWS_PER_PAGE,
  });

  // The current viewer's votes on these reviews (so the UI can highlight them).
  // Signed-in → from ReviewVote rows; guests → from the httpOnly anon cookie.
  const session = await getCustomerSession();
  const voteMap = new Map<number, "up" | "down">();
  if (session && rows.length) {
    const myVotes = await prisma.reviewVote.findMany({
      where: { customerId: session.customerId, reviewId: { in: rows.map((r) => r.id) } },
      select: { reviewId: true, value: true },
    });
    for (const v of myVotes) voteMap.set(v.reviewId, v.value === 1 ? "up" : "down");
  } else if (!session && rows.length) {
    const votes = parseAnonVotes((await cookies()).get(ANON_VOTES_COOKIE)?.value);
    for (const r of rows) {
      const v = votes[r.id];
      if (v === 1) voteMap.set(r.id, "up");
      else if (v === -1) voteMap.set(r.id, "down");
    }
  }

  const reviews = rows.map((r) => toReviewDTO(r, voteMap.get(r.id) ?? null));
  return Response.json({ summary, reviews, page: safePage, perPage: REVIEWS_PER_PAGE, totalPages, filteredTotal, loggedIn: !!session });
}

// POST /api/reviews — create (or replace) the current customer's review for a
// product. Login required. One review per (customer, product); re-submitting
// edits it. Recomputes the product's cached rating/reviews afterwards.
export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Please sign in to write a review." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const productId = Number((body as { productId?: unknown } | null)?.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "A valid productId is required." }, { status: 400 });
  }
  const parsed = normalizeReview(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { name: true, email: true },
  });
  if (!customer) return Response.json({ error: "Please sign in to write a review." }, { status: 401 });

  const author = displayName(customer.name, customer.email);
  const review = await prisma.review.upsert({
    where: { productId_customerId: { productId, customerId: session.customerId } },
    update: { rating: parsed.data.rating, title: parsed.data.title, body: parsed.data.body },
    create: {
      productId,
      customerId: session.customerId,
      authorName: author,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  await recomputeProductRating(productId);
  return Response.json({ review: toReviewDTO(review, null) }, { status: 201 });
}
