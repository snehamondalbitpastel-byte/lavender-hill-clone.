"use client";

import { Fragment } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getCollectionPage, type CollectionPage } from "@/lib/api";

// Dynamic listing-page banner ("first half") — breadcrumb + heading +
// description + category links, all loaded from /api/collection-page?slug=…
//
// `categories` (optional) are the live category tags assigned to this page in
// the admin (page = slug). When present they drive the tag row, so adding /
// deleting a category reflects here instantly; otherwise we fall back to the
// page's own static links.
export default function CollectionBanner({
  slug,
  categories,
}: {
  slug: string;
  categories?: { label: string; handle: string }[];
}) {
  const { data } = useFetch<CollectionPage>(() => getCollectionPage(slug), `collection-page:${slug}`);

  // Skeleton — mirrors the real banner layout (breadcrumb + centered heading +
  // description + category-link row) so nothing jumps when data arrives.
  if (!data)
    return (
      <section className="pt-8 md:pt-10 pb-10 md:pb-14 animate-pulse">
        {/* Breadcrumb */}
        <div className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14">
          <div className="h-3 w-40 rounded bg-espresso/[0.08]" />
        </div>
        {/* Centered heading + description + links */}
        <div className="mx-auto max-w-[42.5rem] px-5 flex flex-col items-center">
          <div className="h-8 w-2/3 rounded bg-espresso/[0.08] mb-6" />
          <div className="h-3.5 w-full max-w-[34rem] rounded bg-espresso/[0.06] mb-2.5" />
          <div className="h-3.5 w-4/5 max-w-[30rem] rounded bg-espresso/[0.06]" />
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-24 rounded bg-espresso/[0.08]" />
            ))}
          </div>
        </div>
      </section>
    );

  const last = data.breadcrumbs.length - 1;
  // Category tags are fully dynamic — ONLY the categories the admin assigned to
  // this page (page = slug). No static fallback: if none are assigned, no tags.
  const links = (categories ?? []).map((c) => ({
    label: c.label,
    href: `/collections/${c.handle}`,
  }));

  return (
    <section className="pt-8 md:pt-10 pb-10 md:pb-14">
      {/* Breadcrumb — top-left */}
      <nav
        aria-label="Breadcrumb"
        className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14"
      >
        <ol className="flex gap-2 eyebrow text-espresso/50">
          {data.breadcrumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <li aria-hidden="true">/</li>}
              {i === last ? (
                <li aria-current="page" className="text-espresso/80">
                  {c.label}
                </li>
              ) : (
                <li>
                  <a
                    href={c.href}
                    className="hover:text-espresso transition-colors"
                  >
                    {c.label}
                  </a>
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </nav>

      {/* Centered prose — container--xs (42.5rem) */}
      <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
        <h1 className="text-3xl md:text-4xl mb-6">{data.title}</h1>

        <p className="text-espresso text-[15px] leading-[1.65]">
          {data.description}
        </p>

        {/* Category links (.collection-description ul) — same treatment as the
            shop banner: 0.9375rem, uppercase, .12em, currentColor, gradient
            underline (visible at rest, animates on hover). */}
        {links.length > 0 && (
          <ul className="mt-8 flex flex-wrap md:flex-nowrap justify-center gap-x-6 gap-y-3">
            {links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.href}
                  className="text-[0.875rem] uppercase tracking-[0.12em] text-espresso link-underline-anim whitespace-nowrap"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
