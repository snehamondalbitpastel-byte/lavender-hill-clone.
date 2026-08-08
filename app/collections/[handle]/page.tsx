import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";
import ShopProducts from "@/app/components/ShopProducts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const cat = await prisma.category.findUnique({ where: { handle } });
  return {
    title: cat ? `${cat.heading || cat.label} | Lavender Hill` : "Shop | Lavender Hill",
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const category = await prisma.category.findUnique({
    where: { handle },
    include: { children: { orderBy: { order: "asc" } }, parent: true },
  });
  if (!category) notFound();

  // Localize the banner text (heading, labels, description, sub-category links)
  // for the caller's language. The product grid below localizes via /api/cards.
  const locale = await getLocale();
  const rawHeading = category.heading || category.label;
  const [heading, catLabel, catDesc, parentLabel] = await localizeMany(
    [rawHeading, category.label, category.description || "", category.parent?.label || ""],
    locale
  );
  const childLabels = await localizeMany(
    category.children.map((ch) => ch.label),
    locale
  );

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <section className="pt-8 md:pt-10 pb-10 md:pb-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14">
            <ol className="flex gap-2 eyebrow text-espresso/50">
              <li><a href="/" className="hover:text-espresso transition-colors">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="/shop" className="hover:text-espresso transition-colors">Shop</a></li>
              {category.parent && (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <a href={`/collections/${category.parent.handle}`} className="hover:text-espresso transition-colors">
                      {parentLabel}
                    </a>
                  </li>
                </>
              )}
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-espresso/80">{catLabel}</li>
            </ol>
          </nav>

          {/* Centered prose — heading + this category's own description */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            <h1 className="text-3xl md:text-4xl mb-6">{heading}</h1>
            {catDesc && (
              <p className="text-espresso text-[15px] leading-[1.65]">{catDesc}</p>
            )}

            {/* Sub-category links (nested children) */}
            {category.children.length > 0 && (
              <ul className="mt-8 flex flex-wrap md:flex-nowrap justify-center gap-x-6 gap-y-3">
                {category.children.map((ch, i) => (
                  <li key={ch.id}>
                    <a
                      href={`/collections/${ch.handle}`}
                      className="text-[0.875rem] uppercase tracking-[0.12em] text-espresso link-underline-anim whitespace-nowrap"
                    >
                      {childLabels[i]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Products in this category (reuses the shop grid + filters + sort) */}
        <section className="pb-16 md:pb-24">
          <ShopProducts category={handle} key={handle} />
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
