import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Raleway, Tenor_Sans } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import CartProvider from "./components/CartProvider";
import { CurrencyProvider } from "./components/CurrencyProvider";
import { LocaleProvider } from "./components/LocaleProvider";
import { getLocale, getDictionary } from "@/lib/i18n";

// Headings — matches the live site's --heading-font-family: Raleway.
// The live theme loads Raleway as STATIC weights 300 & 400 (custom.css:
// @import Raleway:wght@300;400). We load the exact same instances (not the
// variable font) so headings — including product-card titles — render
// pixel-identical to lavenderhillclothing.com instead of slightly heavier.
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: "normal",
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <html
      lang={locale}
      className={`${raleway.variable} ${tenorSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-cream text-espresso antialiased">
        <CurrencyProvider>
          <LocaleProvider locale={locale} dict={dict}>
            <CartProvider>{children}</CartProvider>
          </LocaleProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
