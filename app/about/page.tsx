import type { Metadata } from "next";
import AnnouncementBar from "../components/AnnouncementBar";
import Header from "../components/Header";
import FooterFeatures from "../components/FooterFeatures";
import ScrollingText from "../components/ScrollingText";
import Footer from "../components/Footer";

export const metadata: Metadata = { title: "About | Lavender Hill" };

// Placeholder About page — the real content is on the way. Kept consistent with
// the storefront chrome (header + footer) so the nav's active "About" tab works.
export default function AboutPage() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="flex min-h-[55vh] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="eyebrow text-taupe mb-3">About</p>
        <h1 className="text-3xl md:text-4xl tracking-[0.03em]">Coming soon</h1>
        <p className="mt-4 max-w-md text-sm leading-[1.7] text-espresso/60">
          This page is on its way. Check back shortly.
        </p>
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
