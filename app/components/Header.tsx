"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AccountIcon,
  SearchIcon,
  CartIcon,
  MenuIcon,
  CloseIcon,
  ChevronDown,
} from "./Icons";
import LocalizationSelector from "./LocalizationSelector";
import { useCart } from "./CartProvider";

const NAV = ["New In", "Shop", "Sale", "About"];

// Place the sliding bar BEFORE the browser paints (on the client) so it appears
// directly under the active tab — never sliding in from the left edge on load.
// Falls back to useEffect on the server to avoid the SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Account icon → the in-app customer login flow (our /authentication/login
// clone), NOT the live Shopify account page.
const LOGIN_HREF = "/authentication/login";

// Where each nav item points. "About" is a placeholder page (coming soon).
function hrefFor(item: string): string {
  return item === "New In" ? "/new-in"
    : item === "Shop" ? "/shop"
    : item === "Sale" ? "/sale"
    : item === "About" ? "/about"
    : "#";
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, count } = useCart();
  const pathname = usePathname();
  // A tab is "active" when the current URL is that page (or a sub-page of it).
  const isActive = (href: string) =>
    href !== "#" && (pathname === href || pathname.startsWith(href + "/"));

  // One underline bar slides under the active tab. We measure the active link's
  // position from the DOM and animate the bar's left/width, so switching tabs
  // glides instead of jumping. Re-measured on route change and on resize.
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  useIsoLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>("[data-active]");
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-line">
      <div className="w-full px-4 md:px-12 lg:px-[53px]">
        <div className="flex items-center justify-between h-16 md:h-[74px]">
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex flex-1 items-center gap-3">
            <button
              className="md:hidden p-1"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <a href="#" aria-label="Lavender Hill — Home" className="inline-block">
              <Image
                src="/lavender-hill-logo.png"
                alt="Lavender Hill"
                width={1200}
                height={246}
                sizes="140px"
                priority
                className="h-auto w-[115px] md:w-[156px]"
              />
            </a>
          </div>

          {/* Center: nav — full-height links so the sliding chocolate bar sits
              flush on the header's bottom border. Client-side <Link> keeps the
              header mounted across pages, so the bar glides between tabs. */}
          <nav ref={navRef} className="relative hidden h-full items-center gap-11 md:flex">
            {NAV.map((item) => {
              const href = hrefFor(item);
              const active = isActive(href);
              return (
                <Link
                  key={item}
                  href={href}
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link-lh flex h-full items-center text-[14.7px] tracking-[0.18em] leading-[1.7] transition-colors ${
                    active ? "text-espresso font-medium" : "text-espresso/70 hover:text-espresso"
                  }`}
                >
                  {item}
                </Link>
              );
            })}
            {/* the single chocolate bar — slides to the active tab, flush with the border */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-[2px] bg-espresso transition-all duration-300 ease-out"
              style={bar ? { left: bar.left, width: bar.width, opacity: 1 } : { left: 0, width: 0, opacity: 0 }}
            />
          </nav>

          {/* Right: locale + account + icons */}
          <div className="flex flex-1 items-center justify-end gap-4 md:gap-5">
            <LocalizationSelector />
            <button className="hidden lg:flex items-center gap-1 nav-link-lh text-[12px] text-espresso/70 ml-6">
              English <ChevronDown className="w-4.5 h-4.5" />
            </button>
            <a
              href={LOGIN_HREF}
              className="hidden md:block ml-2 hover:text-taupe transition-colors"
            >
              <span className="sr-only">Login</span>
              <AccountIcon />
            </a>
            <button
              aria-label="Search"
              className="hover:text-taupe transition-colors"
            >
              <SearchIcon />
            </button>
            <button
              aria-label="Cart"
              onClick={openCart}
              className="relative hover:text-taupe transition-colors"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-espresso px-1 text-[10px] leading-none text-cream tabular-nums">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-espresso/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-cream p-6 shadow-soft-lg">
            <div className="flex justify-between items-center mb-10">
              <span className="font-heading tracking-[0.15em]">Menu</span>
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col gap-6">
              {NAV.map((item) => {
                const href = hrefFor(item);
                const active = isActive(href);
                return (
                  <a
                    key={item}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`nav-link-lh text-sm transition-colors ${
                      active
                        ? "text-espresso font-medium underline decoration-espresso underline-offset-4"
                        : "text-espresso/70"
                    }`}
                  >
                    {item}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
