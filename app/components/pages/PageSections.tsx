import Link from "next/link";
import { asText, asItems, asHandles, type PageSection, type SectionData } from "@/lib/sections";
import ScrollCarousel from "./ScrollCarousel";
import Timeline from "./Timeline";
import CollectionListCarousel from "./CollectionListCarousel";
import Reveal from "./Reveal";

// Renders a section-built content page (model Page.sections). Content blocks are
// plain server components here; interactive blocks (scroll carousel, timeline,
// live collections) are client components imported above. Switch on `type` — one
// case per SectionDef in lib/sections. Anything unknown is skipped.

// Exact theme tokens (from the live site's CSS):
//   .h2 = clamp(1.25,1.067,1.75) × 1.1 ; .h3 = clamp(1.125,1.033,1.375) × 1.1
//   section-spacing = 2.5rem (mobile) / 4rem (≥1000px) ; gutter 1.25/2/3rem.
// The theme's tablet breakpoint is 700px and its desktop breakpoint is 1000px —
// we use min-[700px]/min-[1000px] rather than Tailwind's sm/lg to match exactly.
const H2 = "text-[clamp(1.375rem,1.174rem+0.858vw,1.925rem)]";
const H3 = "text-[clamp(1.2375rem,1.137rem+0.43vw,1.5125rem)]";
const BODY = "text-espresso text-[0.9375rem] leading-[1.65]";
const SECTION = "py-10 min-[1000px]:py-16"; // section-spacing (2.5rem / 4rem)
const GUTTER = "px-5 min-[700px]:px-8 min-[1000px]:px-12"; // container gutter

function paragraphs(body: string): string[] {
  return (body || "").split("\n").map((p) => p.trim()).filter(Boolean);
}

// The theme's content pages use `button--outline` — a bordered button that fills
// on hover. `light` = for dark backgrounds (cream border/text → fills cream).
function Cta({ label, href, light = false }: { label?: string; href?: string; light?: boolean }) {
  if (!label?.trim() || !href?.trim()) return null;
  const base =
    "inline-flex items-center justify-center border px-9 py-[0.9rem] font-heading text-[0.8125rem] uppercase tracking-[0.2em] transition-colors";
  const skin = light
    ? "border-cream text-cream hover:bg-cream hover:text-espresso"
    : "border-espresso text-espresso hover:bg-espresso hover:text-cream";
  return (
    <div className="mt-7">
      <Link href={href} className={`${base} ${skin}`}>
        {label}
      </Link>
    </div>
  );
}

const RICH_WIDTH: Record<string, string> = {
  xs: "max-w-[42.5rem]",
  sm: "max-w-[61.25rem]",
  md: "max-w-[71.875rem]",
};

function RichText({ d }: { d: SectionData }) {
  const left = asText(d.align) === "left";
  const heading = asText(d.heading);
  const body = asText(d.body);
  const width = RICH_WIDTH[asText(d.width)] || RICH_WIDTH.sm;
  return (
    <section className={SECTION}>
      <div className={`mx-auto flex ${width} flex-col ${GUTTER} ${left ? "items-start text-left" : "items-center text-center"}`}>
        {heading && <h2 className={`${H2} mb-6`}>{heading}</h2>}
        {paragraphs(body).map((p, i) => (
          <p key={i} className={`${BODY} mb-3 last:mb-0`}>{p}</p>
        ))}
        <Cta label={asText(d.ctaLabel)} href={asText(d.ctaHref)} />
      </div>
    </section>
  );
}

