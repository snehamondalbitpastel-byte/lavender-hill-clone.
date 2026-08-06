import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AnnouncementBar from "../components/AnnouncementBar";
import Header from "../components/Header";
import FooterFeatures from "../components/FooterFeatures";
import ScrollingText from "../components/ScrollingText";
import Footer from "../components/Footer";
import ShopProducts from "../components/ShopProducts";

export const metadata: Metadata = {
  title: "Sale | Lavender Hill",
  description:
    "Up to 70% off our beautifully crafted, sustainable basics — luxurious staples that combine comfort, style, and eco-friendly materials.",
};

export default async function SalePage() {
  // Categories the admin assigned to the Sale page (page = "sale").
  const categories = await prisma.category.findMany({
    where: { parentId: null, page: "sale" },
    orderBy: [{ order: "asc" }, { label: "asc" }],
    select: { label: true, handle: true },
  });
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        {/* Collection banner — same layout as Shop / New In */}
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
                Sale
              </li>
            </ol>
          </nav>

          {/* Centered prose — container--xs (42.5rem) */}
          <div className="mx-auto max-w-[42.5rem] px-5 text-center [overflow-wrap:anywhere]">
            <h1 className="text-3xl md:text-4xl mb-6">Sale</h1>

            <p className="text-espresso text-[15px] leading-[1.65]">
              {
                "Welcome to our Sale Collection, where you can enjoy up to 70% off on our beautifully crafted, sustainable basics. It's the perfect opportunity to indulge in luxurious staples that combine comfort, style, and eco-friendly materials. From our signature t-shirts to cosy loungewear, each piece is designed to elevate your wardrobe while being kind to the planet."
              }
            </p>

            {/* Category tags — live from the Category table (page = "sale"). */}
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

        {/* Main collection: toolbar + product grid (on-sale cards only) */}
        <section className="pb-16 md:pb-24">
          <ShopProducts saleOnly />
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
