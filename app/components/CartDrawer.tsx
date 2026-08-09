"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart, bundleFor, type CartItem } from "./CartProvider";
import { useCurrency } from "./CurrencyProvider";
import { useT } from "./LocaleProvider";
import { badgeClass } from "@/lib/badge";

type Offer = { code: string; off: string; min: number };

export default function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, setQty, remove, note, setNote } = useCart();
  const { money } = useCurrency();
  const { t } = useT();
  const [noteOpen, setNoteOpen] = useState(false);

  // Live offers (admin-featured coupons) — shown as static "Shop ₹X & above →
  // CODE · Y% off" lines. The customer applies the code manually at checkout.
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/promo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: Offer[] }) => { if (!cancelled && d?.items?.length) setOffers(d.items); })
      .catch(() => { /* no offers — section just doesn't render */ });
    return () => { cancelled = true; };
  }, []);

  // Drawer only teases the SINGLE nearest offer the cart has NOT unlocked yet
  // (smallest minimum still above the subtotal) — and WITHOUT the code. Once
  // unlocked, the offer + code appear at checkout instead. (subtotal is net of
  // bundle discounts, matching the server.)
  const nextOffer = offers
    .filter((o) => o.min > subtotal)
    .reduce<Offer | null>((a, b) => (a && a.min <= b.min ? a : b), null);

  return (
    <div className="pointer-events-none" aria-hidden={!isOpen}>
      {/* Scrim */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[60] bg-espresso/40 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
      />
      {/* Panel — slides in from the right edge */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className={`fixed right-0 top-0 z-[61] flex h-full w-[min(92vw,28.125rem)] flex-col bg-cream shadow-soft-lg transition-transform duration-300 ease-out ${
          isOpen ? "pointer-events-auto translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-[1.125rem] md:px-8">
          <span className="font-heading text-base font-light uppercase tracking-[0.2em] text-espresso">
            {t("cart.title", "Cart")}
          </span>
          <button type="button" onClick={closeCart} aria-label="Close" className="text-espresso/60 hover:text-espresso">
            <svg width="16" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-espresso/60">{t("cart.empty", "Your cart is empty.")}</p>
            <a href="/shop" onClick={closeCart} className="btn-lh">{t("cart.continue", "Continue shopping")}</a>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8">
              {/* Free-shipping bar — matches the theme's .free-shipping-bar: small
                  subdued text, full-drawer-width with a bottom divider. Shipping
                  is always free, so the customer is always eligible. */}
              <p className="-mx-6 border-b border-line px-6 py-2 text-sm text-espresso/65 md:-mx-8 md:px-8">
                {t("cart.free_shipping", "You are eligible for free shipping.")}
              </p>

              {/* Offer — teaser for the SINGLE nearest offer NOT yet unlocked (no code
                  shown). Once the cart meets its minimum, it moves to checkout with its code. */}
              {nextOffer && (
                <div className="mb-4 rounded-md border border-dashed border-[#c9c4bd] bg-[#faf9f7] p-3">
                  <p className="mb-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-espresso/55">{t("cart.offers", "Offers")}</p>
                  <ul className="flex flex-col gap-1">
                    <li className="flex items-start gap-1.5 text-[0.8rem] text-espresso/75">
                      <span aria-hidden="true">🎟</span>
                      <span>{t("cart.shop_above", "Shop")} <b className="text-espresso">{money(nextOffer.min)}</b> {t("cart.and_above", "& above")} → {nextOffer.off}</span>
                    </li>
                  </ul>
                  <p className="mt-1.5 text-[0.68rem] text-espresso/45">{t("cart.unlock_hint", "Unlock it, then apply your code at checkout.")}</p>
                </div>
              )}

              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <Line key={item.key} item={item} onQty={setQty} onRemove={remove} onNavigate={closeCart} />
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-line px-6 py-5 md:px-8">
              {/* Order note */}
              {noteOpen ? (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("cart.note_placeholder", "Add a note to your order…")}
                  className="mb-4 min-h-[70px] w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-espresso"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="mb-4 text-sm text-espresso link-underline-anim"
                >
                  {t("cart.add_note", "Add order note")}
                </button>
              )}

              <p className="mb-4 text-[0.8125rem] text-espresso/55">
                {t("cart.taxes_note", "Taxes and shipping calculated at checkout")}
              </p>

              <a
                href="/checkout"
                onClick={closeCart}
                className="btn-lh w-full justify-between"
              >
                <span>{t("cart.checkout", "Checkout")}</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Line({
  item,
  onQty,
  onRemove,
  onNavigate,
}: {
  item: CartItem;
  onQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onNavigate: () => void;
}) {
  const { money } = useCurrency();
  const { t } = useT();
  const onSale = item.compareAt != null && item.compareAt > item.price;
  const discount = bundleFor(item);
  const variant = [item.colour, item.size].filter(Boolean).join(" / ");
  // Clicking the image or title opens that product's detail page (closing the drawer).
  const href = `/products/${item.slug}`;

  return (
    <li className="flex gap-4 py-5">
      <a href={href} onClick={onNavigate} aria-label={item.title} className="relative h-[6.25rem] w-[4.6875rem] shrink-0 overflow-hidden bg-white">
        <Image src={item.image} alt={item.title} fill sizes="75px" className="object-cover" />
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href={href}
          onClick={onNavigate}
          className="font-heading text-[0.8125rem] font-light uppercase leading-snug tracking-[0.08em] text-espresso hover:text-taupe transition-colors"
        >
          {item.title}
        </a>

        <p className="mt-1 text-sm text-espresso/80">
          {onSale ? (
            <>
              <span className="text-plum">{money(item.price)}</span>{" "}
              <s className="text-espresso/40">{money(item.compareAt as number)}</s>
            </>
          ) : (
            money(item.price)
          )}
        </p>

        {variant && (
          <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.08em] text-espresso/55">{variant}</p>
        )}

        {/* Qty + remove */}
        <div className="mt-2 flex items-center gap-4">
          <div className="inline-flex items-center border border-line">
            <button
              type="button"
              onClick={() => onQty(item.key, item.qty - 1)}
              aria-label="Decrease quantity"
              className="px-2.5 py-1.5 text-espresso/70 hover:text-espresso"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
            <button
              type="button"
              onClick={() => onQty(item.key, item.qty + 1)}
              aria-label="Increase quantity"
              className="px-2.5 py-1.5 text-espresso/70 hover:text-espresso"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="text-sm text-espresso/60 hover:text-espresso link-underline-anim"
          >
            {t("cart.remove", "Remove")}
          </button>
        </div>

        {/* Badges — on-sale (plum) + promo (taupe), same as the product card.
            The bundle promo also shows the applied discount once qty qualifies. */}
        {(onSale || item.badge) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {onSale && (
              <span className="badge-lh badge-lh--sale">
                {t("cart.save", "Save")} {money((item.compareAt as number) - item.price)}
              </span>
            )}
            {item.badge && (
              <span className={badgeClass(item.badge)}>
                {item.badge}
                {discount > 0 ? ` (−${money(discount)})` : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
