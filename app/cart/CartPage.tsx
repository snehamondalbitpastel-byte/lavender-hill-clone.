"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart, bundleFor, type CartItem } from "../components/CartProvider";
import { useCurrency } from "../components/CurrencyProvider";
import { useT } from "../components/LocaleProvider";
import { maxQtyFor, MAX_PER_ORDER } from "@/lib/inventory";
import { COUNTRIES, INDIAN_STATES } from "@/lib/countries";

// Full "Cart" page (its own route, /cart) — opened from the CHECKOUT page's bag
// icon. The navbar bag icon still opens the side drawer; this is the expanded
// page view. Fully dynamic — reads/writes the same client cart (CartProvider).

// Feature toggles — hidden for now per request. Flip to `true` to show again on
// the UI (kept in code so re-enabling is a one-line change).
const SHOW_TAX_NOTE = false;
const SHOW_ESTIMATE_SHIPPING = false;

export default function CartPage() {
  const { items, subtotal, setQty, remove, note, setNote, hydrated } = useCart();
  const { money, code } = useCurrency();
  const { t } = useT();
  const router = useRouter();

  // Shipping estimator state (only rendered when SHOW_ESTIMATE_SHIPPING).
  const [estCountry, setEstCountry] = useState("India");
  const [estProvince, setEstProvince] = useState("");
  const [estZip, setEstZip] = useState("");
  const [estResult, setEstResult] = useState("");

  // Localize product titles + variant (colour/size) for display — the stored
  // English still drives everything; only the shown text is translated.
  const [tmap, setTmap] = useState<Record<string, string>>({});
  const tl = (s: string) => tmap[s] ?? s;
  const key = items.map((i) => `${i.title}|${i.colour}|${i.size}`).join(",");
  useEffect(() => {
    if (items.length === 0) { setTmap({}); return; }
    const vals = Array.from(new Set(items.flatMap((i) => [i.title, i.colour, i.size].filter(Boolean))));
    if (vals.length === 0) return;
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: vals }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        vals.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setTmap(m);
      })
      .catch(() => { /* fall back to English */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!hydrated) {
    return <div className="mx-auto max-w-[61.25rem] px-4 py-24 text-center text-sm text-espresso/40 md:px-6">…</div>;
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-[61.25rem] px-4 py-20 text-center md:px-6 md:py-28">
        <h1 className="font-heading text-2xl uppercase tracking-[0.08em] text-espresso md:text-3xl">{t("cart.title", "Cart")}</h1>
        <p className="mt-6 text-espresso/60">{t("cart.empty", "Your cart is empty.")}</p>
        <Link href="/shop" className="btn-lh mt-6 inline-flex">{t("cart.continue", "Continue shopping")}</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[61.25rem] px-4 py-12 md:px-6 md:py-16">
      {/* Header — heading + free-shipping line, centered */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <h1 className="font-heading text-2xl uppercase tracking-[0.08em] text-espresso md:text-3xl">{t("cart.title", "Cart")}</h1>
        <p className="text-[0.95rem] text-espresso/55">{t("cart.free_shipping", "You are eligible for free shipping.")}</p>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden border-b border-line pb-3 text-[0.78rem] uppercase tracking-[0.12em] text-espresso/55 md:grid md:grid-cols-[1fr_auto_7rem] md:gap-6">
        <span>{t("cart.col_product", "Product")}</span>
        <span className="text-center">{t("cart.col_quantity", "Quantity")}</span>
        <span className="text-end">{t("cart.col_total", "Total")}</span>
      </div>

      {/* Line items */}
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <CartRow
            key={item.key}
            item={item}
            title={tl(item.title)}
            variant={[item.colour, item.size].filter(Boolean).map(tl).join(" / ")}
            money={money}
            onQty={setQty}
            onRemove={remove}
            onOpen={() => router.push(`/products/${item.slug}`)}
            t={t}
          />
        ))}
      </ul>

      {/* Footer — order note (left) + recap (right) */}
      <div className="mt-8 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="md:max-w-[24rem] md:flex-1">
          <label htmlFor="cart-note" className="mb-2 block text-[0.95rem] text-espresso">{t("cart.add_note", "Add order note")}</label>
          <textarea
            id="cart-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("cart.note_help", "How can we help you?")}
            className="w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-[0.95rem] text-espresso outline-none focus:border-espresso"
          />
        </div>

        <div className="flex flex-col gap-3 md:w-[22rem] md:items-end md:text-right">
          <div className="flex items-baseline gap-2">
            <span className="text-xl text-espresso">{t("cart.total_label", "Total:")}</span>
            <span className="text-xl text-espresso">{money(subtotal)} {code}</span>
          </div>
          {SHOW_TAX_NOTE && (
            <p className="text-[0.9rem] text-espresso/55">
              {t("cart.tax_included", "Tax included.")}{" "}
              <span className="underline underline-offset-2">{t("cart.shipping_word", "Shipping")}</span>{" "}
              {t("cart.calc_at_checkout", "calculated at checkout.")}
            </p>
          )}
          <Link href="/checkout" className="btn-lh mt-1 w-full justify-center md:w-auto md:px-12">{t("cart.checkout", "Checkout")}</Link>
        </div>
      </div>

      {/* Estimate shipping — hidden for now (toggle SHOW_ESTIMATE_SHIPPING) */}
      {SHOW_ESTIMATE_SHIPPING && (
        <div className="mt-12 border border-line p-6 md:mt-16 md:p-8">
          <p className="text-center font-heading text-lg uppercase tracking-[0.08em] text-espresso">{t("cart.estimate_shipping", "Estimate shipping")}</p>
          <div className="mx-auto mt-6 grid max-w-[46rem] gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div>
              <label htmlFor="est-country" className="mb-1 block text-[0.72rem] text-espresso/55">{t("cart.country", "Country")}</label>
              <select id="est-country" value={estCountry} onChange={(e) => { setEstCountry(e.target.value); setEstResult(""); }} className="h-12 w-full rounded-md border border-line bg-white px-3 text-sm text-espresso outline-none focus:border-espresso">
                {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="est-province" className="mb-1 block text-[0.72rem] text-espresso/55">{t("cart.province", "Province")}</label>
              {estCountry === "India" ? (
                <select id="est-province" value={estProvince} onChange={(e) => setEstProvince(e.target.value)} className="h-12 w-full rounded-md border border-line bg-white px-3 text-sm text-espresso outline-none focus:border-espresso">
                  <option value="">{t("cart.province", "Province")}</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input id="est-province" value={estProvince} onChange={(e) => setEstProvince(e.target.value)} placeholder={t("cart.province", "Province")} className="h-12 w-full rounded-md border border-line bg-white px-3 text-sm text-espresso outline-none focus:border-espresso" />
              )}
            </div>
            <div>
              <label htmlFor="est-zip" className="mb-1 block text-[0.72rem] text-espresso/55">{t("cart.zip", "Zip code")}</label>
              <input id="est-zip" value={estZip} onChange={(e) => setEstZip(e.target.value)} placeholder={t("cart.zip", "Zip code")} className="h-12 w-full rounded-md border border-line bg-white px-3 text-sm text-espresso outline-none focus:border-espresso" />
            </div>
            <button type="button" onClick={() => setEstResult(t("cart.free_ship_result", "Shipping is free — calculated at checkout."))} className="btn-lh h-12 justify-center md:px-10">{t("cart.estimate", "Estimate")}</button>
          </div>
          {estResult && <p className="mt-4 text-center text-sm text-[#307a07]">{estResult}</p>}
        </div>
      )}

      {/* Continue shopping — bottom, centered */}
      <div className="mt-10 flex justify-center">
        <Link href="/shop" className="text-[0.85rem] uppercase tracking-[0.12em] text-espresso/70 link-underline-anim hover:text-espresso">
          {t("cart.continue", "Continue shopping")}
        </Link>
      </div>
    </section>
  );
}

