"use client";

import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from "react";
import { useT } from "./LocaleProvider";

// ============================================================
// Customer Reviews widget — DYNAMIC, per product. Reads from
// GET /api/reviews (server-side filter / sort / pagination),
// posts new reviews to POST /api/reviews, and votes via
// POST /api/reviews/[id]/vote. Writing + voting require a
// signed-in customer (login gate). All persistence is in the DB.
// ============================================================

// The shape the API returns for one review.
type Review = {
  id: number;
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string; // DD/MM/YY
  media: boolean; // has photos/videos
  verified: boolean; // verified purchase
  up: number;
  down: number;
  myVote: "up" | "down" | null; // the current viewer's vote
};
type Summary = { average: number; total: number; stars: Record<string, number> };

type SortKey = "recent" | "media" | "verified" | "highest" | "lowest";
const SORT_OPTIONS: { key: SortKey; tkey: string; label: string }[] = [
  { key: "recent", tkey: "reviews.sort_recent", label: "Most recent" },
  { key: "media", tkey: "reviews.sort_media", label: "With media" },
  { key: "verified", tkey: "reviews.sort_verified", label: "Verified purchase" },
  { key: "highest", tkey: "reviews.sort_highest", label: "Highest rating" },
  { key: "lowest", tkey: "reviews.sort_lowest", label: "Lowest rating" },
];
const RATING_OPTIONS = [5, 4, 3, 2, 1];

// ---- Star glyphs -----------------------------------------------------------
// Display star (full / half / empty) — same glyph as the product header.
function Star({ variant, size = 12 }: { variant: "full" | "half" | "empty"; size?: number }) {
  return (
    <svg width={size} viewBox="0 0 12 11" aria-hidden="true" className="shrink-0">
      {variant === "empty" ? (
        <path d="M6 0v8.635L2.292 11 3.48 6.87 0 4.202l4.443-.187L6 0Zm0 0v8.635L9.708 11 8.52 6.87 12 4.202l-4.443-.187L6 0Z" fill="#3A2F22" fillOpacity="0.4" />
      ) : (
        <>
          <path d="M6 0v8.635L2.292 11 3.48 6.87 0 4.202l4.443-.187L6 0Z" fill="#3A2F22" />
          <path d="M6 0v8.635L9.708 11 8.52 6.87 12 4.202l-4.443-.187L6 0Z" fill="#3A2F22" fillOpacity={variant === "half" ? "0.4" : "1"} />
        </>
      )}
    </svg>
  );
}
function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} out of 5.0 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} variant={i < full ? "full" : i === full && half ? "half" : "empty"} size={size} />
      ))}
    </span>
  );
}
// Solid star that inherits currentColor (used in the Rating dropdown so it turns
// white on the selected blue row).
function SolidStar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z" />
    </svg>
  );
}

// Yotpo-style reviewer avatar (abstract person + verified check badge).
function ReviewerAvatar() {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 600 600" className="h-10 w-10" aria-hidden="true">
        <defs>
          <clipPath id="rv-clip">
            <circle cx="300" cy="300" r="250" />
          </clipPath>
        </defs>
        <circle cx="300" cy="300" r="280" fill="#CCD2E1" />
        <circle cx="300" cy="230" r="100" fill="#8D99B6" />
        <circle cx="300" cy="550" r="190" fill="#8D99B6" clipPath="url(#rv-clip)" />
      </svg>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-espresso">
        <svg width="9" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M4 7.22222L6.72269 10L11.5 5.5" stroke="white" strokeWidth="1.8" />
        </svg>
      </span>
    </div>
  );
}

// Thumb up/down icon (down = flipped).
function Thumb({ down = false }: { down?: boolean }) {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor" aria-hidden="true" className={down ? "rotate-180" : ""}>
      <path d="M8.65 4.68h4.08c.34 0 .66.13.9.37.24.24.37.56.37.9v1.34c0 .16-.03.33-.1.48l-1.97 4.78c-.05.12-.13.22-.23.29-.11.07-.23.11-.36.11H.64a.64.64 0 0 1-.64-.64V5.96c0-.35.28-.64.64-.64h2.21c.1 0 .2-.03.29-.07.09-.05.17-.11.23-.2L6.84.13a.32.32 0 0 1 .4-.1l1.16.58c.32.16.58.43.73.76.15.33.19.7.1 1.05L8.65 4.68ZM3.82 6.33v5.35h7.1l1.81-4.39V5.96H8.65c-.2 0-.38-.05-.56-.13a1.3 1.3 0 0 1-.68-.86 1.3 1.3 0 0 1 .01-.57l.58-2.26a.32.32 0 0 0-.17-.37l-.42-.21-3 4.25c-.15.22-.36.41-.59.54ZM2.55 6.59H1.27v5.09h1.28V6.59Z" />
    </svg>
  );
}

