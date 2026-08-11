"use client";

import { useState } from "react";
import Image from "next/image";
import { useFetch } from "@/hooks/useFetch";
import { getLooks, getProduct, type Look } from "@/lib/api";

// "As Styled By You" shop-the-look carousel (/api/looks). One look per slide;
// prev/next slide the track SMOOTHLY (translateX transition, not a jump). Each
// look links to its product's detail page (set in admin). The circle buttons
// mirror the live theme: round, soft shadow, and the arrow slides on hover.

// A look with no real link (legacy "#"/empty) falls back to /shop so it never dead-ends.
const linkFor = (href: string) => (href && href !== "#" ? href : "/shop");

// Colour of a look's product + its images (loaded on demand so the swatches can
// switch the shown image like the shop cards).
type LookVariant = { name: string; hex: string; image: string; hover: string };
// Pull the product slug out of a look's link (e.g. "/products/foo?colour=Navy" → "foo").
const slugFromHref = (href: string): string | null => {
  const m = href.match(/\/products\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

export default function AsStyledByYou() {
  const { data: looks } = useFetch<Look[]>(getLooks, "looks");
  const [active, setActive] = useState(0);
  // Per-look selected colour index + lazily-fetched per-colour images.
  const [colourByLook, setColourByLook] = useState<Record<number, number>>({});
  const [variantsByLook, setVariantsByLook] = useState<Record<number, LookVariant[]>>({});

  // Pick a colour on a look: highlight it, and fetch that product's colour images
  // once so the preview image can switch to the chosen colour.
  async function pickLookColour(look: Look, i: number) {
    setColourByLook((s) => ({ ...s, [look.id]: i }));
    if (!variantsByLook[look.id]) {
      const slug = slugFromHref(look.href);
      if (!slug) return;
      try {
        const full = await getProduct(slug);
        setVariantsByLook((s) => ({
          ...s,
          [look.id]: full.colours.map((c) => ({ name: c.name, hex: c.hex, image: c.image, hover: c.hover || c.image })),
        }));
      } catch {
        /* keep the current image if the fetch fails */
      }
    }
  }

  if (!looks || looks.length === 0)
    return <section className="py-16 md:py-24 bg-cream" />;

  const n = looks.length;
  const clamped = Math.min(active, n - 1);
  const prev = () => setActive((i) => Math.max(0, i - 1));
  const next = () => setActive((i) => Math.min(n - 1, i + 1));

  // Circle button — matches .circle-button--lg (3.125rem, round, soft shadow).
  const circle =
    "group absolute top-1/2 z-10 grid h-[3.125rem] w-[3.125rem] -translate-y-1/2 place-items-center rounded-full bg-cream text-espresso shadow-[0_2px_10px_rgba(58,47,34,0.15)] transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-30";

  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="mx-auto w-full max-w-[85rem] px-5 md:px-8">
        <h2 className="text-2xl md:text-3xl text-center mb-10 md:mb-14">
          As Styled By You
        </h2>

        <div className="relative">
          {/* Prev / Next — circle buttons; arrow slides inline on hover. */}
          <button type="button" onClick={prev} disabled={clamped === 0} aria-label="Previous look" className={`${circle} -left-1 md:-left-4`}>
            <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:-translate-x-1">
              <path d="M11 1 3 9l8 8" stroke="currentColor" strokeLinecap="square" />
            </svg>
          </button>
          <button type="button" onClick={next} disabled={clamped === n - 1} aria-label="Next look" className={`${circle} -right-1 md:-right-4`}>
            <svg width="16" viewBox="0 0 16 18" fill="none" aria-hidden="true" className="transition-transform duration-150 ease-out group-hover:translate-x-1">
              <path d="m5 17 8-8-8-8" stroke="currentColor" strokeLinecap="square" />
            </svg>
          </button>

          {/* Viewport + sliding track (one look per full-width slide). */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${clamped * 100}%)` }}
            >
              {looks.map((l) => {
                const href = linkFor(l.href);
                // Selected colour + (once loaded) that colour's images.
                const ai = colourByLook[l.id] ?? 0;
                const vs = variantsByLook[l.id];
                const activeHex = (l.colors[ai] || "").toLowerCase();
                const av = vs?.find((v) => v.hex.toLowerCase() === activeHex) ?? vs?.[ai];
                const img = av?.image || l.productImg;
                const imgAlt = av?.hover || l.productImgAlt;
                return (
                  <div key={l.id} className="w-full shrink-0 px-6 md:px-16">
                    {/* Left lifestyle image is the DOMINANT element; the product
                        card on the right is compact — matches the live theme. */}
                    <div className="grid items-center gap-8 md:grid-cols-[1.35fr_1fr] md:gap-12">
                      {/* Lifestyle look with hot-spot (fills its column — large) */}
                      <div className="w-full">
                        <div className="relative aspect-square overflow-hidden bg-beige">
                          <Image src={l.look} alt="" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
                          <span className="sl-hotspot" style={{ top: l.hotspotTop, left: l.hotspotLeft }} aria-hidden="true" />
                        </div>
                      </div>

                      {/* Compact featured product card → the product's detail page */}
                      <div className="mx-auto flex w-full max-w-[19rem] flex-col items-center text-center">
                        <a href={href} className="group/card relative mb-4 block aspect-[2/3] w-full overflow-hidden bg-beige">
                          <Image key={img} src={img} alt={l.name} fill sizes="(max-width: 768px) 80vw, 22vw" className="object-cover transition-opacity duration-500 group-hover/card:opacity-0" />
                          <Image key={imgAlt} src={imgAlt} alt="" fill sizes="(max-width: 768px) 80vw, 22vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
                        </a>
                        <h3 className="mb-2 text-sm md:text-base">{l.name}</h3>
                        <p className="mb-3 text-xs uppercase tracking-[0.1em] text-espresso/60">{l.price}</p>
                        <div className="mb-5 flex flex-wrap justify-center gap-2">
                          {l.colors.map((c, i) =>
                            l.colors.length > 1 ? (
                              <button
                                key={i}
                                type="button"
                                onClick={() => pickLookColour(l, i)}
                                aria-pressed={i === ai}
                                aria-label="Colour"
                                title="Colour"
                                className={`grid place-items-center box-border h-[1.375rem] w-[1.375rem] rounded-full border transition-colors ${
                                  i === ai ? "border-espresso" : "border-line hover:border-espresso/60"
                                }`}
                              >
                                <span className="block h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                              </button>
                            ) : (
                              <span key={i} className="grid place-items-center box-border h-[1.375rem] w-[1.375rem] rounded-full border border-line">
                                <span className="block h-4 w-4 rounded-full" style={{ backgroundColor: c }} />
                              </span>
                            )
                          )}
                        </div>
                        <a href={href} className="btn-lh px-8">View product</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
