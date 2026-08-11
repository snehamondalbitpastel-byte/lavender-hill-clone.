import type { Metadata } from "next";
import AnnouncementBar from "../components/AnnouncementBar";
import Header from "../components/Header";
import FooterFeatures from "../components/FooterFeatures";
import ScrollingText from "../components/ScrollingText";
import Footer from "../components/Footer";
import CartPage from "./CartPage";

export const metadata: Metadata = { title: "Cart | Lavender Hill" };

// Full cart page (/cart) — the expanded bag view, opened from the checkout
// page's bag icon. Uses the normal storefront chrome; the navbar bag icon here
// still opens the side drawer as everywhere else.
export default function Cart() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <CartPage />
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
