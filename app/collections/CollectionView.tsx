import { prisma } from "@/lib/prisma";
import { getLocale, getDictionary } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";
import ShopProducts from "@/app/components/ShopProducts";

// The ONE collection-page template. Every collection is independent (flat — no
// parent/child). Layout:
//   [banner image] → breadcrumb → heading → description → option links → grid → bottom note
// "Option links" are OTHER collections the admin chose to show here (relatedHandles);
// each links to its own /collections/<handle> page. The grid is filled by `source`.

type Col = {
  handle: string;
  label: string;
  heading: string;
  description: string;
  bottomHeading: string;
  bottomDescription: string;
  bannerImage: string;
  source: string;
};
// An option link shown under the heading. `href` is optional — when omitted it
// falls back to this collection's own flat page; sub-category pages pass an
// explicit nested href (/collections/<parent>/<sub>) and mark the active one.
type Option = { handle: string; label: string; href?: string; active?: boolean };

// Resolve a collection's chosen relatedHandles into {handle,label} options, kept
// in the admin's chosen order (dangling handles for deleted collections dropped).
export async function optionsFor(relatedHandles: string[]): Promise<Option[]> {
  if (!relatedHandles?.length) return [];
  const rows = await prisma.category.findMany({
    where: { handle: { in: relatedHandles } },
    select: { handle: true, label: true },
  });
  return relatedHandles
    .map((h) => rows.find((r) => r.handle === h))
    .filter((r): r is Option => !!r);
}

// Render the right product slice for a collection's source.
function Grid({ source, handle }: { source: string; handle: string }) {
  if (source === "all") return <ShopProducts key="all" />;
  if (source === "new") return <ShopProducts key="new" newIn />;
  if (source === "sale") return <ShopProducts key="sale" saleOnly />;
  if (source === "bestseller") return <ShopProducts key="bestseller" bestseller />;
  return <ShopProducts key={`cat:${handle}`} category={handle} />;
}

export default async function CollectionView({
  collection,
  options = [],
  breadcrumbParent,
}: {
  collection: Col;
  options?: Option[];
  // Optional extra breadcrumb level (Home / Shop / <parent> / <this>) — set on
  // sub-category pages so the parent collection shows in the trail.
  breadcrumbParent?: { label: string; href: string };
}) {
  const rawHeading = (collection.heading?.trim() ? collection.heading : collection.label) || "";
  const rawDesc = collection.description ?? "";
  const rawBottomHeading = collection.bottomHeading ?? "";
  const rawBottom = collection.bottomDescription ?? "";

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [heading, desc, bottomHeading, bottom, crumbLabel, parentCrumb] = await localizeMany(
    [rawHeading, rawDesc, rawBottomHeading, rawBottom, collection.label, breadcrumbParent?.label ?? ""],
    locale
  );
  const hasBottom = Boolean(bottom || bottomHeading);
  const optionLabels = await localizeMany(options.map((o) => o.label), locale);

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        {/* Optional banner image (admin-set, arbitrary URL → plain img) */}
        {collection.bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.bannerImage}
            alt=""
            className="h-[200px] w-full object-cover md:h-[320px]"
          />
        )}

        <section className="pt-8 md:pt-10 pb-10 md:pb-14">
          {/* Breadcrumb — Home / Shop / <collection> */}
          <nav aria-label="Breadcrumb" className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14">
            <ol className="flex gap-2 eyebrow text-espresso/50">
              <li><a href="/" className="hover:text-espresso transition-colors">{dict["breadcrumb.home"] ?? "Home"}</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="/collections/view-all-products" className="hover:text-espresso transition-colors">{dict["nav.shop"] ?? "Shop"}</a></li>
              <li aria-hidden="true">/</li>
              {breadcrumbParent && (
                <>
                  <li><a href={breadcrumbParent.href} className="hover:text-espresso transition-colors">{parentCrumb}</a></li>
                  <li aria-hidden="true">/</li>
                </>
              )}
              <li aria-current="page" className="text-espresso/80">{crumbLabel}</li>
            </ol>
          </nav>

          {/* Heading + top description */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            <h1 className="text-3xl md:text-4xl mb-6">{heading}</h1>
            {desc && (
              <p className="text-espresso text-[15px] leading-[1.65] whitespace-pre-line">{desc}</p>
            )}
          </div>

          {/* Option links — other collections the admin chose to show here. Laid
              out TWO PER ROW (matching the live theme); each opens its own page. */}
          {options.length > 0 && (
            <ul className="mx-auto mt-9 grid max-w-3xl grid-cols-1 gap-x-12 gap-y-4 px-5 sm:grid-cols-2">
              {options.map((o, i) => (
                <li key={o.handle} className="text-center">
                  <a
                    href={o.href ?? `/collections/${o.handle}`}
                    aria-current={o.active ? "page" : undefined}
                    className={`text-[0.875rem] uppercase tracking-[0.12em] link-underline-anim ${
                      o.active ? "text-espresso font-medium" : "text-espresso/85 hover:text-espresso"
                    }`}
                  >
                    {optionLabels[i]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Product grid (shop grid + filters + sort), filled by source */}
        <section className={hasBottom ? "pb-10 md:pb-14" : "pb-16 md:pb-24"}>
          <Grid source={collection.source} handle={collection.handle} />
        </section>

        {/* Optional bottom note — a divider separates it from the products, with an
            optional heading above the closing text (both admin-set). */}
        {hasBottom && (
          <section className="pb-16 md:pb-24">
            <div className="mx-auto max-w-[71.25rem] px-6 md:px-12">
              <hr className="border-t border-line mb-10 md:mb-14" />
              <div className="mx-auto max-w-[42.5rem] text-center [overflow-wrap:anywhere]">
                {bottomHeading && <h2 className="text-xl md:text-2xl mb-5">{bottomHeading}</h2>}
                {bottom && <p className="text-espresso/70 text-[15px] leading-[1.65] whitespace-pre-line">{bottom}</p>}
              </div>
            </div>
          </section>
        )}
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
