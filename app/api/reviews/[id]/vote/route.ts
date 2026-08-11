import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { ANON_VOTES_COOKIE, parseAnonVotes } from "@/lib/reviews";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

// POST /api/reviews/[id]/vote  body: { value: 1 | -1 }
// Toggle a "helpful" (1) / "not helpful" (-1) vote on a review. Open to EVERYONE
// (no sign-in required — like real review widgets). Signed-in shoppers get a
// ReviewVote row (one per account); guests are deduped per browser via an
// httpOnly cookie. Clicking the same side again removes the vote; the opposite
// side switches. Both paths update the same Review.helpfulUp/Down tally.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return Response.json({ error: "Invalid review." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const dir = (body as { value?: unknown }).value;
  if (dir !== 1 && dir !== -1) return Response.json({ error: "Invalid vote." }, { status: 400 });

  const review = await prisma.review.findFirst({ where: { id: reviewId, status: "published" }, select: { id: true } });
  if (!review) return Response.json({ error: "Review not found." }, { status: 404 });

  const session = await getCustomerSession();

  // ---- Guest vote — deduped per browser via an httpOnly cookie ----
  if (!session) {
    const store = await cookies();
    const votes = parseAnonVotes(store.get(ANON_VOTES_COOKIE)?.value);
    const prev = votes[reviewId];
    let upDelta = 0;
    let downDelta = 0;
    let myVote: "up" | "down" | null;
    if (prev === dir) {
      delete votes[reviewId]; // same side again → remove
      if (dir === 1) upDelta = -1; else downDelta = -1;
      myVote = null;
    } else if (prev === 1 || prev === -1) {
      votes[reviewId] = dir; // switch sides
      if (dir === 1) { upDelta = 1; downDelta = -1; } else { upDelta = -1; downDelta = 1; }
      myVote = dir === 1 ? "up" : "down";
    } else {
      votes[reviewId] = dir; // fresh vote
      if (dir === 1) upDelta = 1; else downDelta = 1;
      myVote = dir === 1 ? "up" : "down";
    }
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulUp: { increment: upDelta }, helpfulDown: { increment: downDelta } },
      select: { helpfulUp: true, helpfulDown: true },
    });
    store.set(ANON_VOTES_COOKIE, JSON.stringify(votes), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: YEAR_SECONDS,
    });
    return Response.json({ up: Math.max(0, updated.helpfulUp), down: Math.max(0, updated.helpfulDown), myVote });
  }

  // ---- Signed-in vote — one ReviewVote row per (customer, review) ----
  const customerId = session.customerId;
  const key = { reviewId_customerId: { reviewId, customerId } };
  const existing = await prisma.reviewVote.findUnique({ where: key, select: { value: true } });

  let upDelta = 0;
  let downDelta = 0;
  let myVote: "up" | "down" | null;
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (existing?.value === dir) {
    // same side clicked again → remove the vote
    ops.push(prisma.reviewVote.delete({ where: key }));
    if (dir === 1) upDelta = -1; else downDelta = -1;
    myVote = null;
  } else if (existing) {
    // switch sides
    ops.push(prisma.reviewVote.update({ where: key, data: { value: dir } }));
    if (dir === 1) { upDelta = 1; downDelta = -1; } else { upDelta = -1; downDelta = 1; }
    myVote = dir === 1 ? "up" : "down";
  } else {
    // fresh vote
    ops.push(prisma.reviewVote.create({ data: { reviewId, customerId, value: dir } }));
    if (dir === 1) upDelta = 1; else downDelta = 1;
    myVote = dir === 1 ? "up" : "down";
  }

  ops.push(
    prisma.review.update({
      where: { id: reviewId },
      data: { helpfulUp: { increment: upDelta }, helpfulDown: { increment: downDelta } },
      select: { helpfulUp: true, helpfulDown: true },
    })
  );

  const results = await prisma.$transaction(ops);
  const updated = results[results.length - 1] as { helpfulUp: number; helpfulDown: number };
  return Response.json({ up: Math.max(0, updated.helpfulUp), down: Math.max(0, updated.helpfulDown), myVote });
}
