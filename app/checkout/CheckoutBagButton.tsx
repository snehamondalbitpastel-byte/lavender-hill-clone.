"use client";

import { useCart } from "../components/CartProvider";

// The bag icon in the checkout header — opens the cart drawer (so you can review
// or edit items without leaving checkout), with the live item count.
export default function CheckoutBagButton() {
  const { openCart, count } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Cart"
      className="relative text-espresso/70 transition-colors hover:text-espresso"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8h12l-1 12H7L6 8Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-espresso px-1 text-[10px] leading-none text-cream tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