// One cart line — product (image + name + price + variant), quantity stepper,
// line total. The whole row is clickable → the product's detail page; the
// quantity controls + Remove stop that navigation so they only do their action.
function CartRow({
  item, title, variant, money, onQty, onRemove, onOpen, t,
}: {
  item: CartItem;
  title: string;
  variant: string;
  money: (n: number) => string;
  onQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onOpen: () => void;
  t: (k: string, fallback?: string) => string;
}) {
  const discount = bundleFor(item);
  const onSale = item.compareAt != null && item.compareAt > item.price;
  const lineTotal = item.price * item.qty - discount;
  const maxQty = maxQtyFor(item.stock);
  const atMax = item.qty >= maxQty;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <li
      onClick={onOpen}
      className="grid cursor-pointer grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 py-4 transition-colors hover:bg-[#faf9f7] md:grid-cols-[1fr_auto_7rem] md:items-center md:gap-6"
    >
      {/* Product */}
      <div className="contents md:flex md:col-start-1 md:items-center md:gap-4">
        <span className="relative block h-[6.25rem] w-[4.6875rem] shrink-0 overflow-hidden bg-white">
          <Image src={item.image} alt={title} fill sizes="75px" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-[0.95rem] font-light uppercase leading-snug tracking-[0.06em] text-espresso">
            {title}
          </p>
          <p className="mt-1 text-[0.9rem] text-espresso/70">
            {onSale ? (
              <>
                <span className="text-plum">{money(item.price)}</span>{" "}
                <s className="text-espresso/35">{money(item.compareAt as number)}</s>
              </>
            ) : money(item.price)}
          </p>
          {variant && <p className="mt-1 text-[0.75rem] uppercase tracking-[0.08em] text-espresso/55">{variant}</p>}
          {discount > 0 && (
            <span className="mt-1.5 inline-block rounded bg-plum px-1.5 py-0.5 text-[10px] uppercase text-white">
              {item.badge} (−{money(discount)})
            </span>
          )}
        </div>
      </div>

      {/* Quantity (interactive → stop row navigation) */}
      <div className="col-start-2 flex flex-col items-start gap-2 md:col-start-2 md:items-center" onClick={stop}>
        <div className="inline-flex items-center border border-line">
          <button type="button" onClick={(e) => { stop(e); onQty(item.key, item.qty - 1); }} aria-label="Decrease quantity" className="px-3 py-1.5 text-espresso/70 hover:text-espresso">−</button>
          <span className="w-9 text-center text-[0.9rem] tabular-nums">{item.qty}</span>
          <button type="button" onClick={(e) => { stop(e); onQty(item.key, item.qty + 1); }} aria-label="Increase quantity" disabled={atMax} className="px-3 py-1.5 text-espresso/70 hover:text-espresso disabled:opacity-30">+</button>
        </div>
        <button type="button" onClick={(e) => { stop(e); onRemove(item.key); }} className="text-xs text-espresso/60 hover:text-espresso link-underline-anim">
          {t("cart.remove", "Remove")}
        </button>
      </div>

      {/* Total */}
      <div className="col-start-2 md:col-start-3 md:text-end">
        <p className="text-[0.95rem] text-espresso">{money(lineTotal)}</p>
        {atMax && <p className="mt-1 text-[0.7rem] text-espresso/45">{t("cart.max_per_order", "Up to {n} per order.").replace("{n}", String(MAX_PER_ORDER))}</p>}
      </div>
    </li>
  );
}