// image_with_text — full-bleed 50/50 (no section padding, so consecutive blocks
// stack flush), image at its natural portrait ratio, prose centred on mobile and
// left-aligned from 700px, constrained by --image-with-text-content-max-width
// (100% normal / 430px "narrow" reverse). Matches the live Our Story exactly.
function ImageText({ d }: { d: SectionData }) {
  const imageRight = asText(d.layout) === "image-right";
  const narrow = asText(d.textWidth) === "narrow";
  const image = asText(d.image);
  const heading = asText(d.heading);
  return (
    <section className="bg-cream">
      <div className="grid min-[700px]:grid-cols-2 min-[700px]:items-center">
        {/* Image slides in slowly from its own edge (overflow-hidden clips the
            travel so it never causes a horizontal scrollbar). */}
        <div className={`overflow-hidden ${imageRight ? "min-[700px]:order-2" : ""}`}>
          {image && (
            <Reveal from={imageRight ? "right" : "left"} durationMs={900}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={asText(d.alt) || ""} width={800} height={1015} className="block h-auto w-full object-cover" />
            </Reveal>
          )}
        </div>
        <div
          className={`${imageRight ? "min-[700px]:order-1" : ""} px-5 py-9 text-center min-[700px]:px-[8%] min-[700px]:py-12 min-[700px]:text-start min-[1000px]:py-16`}
        >
          <Reveal className={narrow ? "mx-auto max-w-[430px] min-[700px]:mx-0" : ""}>
            {heading && <h3 className={`${H3} mb-4`}>{heading}</h3>}
            {paragraphs(asText(d.body)).map((p, i) => (
              <p key={i} className={`${BODY} mb-3 last:mb-0`}>{p}</p>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// multi_column (e.g. In The Press) — full-width (container-max-width 100%, so only
// the gutter insets it — small edge gap), 4-up grid at ≥1000px with a 4.375rem
// gap; a full-bleed snap scroll row below that (53vw mobile / 38vw tablet). Each
// item is its own grid (image → caption) with a 2rem gap; images are square.
function LogoColumns({ d }: { d: SectionData }) {
  const heading = asText(d.heading);
  const items = asItems(d.items);
  if (items.length === 0 && !heading) return null;
  return (
    <section className={`bg-cream ${SECTION}`}>
      {/* section-stack: header + grid, gap 2.25rem / 3rem */}
      <div className="flex flex-col gap-9 min-[1000px]:gap-12">
        {heading && <h2 className={`${H2} text-center ${GUTTER}`}>{heading}</h2>}
        <div className="no-scrollbar flex snap-x gap-[3.125rem] overflow-x-auto px-5 min-[700px]:px-8 min-[1000px]:grid min-[1000px]:grid-cols-4 min-[1000px]:gap-[4.375rem] min-[1000px]:overflow-visible min-[1000px]:px-12">
          {items.map((it, i) => {
            const inner = (
              <>
                <div className="overflow-hidden">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.alt || ""} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                {it.label && <h3 className={H3}>{it.label}</h3>}
              </>
            );
            // .multi-column__item — grid, align-content:start, gap 2rem.
            const cls = "group grid w-[53vw] shrink-0 snap-center content-start gap-8 min-[700px]:w-[38vw] min-[1000px]:w-auto";
            return it.href ? (
              <a key={i} href={it.href} className={cls}>{inner}</a>
            ) : (
              <div key={i} className={cls}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// image_with_text_overlay — a full-width banner image (2400×900) with a 54% black
// overlay and a centred quote on top. Section is scheme-3 (espresso bg) with
// section-spacing, so dark bands sit above/below the banner. Quote is .h4
// (uppercase Raleway); attribution is plain body text. Content max-width = md.
function QuoteImage({ d }: { d: SectionData }) {
  const image = asText(d.image);
  const quote = asText(d.quote);
  const attribution = asText(d.attribution);
  return (
    <section className={`bg-espresso ${SECTION}`}>
      <div className="relative aspect-[2400/900] min-h-[360px] w-full">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={asText(d.alt) || ""} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* --content-over-media-overlay: 0 0 0 / 0.54 */}
        <div className="absolute inset-0 bg-black/[0.54]" />
        <div className={`absolute inset-0 flex items-center justify-center ${GUTTER}`}>
          <figure className="mx-auto max-w-[71.875rem] text-center text-cream">
            {quote && (
              <p className="font-heading uppercase leading-[1.5] tracking-[0.14em] text-[clamp(1.1rem,1.05rem+0.215vw,1.2375rem)]">
                &ldquo;{quote}&rdquo;
              </p>
            )}
            {attribution && <p className="mt-5 text-[0.9375rem] leading-[1.65] text-cream/90">{attribution}</p>}
          </figure>
        </div>
      </div>
    </section>
  );
}

// media_grid (Behind The Seams) — a 12-column grid inside container--lg. The
// featured video spans 8 cols × 3 rows (no overlay); each of up to 3 cards spans
// 4 cols × 1 row with a 50% overlay and a centred .h4 link + text. Row height is
// 180px (mobile) / 290px (≥700px); gap 1.5rem → 1.875rem (≥1150px). On mobile the
// 12-col grid collapses to one column and the spans stack it vertically.
function MediaGrid({ d }: { d: SectionData }) {
  const heading = asText(d.heading);
  const video = asText(d.featuredVideo);
  const poster = asText(d.featuredImage);
  const items = asItems(d.items);
  return (
    <section className={`bg-cream ${SECTION}`}>
      <div className="mx-auto max-w-[78.75rem] px-5 min-[700px]:px-8 min-[1000px]:px-12">
        {/* section-stack */}
        <div className="flex flex-col gap-9 min-[1000px]:gap-12">
          {heading && <h2 className={`${H2} text-center`}>{heading}</h2>}
          <div className="grid grid-cols-1 auto-rows-[180px] gap-6 min-[700px]:grid-cols-12 min-[700px]:auto-rows-[290px] min-[1150px]:gap-[1.875rem]">
            {/* Featured video/image — 8 cols × 3 rows */}
            <div className="relative row-span-3 overflow-hidden min-[700px]:col-span-8">
              {video ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster={poster || undefined}>
                  <source src={video} type="video/mp4" />
                </video>
              ) : poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={asText(d.featuredAlt) || ""} className="h-full w-full object-cover" />
              ) : null}
            </div>
            {/* Cards — 4 cols × 1 row each, 50% overlay, centred content */}
            {items.slice(0, 3).map((it, i) => (
              <a key={i} href={it.href || "#"} className="group relative row-span-1 block overflow-hidden min-[700px]:col-span-4">
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.alt || ""} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-cream">
                  {it.heading && <h3 className="text-[clamp(1.1rem,1.05rem+0.215vw,1.2375rem)] leading-tight">{it.heading}</h3>}
                  {it.body && <p className="mt-2 text-[0.8125rem] leading-[1.5] text-cream/90">{it.body}</p>}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// multiple_media_with_text (Meet Our Founder) — media (1fr) beside a fixed 375px
// content column at ≥1000px (stacked below). The media is an OVERLAP collage: a
// large square photo with a portrait video overlapping it (auto-columns
// 1.75/0.8/0.8 → 1.85/0.35/1.4 at ≥700). container--md, bordered-section (top
// border), .h6 eyebrow + .h3 name + button--outline. Reveals on scroll.
function MediaText({ d }: { d: SectionData }) {
  const image = asText(d.image);
  const video = asText(d.video);
  return (
    <section className={`border-t border-line bg-cream ${SECTION}`}>
      <div className="mx-auto max-w-[71.875rem] px-5 min-[700px]:px-8 min-[1000px]:px-12">
        <Reveal className="grid gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,375px)] min-[1000px]:items-center min-[1000px]:gap-x-16 min-[1150px]:gap-x-[7.5rem]">
          {/* Overlapping media collage */}
          <div className="grid grid-cols-[1.75fr_0.8fr_0.8fr] items-center min-[700px]:grid-cols-[1.85fr_0.35fr_1.4fr]">
            {image && (
              <div className="col-[1/3] row-start-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={asText(d.alt) || ""} className="aspect-square w-full object-cover" />
              </div>
            )}
            {video && (
              <div className="col-[2/4] row-start-1 self-center">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video className="aspect-[9/16] w-full object-cover" autoPlay muted loop playsInline poster={asText(d.poster) || undefined}>
                  <source src={video} type="video/mp4" />
                </video>
              </div>
            )}
          </div>
          {/* Content */}
          <div className="self-center">
            {asText(d.eyebrow) && (
              <p className="mb-3 font-heading text-[0.825rem] uppercase tracking-[0.16em] text-espresso/60">{asText(d.eyebrow)}</p>
            )}
            {asText(d.heading) && <h3 className={`${H3} mb-4`}>{asText(d.heading)}</h3>}
            {paragraphs(asText(d.body)).map((p, i) => (
              <p key={i} className={`${BODY} mb-3 last:mb-0`}>{p}</p>
            ))}
            <Cta label={asText(d.ctaLabel)} href={asText(d.ctaHref)} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function PageSections({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((s) => {
        switch (s.type) {
          // Most sections reveal-on-scroll (fade + rise). imageText reveals its
          // own image/text internally; mediaText already wraps itself; the pinned
          // scrollCarousel must NOT be transform-wrapped (it would break sticky).
          case "richText":
            return <Reveal key={s.id}><RichText d={s.data} /></Reveal>;
          case "imageText":
            return <ImageText key={s.id} d={s.data} />;
          case "scrollCarousel":
            return <ScrollCarousel key={s.id} items={asItems(s.data.items)} />;
          case "logoColumns":
            return <Reveal key={s.id}><LogoColumns d={s.data} /></Reveal>;
          case "quoteImage":
            return <Reveal key={s.id}><QuoteImage d={s.data} /></Reveal>;
          case "mediaGrid":
            return <Reveal key={s.id}><MediaGrid d={s.data} /></Reveal>;
          case "timeline":
            return <Reveal key={s.id}><Timeline heading={asText(s.data.heading)} items={asItems(s.data.items)} /></Reveal>;
          case "mediaText":
            return <MediaText key={s.id} d={s.data} />;
          case "collectionList":
            return <Reveal key={s.id}><CollectionListCarousel heading={asText(s.data.heading)} handles={asHandles(s.data.handles)} /></Reveal>;
          default:
            return null;
        }
      })}
    </>
  );
}
