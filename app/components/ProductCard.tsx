"use client";

import Image from "next/image";
import { useState } from "react";
import { getProduct, type Product, type Card } from "@/lib/api";
import { useCart, parseRs } from "./CartProvider";
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
      className="flex items-center gap-1"
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

// Accepts a Product (homepage bestsellers) or a Card (shop grid, one per colour)
// — both share the fields the card renders.
export default function ProductCard({ p, sizeHint, colourHint }: { p: Product | Card; sizeHint?: string; colourHint?: string }) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const slug = "productSlug" in p ? p.productSlug : p.slug;

  // Quick-add from the card's "+" icon. Cards don't carry productId/stock, so we
  // resolve the full product, pick the card's colour + first size + qty 1, then
  // add via the login-gated requestAdd — which shows the "sign in first" prompt
  // for guests and opens the cart drawer once added.
  async function quickAdd() {
    if (busy) return;
    setBusy(true);
    try {
      const full = await getProduct(slug);
      const wantColour = colourHint || full.colours[0]?.name || "";
      const col = full.colours.find((c) => c.name === wantColour) || full.colours[0];
      const wantSize = sizeHint && full.sizes.includes(sizeHint) ? sizeHint : full.sizes[0] || "";
      await cart.requestAdd({
        productId: full.id,
        slug: full.slug,
        title: full.title,
        colour: col?.name || "",
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
  if (colourHint) params.set("colour", colourHint);
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
              {save && <span className="badge-lh badge-lh--sale">{save}</span>}
              {p.badge && <span className="badge-lh">{p.badge}</span>}
            </div>
          );
        })()}

        <a href={href} className="block relative aspect-[2/3]" aria-label={p.title}>
          <Image
            src={p.image}
            alt={p.title}
            fill
            sizes="(max-width: 700px) 50vw, 25vw"
            className="object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          <Image
            src={p.hover}
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

      {/* Info */}
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <a href={href} className="text-sm hover:text-taupe transition-colors">
          {p.title}
        </a>
        {(() => {
          const compareAt = "compareAt" in p ? p.compareAt : null;
          return (
            <p className="text-sm text-espresso/60">
              {compareAt ? (
                <>
                  <s className="text-espresso/40">{compareAt}</s>{" "}
                  <span className="text-plum">{p.price}</span>
                </>
              ) : (
                p.price
              )}
            </p>
          );
        })()}

        <div className="flex flex-wrap justify-center gap-1.5">
          {p.colors.map((c, i) => (
            <span
              key={i}
              title="Colour"
              className="w-3.5 h-3.5 rounded-full border border-line"
              style={{ background: c }}
            />
          ))}
        </div>

        <Rating rating={p.rating} reviews={p.reviews} />
      </div>
    </div>
  );
}
