"use client";

import Image from "next/image";
import { useState } from "react";
import { getProduct, type Product, type Card } from "@/lib/api";
import { useCart, parseRs } from "./CartProvider";
import { useCurrency } from "./CurrencyProvider";
import { badgeClass } from "@/lib/badge";
import { variantStockOf } from "@/lib/inventory";

// Shared product card — used by the homepage "Bestsellers" and the shop page.

// One star. `variant`: "full" | "half" | "empty".
function Star({ variant }: { variant: "full" | "half" | "empty" }) {
  return (
    <svg width="12" viewBox="0 0 12 11" aria-hidden="true" className="shrink-0">
      {variant === "empty" ? (
        <path
          d="M6 0v8.635L2.292 11 3.48 6.87 0 4.202l4.443-.187L6 0Zm0 0v8.635L9.708 11 8.52 6.87 12 4.202l-4.443-.187L6 0Z"
          fill="#3A2F22"
          fillOpacity="0.2"
        />
      ) : (
        <>
          <path
            d="M6 0v8.635L2.292 11 3.48 6.87 0 4.202l4.443-.187L6 0Z"
            fill="#3A2F22"
          />
          <path
            d="M6 0v8.635L9.708 11 8.52 6.87 12 4.202l-4.443-.187L6 0Z"
            fill="#3A2F22"
            fillOpacity={variant === "half" ? "0.2" : "1"}
          />
        </>
      )}
    </svg>
  );
}

function Rating({ rating, reviews }: { rating: number; reviews: number }) {
  // Show the stars whenever a rating is set; only show the "(N)" count when
  // there are actually reviews. Nothing set at all → no widget.
  if (!rating && !reviews) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  return (
    <span
      className="flex flex-wrap items-center gap-2 leading-normal"
      title={reviews > 0 ? `${reviews} reviews` : `${rating} out of 5`}
    >
      <span
        className="flex gap-0.5"
        role="img"
        aria-label={`${rating} out of 5.0 stars`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            variant={i < full ? "full" : i === full && half ? "half" : "empty"}
          />
        ))}
      </span>
      {reviews > 0 && (
        <span className="text-[0.7rem] text-espresso/50">({reviews})</span>
      )}
    </span>
  );
}

// One selectable colour on the card: its swatch hex + the images to show when
// picked. Passed by the shop grid (which has every colour's card) so the swatches
// become clickable and switch the card image, exactly like the live site.
export type CardVariant = { name: string; hex: string; image: string; hover: string };

