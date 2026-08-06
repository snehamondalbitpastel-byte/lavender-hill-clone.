"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getProduct, type ProductFull } from "@/lib/api";
import { useCart, parseRs } from "./CartProvider";
import { maxQtyFor, MAX_PER_ORDER, variantStockOf, colourSoldOutOf } from "@/lib/inventory";

// ============================================================
// PHASE 1 — STATIC product detail (Ribbed Lounge Jumper).
// Layout matches the live Prestige theme's product grid:
//   desktop ≥1000px → "gallery(0.65fr)  info(0.35fr)" with the
//   info column sticky; gallery is thumbnails(3.5rem) + main image
//   (row-reverse → thumbs left, image right). Mobile → swipe carousel.
// Phase 3 turns this into a data-driven component (props from
// /api/products/[id]).
// ============================================================

// Everything on this page is DYNAMIC per product: gallery, colours, sizes,
// title, price, rating, About, Material Matters, accordions, Key Features,
// Why You'll Love It, Styling Tips, Behind The Seams and You Might Also Like
// all come from /api/products/[id] (admin-editable). Reviews are still the
// static sample below (wired to /api/reviews in the next stage).

// Sample reviews (static demo of the Yotpo widget). Next stage wires this to the
// /api/reviews endpoint. Shape mirrors the Yotpo review card.
const REVIEW_AVG = 4.4;
const REVIEW_COUNT = 48;
const SAMPLE_REVIEWS = [
  { name: "Kathleen", rating: 3, title: "", body: "Not as loose nor as swinging as I had hoped but okay.", date: "02/06/26", up: 1, down: 0 },
  { name: "Eliza R.", rating: 2, title: "Too small", body: "This item came up very small. I liked so requested an exchange on 6 February. I'm still waiting and not happy at the delay.", date: "19/02/26", up: 12, down: 7 },
  { name: "Pamela P.", rating: 5, title: "Beautiful quality", body: "I'm delighted with my purchase — a very pretty shade and light enough in weight to complement a skirt.", date: "02/10/25", up: 3, down: 0 },
  { name: "Sarah W.", rating: 5, title: "Surprise present", body: "I bought two of these in different colours as a surprise present. She loves the comfort of the fit and the texture.", date: "18/08/25", up: 5, down: 0 },
  { name: "Helen M.", rating: 4, title: "", body: "Lovely quality but my size was a little too fitted in the waist so returned for the next size up.", date: "14/08/25", up: 2, down: 1 },
];

// One star (full / half / empty) — same glyph as ProductCard.
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
    <svg
      width="14"
      height="13"
      viewBox="0 0 14 13"
      fill="currentColor"
      aria-hidden="true"
      className={down ? "rotate-180" : ""}
    >
      <path d="M8.65 4.68h4.08c.34 0 .66.13.9.37.24.24.37.56.37.9v1.34c0 .16-.03.33-.1.48l-1.97 4.78c-.05.12-.13.22-.23.29-.11.07-.23.11-.36.11H.64a.64.64 0 0 1-.64-.64V5.96c0-.35.28-.64.64-.64h2.21c.1 0 .2-.03.29-.07.09-.05.17-.11.23-.2L6.84.13a.32.32 0 0 1 .4-.1l1.16.58c.32.16.58.43.73.76.15.33.19.7.1 1.05L8.65 4.68ZM3.82 6.33v5.35h7.1l1.81-4.39V5.96H8.65c-.2 0-.38-.05-.56-.13a1.3 1.3 0 0 1-.68-.86 1.3 1.3 0 0 1 .01-.57l.58-2.26a.32.32 0 0 0-.17-.37l-.42-.21-3 4.25c-.15.22-.36.41-.59.54ZM2.55 6.59H1.27v5.09h1.28V6.59Z" />
    </svg>
  );
}

// Collapsible accordion (accordion--lg): h6 toggle + animated-plus icon (the
// vertical bar rotates flat on expand → "+" becomes "−"). Body is `.prose`.
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="eyebrow text-espresso">{title}</span>
        <span className="relative h-3 w-3 shrink-0 text-espresso/70" aria-hidden="true">
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
          <span
            className={`absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-300 ${
              open ? "rotate-90" : ""
            }`}
          />
        </span>
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}

