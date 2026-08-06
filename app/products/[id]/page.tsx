import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AnnouncementBar from "../../components/AnnouncementBar";
import Header from "../../components/Header";
import FooterFeatures from "../../components/FooterFeatures";
import ScrollingText from "../../components/ScrollingText";
import Footer from "../../components/Footer";
import ProductDetail from "../../components/ProductDetail";

// The dynamic product detail page. `id` can be a numeric product id OR a slug.
// <ProductDetail> fetches /api/products/[id] client-side, so anything the admin
// creates/edits in the DB is reflected here.
function findProduct(id: string) {
  const n = Number(id);
  const byId = Number.isInteger(n) && String(n) === id;
  return prisma.product.findFirst({
    where: byId ? { id: n } : { slug: id },
    select: { title: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await findProduct(id);
  return { title: p ? `${p.title} | Lavender Hill` : "Product | Lavender Hill" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        {/* key={id} → remount (refetch) when navigating between products */}
        <ProductDetail key={id} id={id} />
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