// Dropdown chevron (rotates when open).
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// A single dropdown option row — selected shows a blue fill + white check
// (matches the live Yotpo dropdowns).
function DropdownOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
          selected ? "bg-[#2052b6] text-white" : "text-espresso hover:bg-espresso/[0.06]"
        }`}
      >
        <span className="flex items-center gap-2">{children}</span>
        {selected && (
          <svg width="13" height="10" viewBox="0 0 12 9" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M4.666 7.115 10.795.986l.943.943L4.666 9 .424 4.758l.943-.943 3.3 3.3Z" fill="currentColor" />
          </svg>
        )}
      </button>
    </li>
  );
}

// Modal star-rating picker (outline stars fill on hover/select).
function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <svg width="34" height="34" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z"
              fill={n <= active ? "#3A2F22" : "none"}
              stroke="#3A2F22"
              strokeOpacity={n <= active ? 1 : 0.4}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: { productId: number }) {
  const { t } = useT();
  // ---- filter / sort / page state (drives the server query) ----
  const [ratingFilter, setRatingFilter] = useState<number | null>(null); // null = all ratings
  const [mediaOnly, setMediaOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // ---- server data ----
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ average: 0, total: 0, stars: {} });
  const [totalPages, setTotalPages] = useState(1);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // ---- modals ----
  const [writeOpen, setWriteOpen] = useState(false);
  const [loginGate, setLoginGate] = useState(false);

  const anyFilter = ratingFilter != null || mediaOnly || sort === "media" || sort === "verified";

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ productId: String(productId), sort, page: String(page) });
    if (ratingFilter != null) params.set("rating", String(ratingFilter));
    if (mediaOnly) params.set("media", "1");
    const res = await fetch(`/api/reviews?${params.toString()}`)
      .then((r) => r.json())
      .catch(() => null);
    if (res && !res.error) {
      setReviews(res.reviews as Review[]);
      setSummary(res.summary as Summary);
      setTotalPages(res.totalPages as number);
      setLoggedIn(!!res.loggedIn);
      if (typeof res.page === "number" && res.page !== page) setPage(res.page); // server clamped
    }
    setLoading(false);
    setHasLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, sort, ratingFilter, mediaOnly, page, reloadKey]);

  useEffect(() => {
    // Fetch on mount + whenever the filter/sort/page (or reloadKey) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
  }, [fetchReviews]);

  // ---- filter/sort handlers (any change resets to page 1) ----
  const applyRating = (n: number | null) => { setRatingFilter(n); setPage(1); setRatingOpen(false); };
  const applySort = (k: SortKey) => { setSort(k); setPage(1); setSortOpen(false); };
  const toggleMedia = () => { setMediaOnly((m) => !m); setPage(1); };
  const clearFilters = () => { setRatingFilter(null); setMediaOnly(false); setSort("recent"); setPage(1); };

  const openWrite = () => (loggedIn ? setWriteOpen(true) : setLoginGate(true));

  // Persist a helpful / not-helpful vote. Open to everyone — guests are deduped
  // server-side by an httpOnly cookie (no sign-in needed, like real review widgets).
  const vote = async (id: number, dir: "up" | "down") => {
    const r = await fetch(`/api/reviews/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: dir === "up" ? 1 : -1 }),
    }).catch(() => null);
    if (!r) return;
    if (r.status === 401) { setLoginGate(true); return; }
    const data = await r.json().catch(() => null);
    if (data && !data.error) {
      setReviews((rs) => rs.map((x) => (x.id === id ? { ...x, up: data.up, down: data.down, myVote: data.myVote } : x)));
    }
  };

  // Submit a review (login required). Returns an error string to show in the modal.
  const submitReview = useCallback(
    async (payload: { rating: number; title: string; body: string }): Promise<{ ok: boolean; error?: string }> => {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...payload }),
      }).catch(() => null);
      if (!r) return { ok: false, error: t("reviews.submit_error", "Could not submit your review. Please try again.") };
      if (r.status === 401) { setWriteOpen(false); setLoginGate(true); return { ok: false }; }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: (data as { error?: string }).error || t("reviews.submit_error", "Could not submit your review. Please try again.") };
      // Success → reset to the default view and force a refetch so the new review shows.
      setRatingFilter(null); setMediaOnly(false); setSort("recent"); setPage(1);
      setReloadKey((k) => k + 1);
      return { ok: true };
    },
    [productId, t]
  );

  const sortOpt = SORT_OPTIONS.find((o) => o.key === sort);
  const sortLabel = t(sortOpt?.tkey ?? "reviews.sort_recent", sortOpt?.label ?? "Most recent");
  const loginRedirect = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <section className="w-full border-t border-line pb-16 md:pb-20">
      <div className="mx-auto max-w-[71.875rem] px-6">
        {/* .yotpo-head — headline centered, 70px vertical margin */}
        <div className="my-17.5 flex flex-row flex-nowrap items-center justify-center">
          <p className="text-xl md:text-2xl">{t("reviews.title", "Customer Reviews")}</p>
        </div>

        {!hasLoaded ? (
          <div className="py-16 text-center text-sm text-espresso/50">{t("reviews.loading", "Loading reviews…")}</div>
        ) : summary.total === 0 ? (
          /* No reviews at all yet → invite the first one */
          <div className="py-12 text-center">
            <p className="text-lg text-espresso">{t("reviews.empty_title", "No reviews yet")}</p>
            <p className="mt-1 text-sm text-espresso/60">{t("reviews.empty_hint", "Be the first to review this product.")}</p>
            <button type="button" onClick={openWrite} className="btn-lh mt-6">{t("reviews.write", "Write A Review")}</button>
          </div>
        ) : (
          <>
            {/* .yotpo-layout-header-wrapper — summary + Write A Review, centered */}
            <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5 border-b border-line pb-10">
              <div className="flex items-center gap-4">
                <div className="text-4xl leading-none text-espresso" aria-hidden="true">{summary.average}</div>
                <div>
                  <Stars rating={summary.average} size={18} />
                  <p className="mt-1 text-sm text-espresso/70">{t("reviews.based_on", "Based on {n} reviews").replace("{n}", String(summary.total))}</p>
                </div>
                <span className="ml-4 hidden h-11 w-px self-center bg-line sm:block" aria-hidden="true" />
              </div>
              <button type="button" onClick={openWrite} className="btn-lh">{t("reviews.write", "Write A Review")}</button>
            </div>

            {/* filter bar: Rating dropdown · With media · (Clear filters) · Sort by */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Rating dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setRatingOpen((o) => !o); setSortOpen(false); }}
                    aria-expanded={ratingOpen}
                    aria-haspopup="listbox"
                    className="flex min-w-[7.5rem] items-center justify-between gap-6 border border-[#e0ddd8] px-3 py-2.5 text-sm text-espresso/80"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-espresso/60">{t("reviews.rating", "Rating")}</span>
                      {ratingFilter != null && (
                        <span className="flex items-center gap-1 text-espresso">
                          <SolidStar size={13} />
                          {ratingFilter} {ratingFilter === 1 ? t("reviews.star", "star") : t("reviews.stars", "stars")}
                        </span>
                      )}
                    </span>
                    <Chevron open={ratingOpen} />
                  </button>
                  {ratingOpen && (
                    <>
                      <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setRatingOpen(false)} className="fixed inset-0 z-10 cursor-default" />
                      <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 w-56 border border-line bg-white py-1 shadow-soft-lg">
                        <DropdownOption selected={ratingFilter == null} onClick={() => applyRating(null)}>
                          {t("reviews.all_ratings", "All ratings")}
                        </DropdownOption>
                        {RATING_OPTIONS.map((n) => (
                          <DropdownOption key={n} selected={ratingFilter === n} onClick={() => applyRating(n)}>
                            <SolidStar size={14} />
                            {n} {n === 1 ? t("reviews.star", "star") : t("reviews.stars", "stars")}
                          </DropdownOption>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {/* With media toggle */}
                <button
                  type="button"
                  onClick={toggleMedia}
                  aria-pressed={mediaOnly}
                  className="flex items-center gap-2 border border-[#e0ddd8] px-3 py-2.5 text-sm text-espresso/80"
                >
                  {t("reviews.with_media", "With media")}
                  <span className={`grid h-4 w-4 place-content-center rounded-full border border-espresso ${mediaOnly ? "bg-espresso" : ""}`}>
                    {mediaOnly && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-5">
                {anyFilter && (
                  <button type="button" onClick={clearFilters} className="text-sm text-espresso/70 underline underline-offset-4 transition-colors hover:text-espresso">
                    {t("reviews.clear_filters", "Clear filters")}
                  </button>
                )}
                {/* Sort by dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setSortOpen((o) => !o); setRatingOpen(false); }}
                    aria-expanded={sortOpen}
                    aria-haspopup="listbox"
                    className="flex items-center gap-2 text-sm text-espresso/80"
                  >
                    {t("reviews.sort_by", "Sort by:")} <span className="text-espresso">{sortLabel}</span>
                    <Chevron open={sortOpen} />
                  </button>
                  {sortOpen && (
                    <>
                      <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setSortOpen(false)} className="fixed inset-0 z-10 cursor-default" />
                      <ul role="listbox" className="absolute right-0 top-full z-20 mt-1 w-52 border border-line bg-white py-1 shadow-soft-lg">
                        {SORT_OPTIONS.map((o) => (
                          <DropdownOption key={o.key} selected={sort === o.key} onClick={() => applySort(o.key)}>
                            {t(o.tkey, o.label)}
                          </DropdownOption>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* review list OR "no matching" empty state */}
            {reviews.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg text-espresso">{t("reviews.none_title", "No matching reviews")}</p>
                <p className="mt-1 text-sm text-espresso/60">{t("reviews.none_hint", "Try clearing or changing the filters")}</p>
                <button type="button" onClick={clearFilters} className="btn-lh mt-6">{t("reviews.clear_filters", "Clear filters")}</button>
              </div>
            ) : (
              <ul className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-line py-8">
                    <div className="grid gap-5 md:grid-cols-[180px_1fr_200px]">
                      {/* reviewer */}
                      <div className="flex items-start gap-3">
                        <ReviewerAvatar />
                        <div className="min-w-0">
                          <p className="text-sm text-espresso">{r.name}</p>
                          {r.verified && <p className="mt-0.5 text-xs text-espresso/55">{t("reviews.verified_buyer", "Verified Buyer")}</p>}
                        </div>
                      </div>
                      {/* stars + title + body */}
                      <div>
                        <Stars rating={r.rating} size={16} />
                        {r.title && <p className="mt-2 text-sm font-semibold text-espresso">{r.title}</p>}
                        <p className="mt-2 text-sm leading-[1.7] text-espresso/80">{r.body}</p>
                      </div>
                      {/* right: date, then helpful votes UNDER it (no "Published date" label) */}
                      <div className="md:text-right">
                        <p className="text-sm text-espresso/70">{r.date}</p>
                        <div className="mt-4">
                          <p className="text-xs text-espresso/55">{t("reviews.helpful", "Was this review helpful?")}</p>
                          <div className="mt-2 flex items-center gap-4 md:justify-end">
                            <button
                              type="button"
                              onClick={() => vote(r.id, "up")}
                              aria-pressed={r.myVote === "up"}
                              aria-label="This review was helpful"
                              className={`flex items-center gap-1.5 transition-colors ${r.myVote === "up" ? "text-espresso" : "text-espresso/55 hover:text-espresso"}`}
                            >
                              <Thumb />
                              <span className="text-xs tabular-nums">{r.up}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => vote(r.id, "down")}
                              aria-pressed={r.myVote === "down"}
                              aria-label="This review was not helpful"
                              className={`flex items-center gap-1.5 transition-colors ${r.myVote === "down" ? "text-espresso" : "text-espresso/55 hover:text-espresso"}`}
                            >
                              <Thumb down />
                              <span className="text-xs tabular-nums">{r.down}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* pagination — only when there's more than one page */}
            {totalPages > 1 && (
              <nav aria-label="Reviews pagination" className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={n === page ? "text-espresso underline underline-offset-4" : "text-espresso/60 transition-colors hover:text-espresso"}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </div>

      {writeOpen && <WriteReviewModal onClose={() => setWriteOpen(false)} onSubmit={submitReview} />}

      {loginGate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-espresso/40" onClick={() => setLoginGate(false)} />
          <div className="relative z-[1] w-full max-w-sm rounded-xl border border-line bg-cream p-6 text-center shadow-soft-lg">
            <h3 className="text-lg text-espresso">{t("reviews.login_title", "Please sign in")}</h3>
            <p className="mt-2 text-sm text-espresso/70">{t("reviews.login_body", "You need to be signed in to write a review or vote.")}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setLoginGate(false)} className="px-4 py-2 text-sm text-espresso/60 hover:text-espresso">{t("reviews.modal_cancel", "Cancel")}</button>
              <a href={`/authentication/login?redirect=${encodeURIComponent(loginRedirect)}`} className="btn-lh">{t("reviews.login_cta", "Sign in")}</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---- Write A Review modal ("SHARE YOUR THOUGHTS") --------------------------
function WriteReviewModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: { rating: number; title: string; body: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { t } = useT();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<string[]>([]); // selected media names (preview only — upload deferred)
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!rating) { setErr(t("reviews.modal_err_rate", "Please rate your experience.")); return; }
    if (!title.trim()) { setErr(t("reviews.modal_err_headline", "Please add a headline.")); return; }
    if (!body.trim()) { setErr(t("reviews.modal_err_body", "Please write your review.")); return; }
    setErr("");
    setBusy(true);
    const res = await onSubmit({ rating, title: title.trim(), body: body.trim() });
    setBusy(false);
    if (res.ok) onClose();
    else if (res.error) setErr(res.error);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Write a review">
      <div className="absolute inset-0 bg-espresso/40" onClick={onClose} />
      <div className="relative z-[1] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-cream p-6 shadow-soft-lg md:p-8">
        <div className="mb-1 flex items-start justify-between gap-4">
          <h3 className="text-lg text-espresso md:text-xl">{t("reviews.modal_title", "Share your thoughts")}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 p-1 text-xl leading-none text-espresso/50 hover:text-espresso">
            ✕
          </button>
        </div>
        <p className="mb-6 text-xs text-espresso/50">{t("reviews.modal_required", "* required fields")}</p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-espresso">{t("reviews.modal_rate", "Rate your experience")} <span className="text-espresso/50">*</span></label>
            <RatingPicker value={rating} onChange={(n) => { setRating(n); setErr(""); }} />
          </div>

          <div>
            <label htmlFor="rv-title" className="mb-2 block text-sm text-espresso">{t("reviews.modal_headline", "Add a headline")} <span className="text-espresso/50">*</span></label>
            <input
              id="rv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reviews.modal_headline_ph", "Summarize your experience")}
              className="w-full border border-line bg-white px-3 py-2.5 text-sm text-espresso outline-none placeholder:text-espresso/40 focus:border-espresso"
            />
          </div>

          <div>
            <label htmlFor="rv-body" className="mb-2 block text-sm text-espresso">{t("reviews.modal_write", "Write a review")} <span className="text-espresso/50">*</span></label>
            <textarea
              id="rv-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("reviews.modal_write_ph", "Tell us what you like or dislike")}
              className="w-full resize-none border border-line bg-white px-3 py-2.5 text-sm text-espresso outline-none placeholder:text-espresso/40 focus:border-espresso"
            />
          </div>

          <div>
            <p className="text-sm text-espresso">{t("reviews.modal_add_media", "Add media")} <span className="text-espresso/50">{t("reviews.modal_optional", "(Optional)")}</span></p>
            <p className="mt-1 text-xs text-espresso/55">{t("reviews.modal_media_hint", "Upload up to 10 images and 3 videos (max. file size 2 GB)")}</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border border-line bg-white px-4 py-2.5 text-sm text-espresso/80 transition-colors hover:border-espresso">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 10.5V2M8 2 4.5 5.5M8 2l3.5 3.5M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("reviews.modal_upload", "Upload")}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
              />
            </label>
            {files.length > 0 && (
              <p className="mt-2 text-xs text-espresso/60">{t("reviews.modal_files", "{n} files selected").replace("{n}", String(files.length))}</p>
            )}
          </div>

          {err && <p className="text-sm text-[#b23a3a]">{err}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-espresso/60 transition-colors hover:text-espresso">{t("reviews.modal_cancel", "Cancel")}</button>
            <button type="submit" disabled={busy} className="btn-lh px-8 disabled:opacity-60">{busy ? t("reviews.modal_sending", "Sending…") : t("reviews.modal_send", "Send")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