// A bold title + description block (prose <strong> + text) for image-with-text.
function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-1.5 font-semibold text-espresso">{title}</p>
      <p className="text-sm leading-[1.7] text-espresso/75">{desc}</p>
    </div>
  );
}

// Reveal-on-scroll image: fades in + slides from its outer edge when it enters
// the viewport (mirrors Prestige's `reveal-on-scroll` on image-with-text).
function RevealImage({
  src,
  alt,
  width,
  height,
  fromRight = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  fromRight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 699px) 100vw, 50vw"
        className={`h-auto w-full transition-all duration-[900ms] ease-out ${
          shown
            ? "translate-x-0 opacity-100"
            : `opacity-0 ${fromRight ? "translate-x-10" : "-translate-x-10"}`
        }`}
      />
    </div>
  );
}

// image-with-text section: 50/50 image | prose (content max-width 430px).
// `reverse` = image-with-text--reverse (image on the right).
function ImageWithText({
  image,
  alt,
  width,
  height,
  reverse = false,
  children,
}: {
  image: string;
  alt: string;
  width: number;
  height: number;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full">
      <div className="grid items-center sm:grid-cols-2">
        <div className={reverse ? "sm:order-2" : ""}>
          <RevealImage src={image} alt={alt} width={width} height={height} fromRight={reverse} />
        </div>
        <div className={`px-6 py-12 md:px-10 lg:px-16 ${reverse ? "sm:order-1" : ""}`}>
          <div className="mx-auto max-w-[430px] text-center sm:text-left">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function ProductDetail({ id }: { id: string }) {
  const { data: product, loading, error } = useFetch<ProductFull>(() => getProduct(id));

  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  // Remembers the quantity chosen per VARIANT (colour|size), so switching colour
  // or size restores that variant's last count (fresh variant starts at 1).
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});
  const [active, setActive] = useState(0); // active gallery index (desktop)
  const [ymal, setYmal] = useState(0); // "You Might Also Like" carousel index
  const [warn, setWarn] = useState("");
  const [loginGate, setLoginGate] = useState(false);
  const [checking, setChecking] = useState(false);
  // Back-in-stock ("Notify me when available") for an out-of-stock colour.
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyErr, setNotifyErr] = useState("");
  // The colour/size the shopper came in on (shop card → ?colour=…&size=…) so the
  // detail page opens on that variant instead of always defaulting to the first.
  const [sizeParam, setSizeParam] = useState("");
  const [colourParam, setColourParam] = useState("");
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("size");
    if (s) setSizeParam(s);
    const c = sp.get("colour");
    if (c) setColourParam(c);
  }, []);

  const cart = useCart();

  async function addToCart() {
    if (!product || checking) return;
    // Require login to add to cart — the session cookie is httpOnly, so ask the
    // server. If not signed in, show the login-required popup instead of adding.
    setChecking(true);
    const me = await fetch("/api/auth/me")
      .then((r) => r.json())
      .catch(() => ({ loggedIn: false }));
    setChecking(false);
    if (!me.loggedIn) {
      setLoginGate(true);
      return;
    }
    // Use the RESOLVED selection (a default colour/size is always pre-selected).
    const chosenColour = colour || product.colours[0]?.name || "";
    const chosenSize = size || product.sizes[0] || "";
    setWarn("");
    const col = product.colours.find((c) => c.name === chosenColour);
    cart.add({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      colour: chosenColour,
      size: chosenSize,
      image: col?.image || product.image,
      price: parseRs(product.price),
      compareAt: product.compareAtPrice ? parseRs(product.compareAtPrice) : null,
      badge: product.badge,
      stock: variantStockOf(col, chosenSize), // the SELECTED (colour, size) variant's stock
      qty,
    });
  }

  // Reset selections + gallery when the product changes. Default the size to the
  // one the shopper filtered by (?size=…) if this product offers it; otherwise no
  // pre-pick, which falls back to the first size.
  useEffect(() => {
    // Pre-select the colour passed in ?colour= (if the product offers it), and
    // jump the gallery to that colour's first image (mirrors the gallery build).
    const hasColour = !!colourParam && !!product?.colours.some((x) => x.name === colourParam);
    setColour(hasColour ? colourParam : "");
    if (hasColour && product) {
      let idx = 0;
      for (const cc of product.colours) {
        if (cc.name === colourParam) break;
        idx += (cc.image ? 1 : 0) + (cc.hover && cc.hover !== cc.image ? 1 : 0);
      }
      setActive(idx);
    } else {
      setActive(0);
    }
    setSize(sizeParam && product?.sizes.includes(sizeParam) ? sizeParam : "");
    setQty(1);
    setQtyByVariant({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, sizeParam, colourParam]);

  // When the cart is emptied (every item removed), reset the quantity selectors
  // back to the default (1 per variant) so the product page starts fresh.
  useEffect(() => {
    if (cart.items.length === 0) {
      setQty(1);
      setQtyByVariant({});
    }
  }, [cart.items.length]);

  if (loading) {
    return <div className="py-40 text-center text-sm text-espresso/50">Loading…</div>;
  }
  if (error || !product) {
    return (
      <div className="py-40 text-center">
        <p className="mb-2 text-lg">Product not found</p>
        <a href="/shop" className="link-underline-anim text-sm text-espresso/70">
          Back to shop
        </a>
      </div>
    );
  }

  // Gallery = every colour's image (+ hover), falling back to the product image.
  const gallery: { url: string; colour: string }[] = [];
  for (const c of product.colours) {
    if (c.image) gallery.push({ url: c.image, colour: c.name });
    if (c.hover && c.hover !== c.image) gallery.push({ url: c.hover, colour: c.name });
  }
  if (gallery.length === 0) {
    if (product.image) gallery.push({ url: product.image, colour: "" });
    if (product.hover && product.hover !== product.image)
      gallery.push({ url: product.hover, colour: "" });
  }

  const selColour = colour || product.colours[0]?.name || "";
  const selSize = size || product.sizes[0] || "";
  const main = gallery[active] ?? gallery[0];
  const c = product.content; // rich admin-editable sections

  // Inventory is per (colour, SIZE). Reads the SELECTED variant's stock (null =
  // untracked / unlimited), so switching colour OR size updates availability.
  // Caps the quantity stepper at min(stock, 5-per-order) and disables when sold out.
  const selColourObj = product.colours.find((x) => x.name === selColour);
  const stock = variantStockOf(selColourObj, selSize);
  // Human label for the current variant: "White / XS" (or just "White" when the
  // product has no sizes) — used in stock + back-in-stock messages.
  const variantLabel = [selColour, product.sizes.length ? selSize : ""].filter(Boolean).join(" / ");
  const outOfStock = stock != null && stock <= 0;
  const lowStock = stock != null && stock > 0 && stock <= 10;
  const maxQty = maxQtyFor(stock); // min(stock, MAX_PER_ORDER)
  const atMax = qty >= maxQty;

  // Restore a variant's remembered quantity (fresh → 1), clamped to its own cap.
  const restoreQty = (colourName: string, sizeName: string) => {
    const s = variantStockOf(product?.colours.find((x) => x.name === colourName), sizeName);
    const remembered = qtyByVariant[`${colourName}|${sizeName}`] ?? 1;
    setQty(Math.max(1, Math.min(remembered, Math.max(1, maxQtyFor(s)))));
  };
  const resetNotify = () => {
    setNotifyOpen(false);
    setNotifyDone(false);
    setNotifyErr("");
  };

  function pickColour(name: string) {
    setColour(name);
    const idx = gallery.findIndex((g) => g.colour === name);
    if (idx >= 0) setActive(idx);
    restoreQty(name, selSize);
    resetNotify(); // the back-in-stock form is variant-specific
  }

  function pickSize(sz: string) {
    setSize(sz);
    restoreQty(selColour, sz);
    resetNotify();
  }

  // Change the quantity AND remember it for the current variant.
  function changeQty(next: number) {
    const v = Math.max(1, Math.min(next, maxQty));
    setQty(v);
    setQtyByVariant((m) => ({ ...m, [`${selColour}|${selSize}`]: v }));
  }

  // Subscribe to a back-in-stock alert for the selected (out-of-stock) variant.
  async function submitNotify() {
    if (notifyBusy) return;
    setNotifyErr("");
    setNotifyBusy(true);
    const res = await fetch("/api/stock-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id, colour: selColour, size: selSize, email: notifyEmail.trim() }),
    }).catch(() => null);
    setNotifyBusy(false);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res && res.ok) setNotifyDone(true);
    else setNotifyErr((data as { error?: string }).error || "Could not subscribe. Please try again.");
  }

  return (
    <div>
      {/* ===== Product grid: gallery (0.65fr) + info (0.35fr) ===== */}
      <section className="w-full px-6 md:px-12 lg:px-14 pt-6 md:pt-10 pb-14 md:pb-20">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)] lg:gap-x-14 xl:gap-x-20 lg:items-start">
          {/* ================= LEFT col, row 1 — Gallery ================= */}
          <div className="lg:col-start-1 lg:row-start-1">
            {/* Mobile: swipe carousel */}
            <div className="md:hidden -mx-6">
              <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory no-scrollbar px-6">
                {gallery.map((g, i) => (
                  <div
                    key={`${g.url}-${i}`}
                    className="relative aspect-[2/3] w-[82%] shrink-0 snap-center overflow-hidden bg-beige"
                  >
                    <Image src={g.url} alt="" fill sizes="82vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: thumbnail strip (left) + main image (right) */}
            <div className="hidden md:flex md:gap-6">
              <div className="flex w-14 shrink-0 flex-col gap-2 max-h-[45rem] overflow-y-auto no-scrollbar">
                {gallery.map((g, i) => (
                  <button
                    key={`${g.url}-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active}
                    aria-label={`Go to item ${i + 1}`}
                    className={`relative aspect-[2/3] w-14 shrink-0 overflow-hidden border transition-colors ${
                      i === active ? "border-espresso" : "border-transparent hover:border-line"
                    }`}
                  >
                    <Image src={g.url} alt="" fill sizes="56px" className="object-cover" />
                  </button>
                ))}
              </div>

              <div className="relative flex-1 aspect-[2/3] overflow-hidden bg-beige">
                {main && (
                  <Image
                    key={main.url}
                    src={main.url}
                    alt={product.title}
                    fill
                    priority
                    sizes="(max-width: 1000px) 100vw, 55vw"
                    className="object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ============ RIGHT col (spans both rows) — Product info ============ */}
          <div className="mt-10 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start">
            <h1 className="text-xl md:text-2xl">{product.title}</h1>

            {/* rating (left) + price (right) */}
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" title={`${product.reviews} reviews`}>
                <Stars rating={product.rating} />
                <span className="text-xs text-espresso/50">({product.reviews})</span>
              </span>
              <p className="text-base uppercase tracking-[0.05em] text-espresso/55 [font-family:var(--font-heading)]">
                {product.compareAtPrice && product.saveBadge ? (
                  <>
                    <s className="mr-2 text-espresso/35">{product.compareAtPrice}</s>
                    <span className="text-plum">{product.price}</span>
                  </>
                ) : (
                  product.price
                )}
              </p>
            </div>

            {/* Badges — on-sale (plum) and/or promo (taupe), exactly like the card */}
            {(product.saveBadge || product.badge) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {product.saveBadge && (
                  <span className="badge-lh badge-lh--sale">{product.saveBadge}</span>
                )}
                {product.badge && <span className="badge-lh">{product.badge}</span>}
              </div>
            )}

            {/* Colour */}
            {product.colours.length > 0 && (
              <div className="mt-8">
                <p className="text-sm mb-3">
                  <span className="text-espresso/60">Colour:</span> <span>{selColour}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.colours.map((c) => {
                    // Colour sold out = EVERY offered size is tracked and 0. Show a
                    // diagonal slash on the swatch so shoppers see it's unavailable
                    // BEFORE selecting it.
                    const soldOut = colourSoldOutOf(c, product.sizes);
                    return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickColour(c.name)}
                      aria-label={soldOut ? `${c.name} (out of stock)` : c.name}
                      aria-pressed={selColour === c.name}
                      title={soldOut ? `${c.name} — out of stock` : c.name}
                      className={`relative h-8 w-8 rounded-full border transition-shadow ${
                        selColour === c.name
                          ? "ring-2 ring-espresso ring-offset-2 ring-offset-cream border-transparent"
                          : "border-line"
                      } ${soldOut ? "opacity-60" : ""}`}
                      style={{ background: c.hex }}
                    >
                      {soldOut && (
                        <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                          {/* Two stacked lines (light halo under a dark stroke) so the
                              slash stays visible on any swatch colour. */}
                          <svg viewBox="0 0 32 32" className="h-full w-full">
                            <line x1="6" y1="26" x2="26" y2="6" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                            <line x1="6" y1="26" x2="26" y2="6" stroke="#3f3a36" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {product.sizes.length > 0 && (
              <div className="mt-6">
                <p className="text-sm mb-3 text-espresso/60">Size:</p>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((s) => {
                    // Sold out for the SELECTED colour at this size → slash the box so
                    // the shopper sees which size is unavailable (still selectable to
                    // reveal the "notify me" option).
                    const sv = variantStockOf(selColourObj, s);
                    const sizeSoldOut = sv != null && sv <= 0;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSize(s)}
                        aria-pressed={selSize === s}
                        aria-label={sizeSoldOut ? `${s} (out of stock)` : s}
                        title={sizeSoldOut ? `${s} — out of stock in ${selColour}` : s}
                        className={`relative min-w-[3.25rem] overflow-hidden border px-3 py-2.5 text-sm transition-colors ${
                          selSize === s
                            ? "border-espresso bg-espresso text-cream"
                            : sizeSoldOut
                              ? "border-line text-espresso/40 hover:border-espresso"
                              : "border-line text-espresso hover:border-espresso"
                        }`}
                      >
                        {s}
                        {sizeSoldOut && (
                          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                              <line x1="8" y1="92" x2="92" y2="8" stroke="#ffffff" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                              <line x1="8" y1="92" x2="92" y2="8" stroke="#b23a3a" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6 inline-flex items-center border border-line">
              <button
                type="button"
                onClick={() => changeQty(qty - 1)}
                aria-label="Decrease quantity"
                disabled={outOfStock}
                className="px-4 py-3 text-espresso/70 hover:text-espresso disabled:opacity-40"
              >
                −
              </button>
              <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => changeQty(qty + 1)}
                aria-label="Increase quantity"
                disabled={outOfStock || atMax}
                className="px-4 py-3 text-espresso/70 hover:text-espresso disabled:opacity-40"
              >
                +
              </button>
            </div>

            {/* Stock status — real PER-(colour, size) inventory, admin-controlled.
                Shows the selected variant's remaining units, else the per-order cap. */}
            {outOfStock ? (
              <p className="mt-2 text-sm font-medium text-[#b23a3a]">Out of stock in {variantLabel}</p>
            ) : lowStock ? (
              <p className="mt-2 text-sm text-[#b23a3a]">Only {stock} left in {variantLabel}</p>
            ) : atMax ? (
              <p className="mt-2 text-sm text-espresso/55">Up to {MAX_PER_ORDER} per order.</p>
            ) : null}

            {/* Back-in-stock — shown ABOVE the disabled Out-of-stock button so a
                shopper can ask to be emailed when this variant returns. */}
            {outOfStock && (
              <div className="mt-6">
                {notifyDone ? (
                  <p className="rounded-md border border-line bg-[#faf9f7] px-4 py-3 text-sm text-espresso/75">
                    ✓ We&apos;ll email you when <b className="text-espresso">{variantLabel}</b> is back in stock.
                  </p>
                ) : notifyOpen ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="Your email"
                        className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-sm text-espresso outline-none focus:border-espresso"
                      />
                      <button
                        type="button"
                        onClick={submitNotify}
                        disabled={notifyBusy}
                        className="btn-lh btn-lh--taupe shrink-0 justify-center px-5 disabled:opacity-60"
                      >
                        {notifyBusy ? "…" : "Notify me"}
                      </button>
                    </div>
                    {notifyErr && <p className="text-sm text-[#b23a3a]">{notifyErr}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotifyOpen(true)}
                    className="btn-lh btn-lh--taupe w-full justify-center"
                  >
                    Notify me when available
                  </button>
                )}
              </div>
            )}

            {/* Add to cart */}
            <button
              type="button"
              onClick={addToCart}
              disabled={outOfStock}
              className="btn-lh btn-lh--taupe mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {outOfStock ? "Out of stock" : "Add to cart"}
            </button>
            {warn && <p className="mt-2 text-sm text-[#b23a3a]">{warn}</p>}

            {/* Login required to add to cart (guest) */}
            {loginGate && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-espresso/40" onClick={() => setLoginGate(false)} />
                <div className="relative z-[1] w-full max-w-sm rounded-xl border border-line bg-cream p-6 text-center shadow-soft-lg">
                  <h3 className="text-lg text-espresso">Please sign in</h3>
                  <p className="mt-2 text-sm text-espresso/70">
                    You need to be signed in to add items to your cart.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLoginGate(false)}
                      className="px-4 py-2 text-sm text-espresso/60 hover:text-espresso"
                    >
                      Cancel
                    </button>
                    <a
                      href={`/authentication/login?redirect=${encodeURIComponent(`/products/${id}`)}`}
                      className="btn-lh"
                    >
                      Sign in
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* About this product */}
            <div className="mt-10">
              <h2 className="text-lg md:text-xl text-espresso mb-4">About this product</h2>
              <div className="space-y-4 text-sm leading-[1.75] text-espresso/95">
                {product.description
                  .split(/\n+/)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            </div>

            {/* Material Matters — .feature-badge-list (dynamic, hidden if empty) */}
            {c.materialMatters.length > 0 && (
              <div className="mt-10">
                <h4 className="text-lg mb-4 [overflow-wrap:anywhere]">Material Matters</h4>
                <ul className="flex flex-wrap gap-2">
                  {c.materialMatters.map((m, i) => (
                    <li
                      key={i}
                      className="inline-flex items-center gap-2 border px-2 py-1.5 text-[0.8125rem]"
                      style={{ borderColor: "#e9e9e9", color: "#6b6b6b", backgroundColor: "#fff" }}
                    >
                      {m.icon && (
                        <Image
                          src={m.icon}
                          alt=""
                          width={32}
                          height={32}
                          sizes="32px"
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                      )}
                      <span>{m.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ============ LEFT col, row 2 — accordions + You Might Also Like ============ */}
          <div className="mt-12 lg:mt-14 lg:col-start-1 lg:row-start-2">
            {/* Accordions — Fabric & Care / Size Guide / Shipping… (dynamic) */}
            {c.accordions.length > 0 && (
              <div className="border-t border-line">
                {c.accordions.map((a, i) => (
                  <Accordion key={i} title={a.title}>
                    <div className="space-y-3 text-sm leading-[1.7] text-espresso/75">
                      {a.body
                        .split(/\n+/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, j) => (
                          <p key={j}>{line}</p>
                        ))}
                    </div>
                  </Accordion>
                ))}
              </div>
            )}

            {/* You Might Also Like — auto same-category, one card at a time */}
            {product.related.length > 0 && (
              <div className="mx-auto mt-14 max-w-[40rem]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h3 className="text-base">You Might Also Like</h3>
                  {product.related.length > 1 && (
                    <div className="flex gap-1.5" role="tablist" aria-label="Slides">
                      {product.related.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setYmal(i)}
                          aria-current={i === ymal}
                          aria-label={`Go to item ${i + 1}`}
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            i === ymal ? "bg-espresso" : "bg-espresso/25 hover:bg-espresso/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {(() => {
                  const p = product.related[Math.min(ymal, product.related.length - 1)];
                  return (
                    <div className="flex items-center gap-5">
                      <a
                        href={`/products/${p.slug}`}
                        className="relative aspect-[2/3] w-[100px] shrink-0 overflow-hidden bg-beige"
                        aria-label={p.title}
                      >
                        <Image src={p.image} alt={p.title} fill sizes="100px" className="object-cover" />
                      </a>
                      <div className="min-w-0 flex-1">
                        <a href={`/products/${p.slug}`} className="text-sm hover:text-taupe transition-colors">
                          {p.title}
                        </a>
                        <p className="mt-1.5 text-sm text-espresso/55">
                          {p.saveBadge && p.compareAt ? (
                            <>
                              <span className="text-plum">{p.price}</span>{" "}
                              <s className="line-through">{p.compareAt}</s>
                            </>
                          ) : (
                            p.price
                          )}
                        </p>
                      </div>
                      <a
                        href={`/products/${p.slug}`}
                        className="btn-lh shrink-0 px-4 py-2.5 text-[0.7rem]"
                      >
                        Add to cart
                      </a>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Key Features — rich-text heading + intro (dynamic) ===== */}
      {c.keyFeatures.intro && (
        <section className="w-full border-t border-line py-16 md:py-20">
          <div className="mx-auto max-w-[61.25rem] px-6 text-center">
            <p className="mb-5 text-3xl md:text-4xl">Key Features</p>
            <p className="mx-auto max-w-[42.5rem] text-sm leading-[1.7] text-espresso/75">
              {c.keyFeatures.intro}
            </p>
          </div>
        </section>
      )}

      {/* image-with-text 1 — image left · key-feature items */}
      {c.keyFeatures.image && c.keyFeatures.items.length > 0 && (
        <ImageWithText image={c.keyFeatures.image} alt="" width={1080} height={1080}>
          {c.keyFeatures.items.map((it, i) => (
            <FeatureItem key={i} title={it.title} desc={it.desc} />
          ))}
        </ImageWithText>
      )}

      {/* image-with-text 2 (reverse) — Why You'll Love It · image right */}
      {c.whyYouLoveIt.image && c.whyYouLoveIt.items.length > 0 && (
        <ImageWithText image={c.whyYouLoveIt.image} alt="" width={1080} height={1080} reverse>
          <p className="mb-6 text-2xl md:text-3xl">Why You&apos;ll Love It</p>
          {c.whyYouLoveIt.items.map((it, i) => (
            <FeatureItem key={i} title={it.title} desc={it.desc} />
          ))}
        </ImageWithText>
      )}

      {/* image-with-text 3 — Styling Tips · image left */}
      {c.stylingTips.image && c.stylingTips.tips.length > 0 && (
        <ImageWithText image={c.stylingTips.image} alt="" width={1600} height={2400}>
          <p className="mb-6 text-2xl md:text-3xl">Styling Tips</p>
          <ul className="list-disc space-y-2 pl-5 text-left text-sm leading-[1.7] text-espresso/75">
            {c.stylingTips.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {c.stylingTips.closing && (
            <p className="mt-5 text-sm leading-[1.7] text-espresso/75">{c.stylingTips.closing}</p>
          )}
        </ImageWithText>
      )}

      {/* ===== Behind The Seams — media-grid (dynamic; hidden if empty) ===== */}
      {c.behindTheSeams.description && (
        <section className="w-full border-t border-line py-16 md:py-20">
          <div className="mx-auto max-w-[61.25rem] px-6">
            {/* section-header (centered) */}
            <div className="mx-auto mb-10 max-w-[42.5rem] text-center md:mb-12">
              <h2 className="mb-4 text-2xl md:text-3xl">Behind The Seams</h2>
              <p className="text-sm leading-[1.7] text-espresso/75">
                {c.behindTheSeams.description}
              </p>
            </div>

            {/* media-grid: 12 cols, video 6×2 + images 3×1 */}
            <div className="grid auto-rows-[180px] grid-cols-12 gap-4 min-[700px]:auto-rows-[290px] min-[1150px]:gap-5">
              {c.behindTheSeams.videoUrl && (
                <a
                  href="#"
                  aria-label="Behind the scenes"
                  className="group relative col-span-12 row-span-2 block overflow-hidden bg-espresso sm:col-span-6"
                >
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={c.behindTheSeams.poster || undefined}
                  >
                    <source src={c.behindTheSeams.videoUrl} type="video/mp4" />
                  </video>
                </a>
              )}

              {c.behindTheSeams.images.map((src, i) => (
                <div
                  key={i}
                  className="group relative col-span-6 overflow-hidden bg-beige sm:col-span-3"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 699px) 50vw, 315px"
                    className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Customer Reviews — Yotpo-style widget =====
          TEMP: hidden for now — these are static sample reviews and the
          /api/reviews endpoint isn't built yet. Flip `false` to `true`
          (or wire the reviews API) to show it again. */}
      {false && (
      <section className="w-full border-t border-line py-16 md:py-20">
        <div className="mx-auto max-w-[71.875rem] px-6">
          {/* headline */}
          <p className="mb-8 text-center text-xl md:text-2xl">Customer Reviews</p>

          {/* bottom-line summary + Write A Review */}
          <div className="flex flex-col items-center gap-6 border-b border-line pb-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl leading-none text-espresso">{REVIEW_AVG}</span>
              <div>
                <Stars rating={REVIEW_AVG} size={18} />
                <p className="mt-1 text-sm text-espresso/70">Based on {REVIEW_COUNT} reviews</p>
              </div>
            </div>
            <button type="button" className="btn-lh">Write A Review</button>
          </div>

          {/* filter bar: Rating · With media · Sort by */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-8 border border-[#e0ddd8] px-3 py-2 text-sm text-espresso/80"
              >
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[0.65rem] text-espresso/50">Rating</span>
                  <span>All ratings</span>
                </span>
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              <button type="button" className="flex items-center gap-2 text-sm text-espresso/80">
                <span className="h-4 w-4 rounded-full border border-espresso" />
                With media
              </button>
            </div>
            <button type="button" className="flex items-center gap-2 text-sm text-espresso/80">
              Sort by: <span className="text-espresso">Most recent</span>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          {/* review list */}
          <ul>
            {SAMPLE_REVIEWS.map((r, i) => (
              <li key={i} className="border-b border-line py-8">
                <div className="grid gap-5 md:grid-cols-[190px_1fr_170px]">
                  {/* reviewer */}
                  <div className="flex items-start gap-3">
                    <ReviewerAvatar />
                    <div className="min-w-0">
                      <p className="text-sm text-espresso">{r.name}</p>
                      <p className="mt-0.5 text-xs text-espresso/55">Verified Buyer</p>
                    </div>
                  </div>
                  {/* stars + title + body */}
                  <div>
                    <Stars rating={r.rating} size={16} />
                    {r.title && (
                      <p className="mt-2 text-sm font-semibold text-espresso">{r.title}</p>
                    )}
                    <p className="mt-2 text-sm leading-[1.7] text-espresso/80">{r.body}</p>
                  </div>
                  {/* date */}
                  <div className="md:text-right">
                    <p className="text-[0.7rem] uppercase tracking-[0.08em] text-espresso/40">
                      Published date
                    </p>
                    <p className="mt-0.5 text-sm text-espresso/70">{r.date}</p>
                  </div>
                </div>
                {/* helpful votes */}
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-espresso/70 md:pl-[190px]">
                  <span>Was this review helpful?</span>
                  <span className="flex items-center gap-1.5">
                    <Thumb />
                    <span className="text-xs tabular-nums">{r.up}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Thumb down />
                    <span className="text-xs tabular-nums">{r.down}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* pagination */}
          <nav aria-label="Reviews pagination" className="mt-10 flex justify-center gap-4 text-sm">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === 1 ? "page" : undefined}
                className={
                  n === 1
                    ? "text-espresso underline underline-offset-4"
                    : "text-espresso/60 transition-colors hover:text-espresso"
                }
              >
                {n}
              </button>
            ))}
          </nav>
        </div>
      </section>
      )}
    </div>
  );
}
