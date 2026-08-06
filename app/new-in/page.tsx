import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AnnouncementBar from "../components/AnnouncementBar";
import Header from "../components/Header";
import FooterFeatures from "../components/FooterFeatures";
import ScrollingText from "../components/ScrollingText";
import Footer from "../components/Footer";
import CollectionBanner from "../components/CollectionBanner";
import NewInProducts from "../components/NewInProducts";

// Render per request (not frozen at build) so admin catalog changes appear
// live in production — and so a cloud build needs no database present.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Arrivals | Lavender Hill",
  description: "The latest arrivals at Lavender Hill.",
};

export default async function NewInPage() {
  // Categories the admin assigned to the New In page (page = "new-in").
  const categories = await prisma.category.findMany({
    where: { parentId: null, page: "new-in" },
    orderBy: [{ order: "asc" }, { label: "asc" }],
    select: { label: true, handle: true },
  });
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        {/* First half — dynamic banner (breadcrumb + heading + description).
            Category tags come from the live Category table so admin edits
            reflect instantly. */}
        <CollectionBanner slug="new-in" categories={categories} />

        {/* Second half — toolbar + product grid (4 sample products for now) */}
        <section className="pb-16 md:pb-24">
          <NewInProducts />
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
