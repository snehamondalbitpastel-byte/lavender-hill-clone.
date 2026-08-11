"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AccountIcon,
  CartIcon,
  MenuIcon,
  CloseIcon,
} from "./Icons";
import LocalizationSelector from "./LocalizationSelector";
import LanguageSelector from "./LanguageSelector";
import SearchBox from "./SearchBox";
import MenuPanel from "./MenuPanel";
import { useCart } from "./CartProvider";
import { useT } from "./LocaleProvider";
import { useFetch } from "@/hooks/useFetch";
import { getMenu, type MenuGroup } from "@/lib/api";

const NAV = ["New In", "Shop", "Sale", "About"];
// Nav label → dictionary key (so the menu translates with the site language).
const NAV_KEY: Record<string, string> = {
  "New In": "nav.new_in",
  Shop: "nav.shop",
  Sale: "nav.sale",
  About: "nav.about",
};

// Place the sliding bar BEFORE the browser paints (on the client) so it appears
// directly under the active tab — never sliding in from the left edge on load.
// Falls back to useEffect on the server to avoid the SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Account icon → the in-app customer login flow (our /authentication/login
// clone), NOT the live Shopify account page.
const LOGIN_HREF = "/authentication/login";

// Where each nav item points. New In / Shop / Sale are collections (like the live
// site); the old /shop, /new-in, /sale routes still work and redirect here.
function hrefFor(item: string): string {
  return item === "New In" ? "/collections/new-arrivals"
    : item === "Shop" ? "/collections/view-all-products"
    : item === "Sale" ? "/collections/sale"
    : item === "About" ? "/about"
    : "#";
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCart, count } = useCart();
  const { t } = useT();
  const pathname = usePathname();

  // Shop hover mega-menu — a small close delay lets the cursor cross the gap from
  // the "Shop" link down into the full-width panel without it snapping shut.
  const [shopOpen, setShopOpen] = useState(false);
  const shopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openShop = () => {
    if (shopTimer.current) clearTimeout(shopTimer.current);
    setShopOpen(true);
  };
  const closeShop = () => {
    shopTimer.current = setTimeout(() => setShopOpen(false), 120);
  };

  // About hover mega-menu — same pattern. Its columns/links are admin-managed
  // (location = "about"); clicking "About" opens the FIRST link's page.
  const { data: aboutGroups } = useFetch<MenuGroup[]>(() => getMenu("about"), "menu:about");
  const aboutLinks = (aboutGroups ?? []).flatMap((g) => g.links);
  const aboutFirstHref = aboutLinks[0]?.href || "/about";
  const hasAbout = aboutLinks.length > 0 || (aboutGroups ?? []).some((g) => g.image);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAbout = () => {
    if (aboutTimer.current) clearTimeout(aboutTimer.current);
    setAboutOpen(true);
  };
  const closeAbout = () => {
    aboutTimer.current = setTimeout(() => setAboutOpen(false), 120);
  };
  // A tab is "active" when the current URL is that page (or a sub-page of it).
  const isActive = (href: string) =>
    href !== "#" && (pathname === href || pathname.startsWith(href + "/"));
  // Whether a nav item is the current page. About is special — it owns /about and
  // every admin content page (/pages/…).
  const isItemActive = (item: string) =>
    item === "About"
      ? pathname === "/about" || pathname.startsWith("/pages/")
      : isActive(hrefFor(item));

  // Which item the sliding bar sits under. Priority: the HOVERED item > the item
  // whose mega-menu is open (so the bar holds under Shop/About while the cursor
  // moves down into its panel) > the current-page tab. So hovering any tab glides
  // the bar onto it — like the live site — and it reverts on mouse-leave.
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const openItem = shopOpen ? "Shop" : aboutOpen && hasAbout ? "About" : null;
  const activeItem = NAV.find(isItemActive) ?? null;
  const barItem = hoveredNav ?? openItem ?? activeItem;

  // One underline bar slides under `barItem`. We measure that link's position from
  // the DOM and animate the bar's left/width, so it glides instead of jumping.
  // Re-measured whenever the target changes (route, hover, open menu) and on resize.
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  useIsoLayoutEffect(() => {
    const measure = () => {
      const el = barItem
        ? navRef.current?.querySelector<HTMLElement>(`[data-nav="${barItem}"]`)
        : null;
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [barItem]);

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
            <Link href="/" aria-label="Lavender Hill — Home" className="inline-block">
              <Image
                src="/lavender-hill-logo.png"
                alt="Lavender Hill"
                width={1200}
                height={246}
                sizes="140px"
                priority
                className="h-auto w-[115px] md:w-[156px]"
              />
            </Link>
          </div>

          {/* Center: nav — full-height links so the sliding chocolate bar sits
              flush on the header's bottom border. Client-side <Link> keeps the
              header mounted across pages, so the bar glides between tabs. */}
          <nav
            ref={navRef}
            onMouseLeave={() => setHoveredNav(null)}
            className="relative hidden h-full items-center gap-11 md:flex"
          >
            {NAV.map((item) => {
              const isShop = item === "Shop";
              const isAbout = item === "About";
              // About links to its first page (admin-managed); active on any /pages/… too.
              const href = isAbout ? aboutFirstHref : hrefFor(item);
              const active = isItemActive(item);
              return (
                <Link
                  key={item}
                  href={href}
                  data-nav={item}
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => {
                    setHoveredNav(item); // slide the bar onto the hovered tab
                    if (isShop) openShop();
                    else if (isAbout) openAbout();
                  }}
                  onMouseLeave={isShop ? closeShop : isAbout ? closeAbout : undefined}
                  className={`nav-link-lh flex h-full items-center text-[14.7px] tracking-[0.18em] leading-[1.7] transition-colors ${
                    active ? "text-espresso font-medium" : "text-espresso/70 hover:text-espresso"
                  }`}
                >
                  {t(NAV_KEY[item], item)}
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
            <div className="lg:ml-6">
              <LanguageSelector />
            </div>
            <a
              href={LOGIN_HREF}
              className="hidden md:block ml-2 hover:text-taupe transition-colors"
            >
              <span className="sr-only">Login</span>
              <AccountIcon />
            </a>
            {/* Search — sits between the account icon and the cart bag */}
            <SearchBox />
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

      {/* Shop hover mega-menu — full-width panel under the header (admin-managed) */}
      <div
        onMouseEnter={openShop}
        onMouseLeave={closeShop}
        className={`absolute left-0 right-0 top-full z-30 hidden border-y border-line bg-cream transition-all duration-200 ease-out md:block ${
          shopOpen ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <MenuPanel location="shop" open={shopOpen} />
      </div>

      {/* About hover mega-menu — same full-width panel, admin-managed columns/links */}
      {hasAbout && (
        <div
          onMouseEnter={openAbout}
          onMouseLeave={closeAbout}
          className={`absolute left-0 right-0 top-full z-30 hidden border-y border-line bg-cream transition-all duration-200 ease-out md:block ${
            aboutOpen ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <MenuPanel location="about" open={aboutOpen} />
        </div>
      )}

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
                const isAbout = item === "About";
                const href = isAbout ? aboutFirstHref : hrefFor(item);
                const active = isItemActive(item);
                return (
                  <div key={item}>
                    <a
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`nav-link-lh text-sm transition-colors ${
                        active
                          ? "text-espresso font-medium underline decoration-espresso underline-offset-4"
                          : "text-espresso/70"
                      }`}
                    >
                      {t(NAV_KEY[item], item)}
                    </a>
                    {/* About sub-links (admin-managed) listed under it on mobile */}
                    {isAbout && aboutLinks.length > 0 && (
                      <div className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
                        {aboutLinks.map((link) => (
                          <a key={link.id} href={link.href} className="text-[13px] text-espresso/60 hover:text-espresso transition-colors">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
