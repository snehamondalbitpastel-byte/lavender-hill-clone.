"use client";

import Link from "next/link";
import { useCart } from "../components/CartProvider";

// The bag icon in the checkout header. Unlike the navbar bag (which opens the
// side drawer), on the checkout page it opens the full /cart page — the expanded
// bag view — with the live item count.
export default function CheckoutBagButton() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className="relative text-espresso/70 transition-colors hover:text-espresso"
    >
      {/* Shopify checkout "bag" glyph (from checkout-web sprite #bag) */}
      <svg width="24" height="24" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m2.007 10.156.387-4.983a1 1 0 0 1 .997-.923h7.218a1 1 0 0 1 .997.923l.387 4.983c.11 1.403-1.16 2.594-2.764 2.594H4.771c-1.605 0-2.873-1.19-2.764-2.594" vectorEffect="non-scaling-stroke" />
        <path d="M5 3.5c0-1.243.895-2.25 2-2.25S9 2.257 9 3.5V5c0 1.243-.895 2.25-2 2.25S5 6.243 5 5z" vectorEffect="non-scaling-stroke" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-espresso px-1 text-[10px] leading-none text-cream tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
