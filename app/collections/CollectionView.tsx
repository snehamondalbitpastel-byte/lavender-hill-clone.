import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";
import ShopProducts from "@/app/components/ShopProducts";

// The ONE collection-page template, shared by /collections/[handle] and the
// nested /collections/[handle]/[sub]. Layout is always:
//   breadcrumb → heading → top description → sub-tabs → product grid → bottom note
// A child (sub-tab) inherits the parent's heading/description/note unless it fills
// its own — so clicking a category tab changes only the products, while a sub-tab
// that has its own copy changes the text too. The grid is filled by `source`.

type Col = {
  id: number;
  handle: string;
  label: string;
  heading: string;
  description: string;
  bottomDescription: string;
  source: string;
  children?: { id: number; handle: string; label: string }[];
};

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
  child,
}: {
  collection: Col;
  child?: Col | null;
}) {
  const active = child ?? null;
  const gridSource = active ? active.source : collection.source;
  const gridHandle = active ? active.handle : collection.handle;

  // Inheritance: a sub-tab uses its own copy when set, else the parent's.
  const rawHeading = (active?.heading?.trim() ? active.heading : collection.heading) || collection.label;
  const rawDesc = (active?.description?.trim() ? active.description : collection.description) || "";
  const rawBottom =
    (active?.bottomDescription?.trim() ? active.bottomDescription : collection.bottomDescription) || "";
  const children = collection.children ?? [];

  const locale = await getLocale();
  const [heading, desc, bottom, crumbLabel] = await localizeMany(
    [rawHeading, rawDesc, rawBottom, collection.label],
    locale
  );
  const tabLabels = await localizeMany(children.map((c) => c.label), locale);

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <section className="pt-8 md:pt-10 pb-10 md:pb-14">
          {/* Breadcrumb — Home / Shop / <collection> (stays the parent for sub-tabs) */}
          <nav aria-label="Breadcrumb" className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14">
            <ol className="flex gap-2 eyebrow text-espresso/50">
              <li><a href="/" className="hover:text-espresso transition-colors">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="/collections/view-all-products" className="hover:text-espresso transition-colors">Shop</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-espresso/80">{crumbLabel}</li>
            </ol>
          </nav>

          {/* Heading + top description */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            <h1 className="text-3xl md:text-4xl mb-6">{heading}</h1>
            {desc && (
              <p className="text-espresso text-[15px] leading-[1.65] whitespace-pre-line">{desc}</p>
            )}

            {/* Sub-tabs — the collection's children (nested URLs). Active one bold. */}
            {children.length > 0 && (
              <ul className="mt-8 flex flex-wrap md:flex-nowrap justify-center gap-x-6 gap-y-3">
                {children.map((ch, i) => {
                  const isActive = active?.handle === ch.handle;
                  return (
                    <li key={ch.id}>
                      <a
                        href={`/collections/${collection.handle}/${ch.handle}`}
                        aria-current={isActive ? "page" : undefined}
                        className={`text-[0.875rem] uppercase tracking-[0.12em] link-underline-anim whitespace-nowrap ${
                          isActive ? "text-espresso font-medium" : "text-espresso/70 hover:text-espresso"
                        }`}
                      >
                        {tabLabels[i]}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Product grid (shop grid + filters + sort), filled by source */}
        <section className={bottom ? "pb-10 md:pb-14" : "pb-16 md:pb-24"}>
          <Grid source={gridSource} handle={gridHandle} />
        </section>

        {/* Optional bottom / closing description */}
        {bottom && (
          <section className="pb-16 md:pb-24">
            <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
              <p className="text-espresso/70 text-[15px] leading-[1.65] whitespace-pre-line">{bottom}</p>
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
