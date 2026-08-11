// ============================================================
// Reviews — shared helpers (pure-ish; DB helpers take a Prisma client).
// Validation + normalisation for submissions, the storefront DTO shape,
// pagination/sort constants, and the aggregate-recompute that keeps a
// product's cached rating/reviews (and the shop cards) in sync.
// ============================================================
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { regenerateCards } from "./cards";

// How many reviews per page (one batch). The storefront pager only appears when
// the total for the current filter exceeds this.
export const REVIEWS_PER_PAGE = 5;

export type SortKey = "recent" | "media" | "verified" | "highest" | "lowest";
export const SORT_KEYS: SortKey[] = ["recent", "media", "verified", "highest", "lowest"];
export function asSort(v: unknown): SortKey {
  return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : "recent";
}

// ---- Anonymous "helpful" votes (guests) ------------------------------------
// Logged-in shoppers get a ReviewVote row (accurate, one per account). Guests
// can still vote — real-world "Was this helpful?" doesn't force a sign-in — so
// their votes are deduped per browser via an httpOnly cookie holding a map of
// { reviewId: 1 | -1 }. Best-effort (clearing cookies allows a re-vote), exactly
// like mainstream review widgets. Both paths write the SAME Review.helpfulUp/Down
// tally, so the displayed count stays a single source of truth.
export const ANON_VOTES_COOKIE = "rv_votes";
export type AnonVotes = Record<number, 1 | -1>;

export function parseAnonVotes(raw: string | undefined): AnonVotes {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: AnonVotes = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const id = Number(k);
      if (Number.isInteger(id) && (v === 1 || v === -1)) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

// The public-safe review shape the storefront widget renders.
export type ReviewDTO = {
  id: number;
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string; // DD/MM/YY
  media: boolean; // has photos/videos
  verified: boolean;
  up: number;
  down: number;
  myVote: "up" | "down" | null; // the current viewer's vote (null if none / guest)
};

// Validate + normalise an incoming review submission (from the modal).
export type ReviewInput = { rating: number; title: string; body: string };
export function normalizeReview(input: unknown): { ok: true; data: ReviewInput } | { ok: false; error: string } {
  const b = (input ?? {}) as Record<string, unknown>;
  const rating = Math.round(Number(b.rating) || 0);
  if (rating < 1 || rating > 5) return { ok: false, error: "Please choose a rating from 1 to 5." };
  const title = String(b.title ?? "").trim();
  if (!title) return { ok: false, error: "Please add a headline." };
  if (title.length > 120) return { ok: false, error: "Headline is too long (max 120 characters)." };
  const body = String(b.body ?? "").trim();
  if (!body) return { ok: false, error: "Please write your review." };
  if (body.length > 5000) return { ok: false, error: "Review is too long (max 5000 characters)." };
  return { ok: true, data: { rating, title, body } };
}

// A display name for the review author, from the customer's name → else email.
export function displayName(name: string | null | undefined, email: string): string {
  const n = (name ?? "").trim();
  if (n) return n;
  const handle = (email.split("@")[0] || "Anonymous").trim() || "Anonymous";
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

// Format a Date as DD/MM/YY (matches the widget's date style).
export function fmtReviewDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Does a review's media JSON array hold anything? (media is deferred → "[]")
export function hasMedia(mediaJson: string): boolean {
  try {
    const a = JSON.parse(mediaJson || "[]");
    return Array.isArray(a) && a.length > 0;
  } catch {
    return false;
  }
}

// Map a review row (+ the viewer's vote) to the storefront DTO.
export function toReviewDTO(
  r: { id: number; authorName: string; rating: number; title: string; body: string; media: string; verified: boolean; helpfulUp: number; helpfulDown: number; createdAt: Date },
  myVote: "up" | "down" | null
): ReviewDTO {
  return {
    id: r.id,
    name: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    date: fmtReviewDate(r.createdAt),
    media: hasMedia(r.media),
    verified: r.verified,
    // Clamp defensively so a tally can never render negative (e.g. cookie/counter drift).
    up: Math.max(0, r.helpfulUp),
    down: Math.max(0, r.helpfulDown),
    myVote,
  };
}

// Recompute a product's cached rating (avg, 1-dp) + reviews (count) from its
// PUBLISHED reviews, then rebuild the shop cards so the header stars, shop grid,
// and search all reflect it. Same single-source + derived-cache pattern the
// store already uses for cards. Called on every review create/delete/hide.
export async function recomputeProductRating(productId: number, db: PrismaClient = defaultPrisma): Promise<void> {
  const agg = await db.review.aggregate({
    where: { productId, status: "published" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviews: agg._count },
  });
  await regenerateCards(db);
}
