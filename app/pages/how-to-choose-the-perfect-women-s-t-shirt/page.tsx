import type { Metadata } from "next";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import Header from "@/app/components/Header";
import FooterFeatures from "@/app/components/FooterFeatures";
import ScrollingText from "@/app/components/ScrollingText";
import Footer from "@/app/components/Footer";

// Static "Coming soon" placeholder for the hero's "Find Your Perfect Tee" button
// (mirrors the live URL /pages/how-to-choose-the-perfect-women-s-t-shirt).
// Intentionally NOT a DB-backed content page and NOT listed in any menu — a
// dedicated static segment so it takes precedence over /pages/[slug] for this
// path only, leaving the dynamic content-page system untouched.
export const metadata: Metadata = {
  title: "How to Choose the Perfect Women’s T-shirt | Lavender Hill",
};

export default function ComingSoonPage() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="bg-cream">
        <section className="py-28 lg:py-40">
          <div className="mx-auto max-w-[42.5rem] px-5 text-center">
            <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] mb-4">Coming soon</h1>
            <p className="text-espresso/60 text-[0.9375rem] leading-[1.65]">
              This page is coming soon.
            </p>
          </div>
        </section>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
