import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AnnouncementBar from "../components/AnnouncementBar";
import Header from "../components/Header";
import FooterFeatures from "../components/FooterFeatures";
import ScrollingText from "../components/ScrollingText";
import Footer from "../components/Footer";
import ShopProducts from "../components/ShopProducts";

export const metadata: Metadata = {
  title: "Shop All Products | Lavender Hill",
  description: "Browse all Lavender Hill products.",
};

export default async function ShopPage() {
  // Top-level categories assigned to the Shop page — the banner tags reflect
  // admin add/delete/reassign instantly (no hardcoded list).
  const categories = await prisma.category.findMany({
    where: { parentId: null, page: "shop" },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        {/* Collection banner */}
        <section className="pt-8 md:pt-10 pb-10 md:pb-14">
          {/* Breadcrumb — top-left corner (floating) */}
          <nav
            aria-label="Breadcrumb"
            className="px-6 md:px-12 lg:px-14 mb-10 md:mb-14"
          >
            <ol className="flex gap-2 eyebrow text-espresso/50">
              <li>
                <a href="/" className="hover:text-espresso transition-colors">
                  Home
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <a href="/shop" className="hover:text-espresso transition-colors">
                  Shop
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-espresso/80">
                All Products
              </li>
            </ol>
          </nav>

          {/* Centered prose — container--xs (42.5rem) */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            <h1 className="text-3xl md:text-4xl mb-6">All Products</h1>

            <p className="text-espresso text-[15px] leading-[1.65]">
              {
                "Our approach is like our design, beautifully simple. We create luxurious staples that feel like nothing else. Using "
              }
              <a href="#" className="link-underline-anim">
                natural sustainable sources
              </a>
              {
                ", every item has the softest touch imaginable - we spend a lot of time feeling fabric and finding new ways to make every piece that little bit more 'Aaaahhh'. You can feel good wearing our clothes and feel really good about "
              }
              <a href="#" className="link-underline-anim">
                {"how they're produced."}
              </a>
            </p>

            {/* Category tags — uppercase, letter-spacing .12em, nowrap; underline is
                the .prose gradient (currentColor, visible at rest, animates on hover).
                Sized so the row wraps 5 + "Toiletries" like the live banner. */}
            {categories.length > 0 && (
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
                {categories.map((c) => (
                  <li key={c.handle}>
                    <a
                      href={`/collections/${c.handle}`}
                      className="text-[0.875rem] uppercase tracking-[0.12em] text-espresso link-underline-anim whitespace-nowrap"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Main collection: toolbar + product grid */}
        <section className="pb-16 md:pb-24">
          <ShopProducts />
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
