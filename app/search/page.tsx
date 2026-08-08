import type { Metadata } from "next";
import { Suspense } from "react";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";
import SearchResults from "@/app/components/SearchResults";

export const metadata: Metadata = { title: "Search | Lavender Hill" };

// Full search results page — the "View all results" destination from the header
// search dropdown. Reads ?q= and lists every matching product.
export default function SearchPage() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="bg-cream">
        <Suspense fallback={<div className="py-24 text-center text-sm text-espresso/45">Searching…</div>}>
          <SearchResults />
        </Suspense>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
