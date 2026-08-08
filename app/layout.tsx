import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Raleway, Tenor_Sans } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import CartProvider from "./components/CartProvider";
import { CurrencyProvider } from "./components/CurrencyProvider";

// Headings — matches the site's --heading-font-family: Raleway
const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

// Body text — matches the site's --text-font-family: "Tenor Sans"
const tenorSans = Tenor_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-tenor",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lavender Hill | Premium Sustainable Women's Essentials",
  description:
    "A practice clone built with Next.js + Tailwind CSS. Beautiful basics for every woman's wardrobe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${tenorSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-cream text-espresso antialiased">
        <CurrencyProvider>
          <CartProvider>{children}</CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