// Accepts a Product (homepage bestsellers) or a Card (shop grid, one per colour)
// — both share the fields the card renders. `variants` (optional) turns the colour
// dots into clickable swatches that switch the shown image.
export default function ProductCard({ p, sizeHint, colourHint, variants }: { p: Product | Card; sizeHint?: string; colourHint?: string; variants?: CardVariant[] }) {
  const cart = useCart();
  const { localize } = useCurrency();
  const [busy, setBusy] = useState(false);
  const slug = "productSlug" in p ? p.productSlug : p.slug;

  // Per-colour images. If the parent handed us `variants` (shop grid / bestsellers)
  // we switch instantly; otherwise (home rails, New In, search) we lazily fetch the
  // product's colours the first time a swatch is clicked, then it's instant too.
  const [fetched, setFetched] = useState<CardVariant[] | null>(null);
  const swatchVariants = variants && variants.length > 0 ? variants : fetched;
  // How many dots to show — the full colour list even before we've fetched images.
  const dotHexes = swatchVariants ? swatchVariants.map((v) => v.hex) : p.colors;
  const canSwitch = (swatchVariants?.length ?? p.colors.length) > 1;

  // Which colour is currently shown. Defaults to the filtered/hinted colour, then
  // this card's own colour, else the first — so a colour filter lands on the right
  // swatch, and switching colours swaps the image locally.
  const [activeIdx, setActiveIdx] = useState(() => {
    const list = variants && variants.length > 0 ? variants : null;
    if (!list) return 0;
    const byHint = colourHint ? list.findIndex((v) => v.name === colourHint) : -1;
    if (byHint >= 0) return byHint;
    const ownHex = "swatch" in p ? p.swatch : "";
    const byHex = ownHex ? list.findIndex((v) => v.hex === ownHex) : -1;
    return byHex >= 0 ? byHex : 0;
  });
  const activeVariant =
    swatchVariants && swatchVariants.length > 0 ? swatchVariants[Math.min(activeIdx, swatchVariants.length - 1)] : null;
  const shownImage = activeVariant?.image || p.image;
  const shownHover = activeVariant?.hover || activeVariant?.image || p.hover;
  const activeColour = activeVariant?.name ?? colourHint;

  // Pick a colour: highlight it now; if we don't yet have this card's per-colour
  // images, fetch them once so the image can switch (subsequent picks are instant).
  async function pickColour(i: number) {
    setActiveIdx(i);
    if (!swatchVariants) {
      try {
        const full = await getProduct(slug);
        setFetched(
          full.colours.map((c) => ({ name: c.name, hex: c.hex, image: c.image, hover: c.hover || c.image }))
        );
      } catch {
        /* leave the image as-is if the fetch fails */
      }
    }
  }

  // Quick-add from the card's "+" icon. Cards don't carry productId/stock, so we
  // resolve the full product, pick the card's colour + first size + qty 1, then
  // add via the login-gated requestAdd — which shows the "sign in first" prompt
  // for guests and opens the cart drawer once added.
  async function quickAdd() {
    if (busy) return;
    setBusy(true);
    try {
      const full = await getProduct(slug);
      const wantColour = activeColour || full.colours[0]?.name || "";
      const colourIndex = full.colours.findIndex((c) => c.name === wantColour);
      const col = full.colours.find((c) => c.name === wantColour) || full.colours[0];
      const wantSize = sizeHint && full.sizes.includes(sizeHint) ? sizeHint : full.sizes[0] || "";
      await cart.requestAdd({
        productId: full.id,
        slug: full.slug,
        title: full.title,
        colour: col?.name || "",
        // Stable, language-independent colour id so the line merges across languages.
        colourKey: col?.hex?.trim() || (colourIndex >= 0 ? `i${colourIndex}` : col?.name || ""),
        size: wantSize,
        image: col?.image || full.image,
        price: parseRs(full.price),
        compareAt: full.compareAtPrice ? parseRs(full.compareAtPrice) : null,
        badge: full.badge,
        stock: variantStockOf(col, wantSize),
        qty: 1,
      });
    } catch {
      /* product fetch failed — leave the cart untouched */
    } finally {
      setBusy(false);
    }
  }

  // Click-through to the product detail page (Card → productSlug, Product → slug).
  // Carry the card's own colour (each shop card is one colour) and any filtered
  // size so the detail page opens on that colour/size instead of the first.
  const base = `/products/${slug}`;
  const params = new URLSearchParams();
  if (activeColour) params.set("colour", activeColour);
  if (sizeHint) params.set("size", sizeHint);
  const qs = params.toString();
  const href = qs ? `${base}?${qs}` : base;
  return (
    <div className="group">
      <div className="relative overflow-hidden bg-cream">
        {/* .badge-list--vertical: on-sale badge (plum, .badge--on-sale) and/or the
            promo badge (taupe, .badge--custom). See globals.css. */}
        {(() => {
          const save = "saveBadge" in p ? p.saveBadge : null;
          if (!save && !p.badge) return null;
          return (
            <div className="badge-list-lh">
              {save && <span className={badgeClass(save)}>{localize(save)}</span>}
              {p.badge && <span className={badgeClass(p.badge)}>{p.badge}</span>}
            </div>
          );
        })()}

        <a href={href} className="block relative aspect-[2/3]" aria-label={p.title}>
          <Image
            key={shownImage}
            src={shownImage}
            alt={p.title}
            fill
            sizes="(max-width: 700px) 50vw, 25vw"
            className="object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          <Image
            key={shownHover}
            src={shownHover}
            alt=""
            fill
            sizes="(max-width: 700px) 50vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </a>

        {/* Quick-add — square button (matches .product-card__quick-add-button:
           cream bg, espresso icon, 0.625rem padding, 0.5rem from the edges,
           no border-radius). Fades in on hover. */}
        <button
          type="button"
          onClick={quickAdd}
          disabled={busy}
          aria-label="Add to cart"
          className="absolute bottom-2 right-2 z-[1] p-2.5 bg-cream text-espresso flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-espresso hover:text-cream disabled:cursor-wait"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* Info — .product-card__info: centered, gap .75rem (grid on the live site;
          flex-col centred is visually identical for this single centred column). */}
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        {/* Card title = the live theme's heading style: Raleway 300, UPPERCASE,
            .18em tracking, h6 size — matches .card__heading on the real site. */}
        <a
          href={href}
          className="font-heading font-light uppercase tracking-[0.18em] text-[0.825rem] leading-[1.7] [hyphens:none] hover:text-taupe transition-colors"
        >
          {p.title}
        </a>
        {(() => {
          const compareAt = "compareAt" in p ? p.compareAt : null;
          return (
            <p className="text-sm text-espresso/60">
              {compareAt ? (
                <>
                  <s className="text-espresso/40">{localize(compareAt)}</s>{" "}
                  <span className="text-plum">{localize(p.price)}</span>
                </>
              ) : (
                localize(p.price)
              )}
            </p>
          );
        })()}

        {/* Colour swatches — CLICKABLE on every card: picking one switches the shown
            image to that colour (fetched on first click if not already loaded) and
            marks it selected (larger, with a ring), exactly like the live site.
            A single-colour product just shows one plain dot. */}
        <div className="flex flex-wrap justify-center gap-2">
          {canSwitch
            ? dotHexes.map((hex, i) => {
                const selected = i === activeIdx;
                const name = swatchVariants?.[i]?.name;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickColour(i)}
                    aria-label={name || "Colour"}
                    aria-pressed={selected}
                    title={name || "Colour"}
                    className={`color-swatch-lh${selected ? " is-selected" : ""}`}
                    style={{ ["--swatch-bg"]: `linear-gradient(${hex}, ${hex})` } as React.CSSProperties}
                  />
                );
              })
            : dotHexes.map((hex, i) => (
                <span
                  key={i}
                  title="Colour"
                  className="color-swatch-lh"
                  style={{ ["--swatch-bg"]: `linear-gradient(${hex}, ${hex})` } as React.CSSProperties}
                />
              ))}
        </div>

        <Rating rating={p.rating} reviews={p.reviews} />
      </div>
    </div>
  );
}
