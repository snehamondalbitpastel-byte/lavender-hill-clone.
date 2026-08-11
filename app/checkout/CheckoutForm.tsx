"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, bundleFor } from "../components/CartProvider";
import { useT } from "../components/LocaleProvider";
import { useCurrency } from "../components/CurrencyProvider";
import { COUNTRIES, INDIAN_STATES } from "@/lib/countries";
import { loadStripe, type StripeElementLocale } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Delivery = {
  country: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
};

const EMPTY: Delivery = {
  country: "India", firstName: "", lastName: "", company: "",
  address1: "", address2: "", city: "", state: "", postcode: "", phone: "",
};

// Amounts display in the shopper's SELECTED currency (consistent with the cart /
// drawer / product pages). Each component below aliases `useCurrency().money` as
// `inr`, so existing `inr(...)` calls now convert. The actual charge stays INR
// (the Stripe PaymentIntent) — this is display-only, per the site's design.

// Map the site's language code to a Stripe Elements locale so the Stripe-rendered
// payment fields (card number, expiry, CVC, the Link email/phone, "save my info",
// "supported cards", country, and the legal line) follow the shopper's chosen
// language — not just our own labels. Stripe uses "nb" for Norwegian; every other
// site code matches Stripe's own locale codes.
function toStripeLocale(l: string): StripeElementLocale {
  return (l === "no" ? "nb" : l) as StripeElementLocale;
}

// The payment-intent / mock response — carries the server-computed money breakdown.
type Pay = {
  mock: boolean;
  free?: boolean; // total is ₹0 (e.g. 100% coupon) → no payment step
  clientSecret?: string;
  subtotal: number;
  bundleDiscount: number;
  couponDiscount: number;
  couponCode: string;
  couponError?: string | null; // set when the applied code no longer qualifies
  total: number;
};

const inputCls =
  "h-12 w-full rounded-md border border-line bg-white px-3.5 text-sm text-espresso outline-none transition-colors focus:border-espresso";

// localStorage key for the applied coupon, so it survives a browser refresh.
const CODE_KEY = "lh_checkout_code";

export default function CheckoutForm({
  email,
  initialDelivery,
  stripeKey,
}: {
  email: string;
  initialDelivery: Delivery | null;
  stripeKey: string;
}) {
  const router = useRouter();
  const cart = useCart();
  const { t, locale } = useT();
  const { money: inr } = useCurrency(); // display amounts in the selected currency
  // Localize order-summary product titles + variant (colour/size) for display.
  // Stored English still drives everything server-side; only the shown text changes.
  const [tmap, setTmap] = useState<Record<string, string>>({});
  const tl = (s: string) => tmap[s] ?? s;
  const summaryKey = cart.items.map((i) => `${i.title}|${i.colour}|${i.size}`).join(",");
  useEffect(() => {
    if (locale === "en" || cart.items.length === 0) { setTmap({}); return; }
    const vals = new Set<string>();
    for (const i of cart.items) { if (i.title) vals.add(i.title); if (i.colour) vals.add(i.colour); if (i.size) vals.add(i.size); }
    const uniq = [...vals];
    if (uniq.length === 0) return;
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: uniq }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        uniq.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setTmap(m);
      })
      .catch(() => { /* fall back to stored English */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryKey, locale]);
  const [delivery, setDelivery] = useState<Delivery>(initialDelivery ?? EMPTY);

  // Localized COUNTRY names for the dropdown — dynamic via Intl.DisplayNames (no
  // hardcoded translation tables). The stored VALUE stays the English name so the
  // server + the India-state logic keep working; only the shown label changes.
  const regionNames = useMemo(() => {
    try { return new Intl.DisplayNames([locale], { type: "region" }); } catch { return null; }
  }, [locale]);
  const countryLabel = (code: string, fallback: string) => {
    try { return regionNames?.of(code) || fallback; } catch { return fallback; }
  };

  // Localized INDIAN STATE names — machine-translated on demand (cached in the
  // Translation table). Value stays English; only the label localizes.
  const [stateMap, setStateMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (locale === "en") return; // English → labels render as-is (see the option below)
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: INDIAN_STATES }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        INDIAN_STATES.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setStateMap(m);
      })
      .catch(() => { /* fall back to English state names */ });
    return () => { cancelled = true; };
  }, [locale]);

  const [pay, setPay] = useState<Pay | null>(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [stripePromise] = useState(() => (stripeKey ? loadStripe(stripeKey) : null));

  // Discount code state.
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState(""); // the valid code currently applied
  const [codeError, setCodeError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  // A coupon auto-removed because the cart dropped below its minimum. We remember
  // it so it AUTO-RE-APPLIES the instant the cart qualifies again (add/increase an
  // item) — live, no refresh — like a real store. Cleared on manual remove/apply.
  const [removedCode, setRemovedCode] = useState("");
  const [promos, setPromos] = useState<{ code: string; message: string; min: number }[]>([]); // admin-featured offers (with unlock minimum)
  const [promoTmap, setPromoTmap] = useState<Record<string, string>>({}); // localized promo-message cache
  // True while a coupon saved from a previous visit is being re-applied after a
  // refresh. Seeded synchronously so the discount box shows "applying…" from the
  // first paint instead of flashing the empty "enter code" state.
  const [restoringCode, setRestoringCode] = useState(() => {
    try { return typeof localStorage !== "undefined" && !!localStorage.getItem(CODE_KEY); } catch { return false; }
  });

  const linePayload = () =>
    cart.items.map((i) => ({ productId: i.productId, colour: i.colour, colourKey: i.colourKey, size: i.size, qty: i.qty }));

  // Start a payment intent (or mock) once the cart is known. A Stripe PaymentIntent's
  // amount is fixed at creation, so applying/removing a code (appliedCode) RE-creates
  // it with the new server-computed total — that's why appliedCode is a dependency.
  useEffect(() => {
    // Wait until any coupon saved from a previous visit has been restored, so the
    // payment intent is created ONCE with the final code — never first without it.
    if (cart.items.length === 0 || restoringCode) return;
    setPay(null);
    fetch("/api/checkout/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: linePayload(), code: appliedCode }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setError("");
        setPay(d);
        // The applied coupon no longer qualifies (e.g. the cart dropped below its
        // minimum) → drop it gracefully with a message; checkout continues at full price.
        if (d.couponError && appliedCode) {
          // Below-minimum is recoverable → remember it so it auto-re-applies when
          // the cart qualifies again. Other reasons (expired/used) are permanent.
          setRemovedCode(d.couponReason === "below_min" ? appliedCode : "");
          setAppliedCode("");
          setCodeInput("");
          setCodeError(`Coupon removed — ${d.couponError}`);
        }
      })
      .catch(() => setError("Couldn't start checkout. Please try again."));
    // cart.subtotal is a dep so QUANTITY changes (not just item count) re-validate the coupon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items.length, cart.subtotal, appliedCode, restoringCode]);

  // Featured promo codes — every code the admin opted into ("Show in banner") is
  // shown right here at the discount box, so the shopper doesn't need to remember
  // them. One tap fills + applies.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/promo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: { code: string; message: string; min: number }[] }) => { if (!cancelled && d?.items?.length) setPromos(d.items); })
      .catch(() => { /* no featured offers — no hints shown */ });
    return () => { cancelled = true; };
  }, []);

  // Translate the featured promo message(s) into the shopper's language — the text
  // is admin-set (dynamic), so it goes through runtime MT (cached), like the order
  // summary titles. The English value stays server-side.
  useEffect(() => {
    if (locale === "en" || promos.length === 0) return;
    const msgs = [...new Set(promos.map((p) => p.message).filter(Boolean))];
    if (msgs.length === 0) return;
    let cancelled = false;
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: msgs }) })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        msgs.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setPromoTmap(m);
      })
      .catch(() => { /* fall back to English promo text */ });
    return () => { cancelled = true; };
  }, [locale, promos]);

  // Persist the applied coupon so a browser refresh keeps it (like the cart does).
  // Skip the very first run so mounting (appliedCode = "") never wipes the saved
  // value before the re-apply effect below can read it.
  const persistReady = useRef(false);
  useEffect(() => {
    if (!persistReady.current) { persistReady.current = true; return; }
    // Persist the applied code OR a parked (below-minimum) code, so BOTH survive
    // navigating to /cart and back — the parked one re-applies once eligible.
    const keep = appliedCode || removedCode;
    try {
      if (keep) localStorage.setItem(CODE_KEY, keep);
      else localStorage.removeItem(CODE_KEY);
    } catch { /* storage unavailable — non-critical */ }
  }, [appliedCode, removedCode]);

  // On load, re-apply a saved coupon once the cart has hydrated — SILENTLY, so a
  // code that expired/was used meanwhile just drops off instead of blocking checkout.
  const reappliedRef = useRef(false);
  useEffect(() => {
    if (reappliedRef.current || !cart.hydrated || cart.items.length === 0) return;
    reappliedRef.current = true;
    let saved = "";
    try { saved = localStorage.getItem(CODE_KEY) ?? ""; } catch { /* ignore */ }
    if (saved) applyCode(saved, true).finally(() => setRestoringCode(false));
    else setRestoringCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.hydrated, cart.items.length]);

  // Auto-RE-APPLY a coupon that was removed for being below its minimum, the
  // moment the cart qualifies again (the shopper adds/increases an item). Runs on
  // subtotal change; applyCode validates server-side, so it only sticks when the
  // cart truly qualifies — otherwise it stays removed (no error spam). Also covers
  // the after-refresh case: a saved code that couldn't restore parks in
  // `removedCode` and re-applies once eligible.
  useEffect(() => {
    if (!removedCode || appliedCode || restoringCode || codeBusy || cart.items.length === 0) return;
    applyCode(removedCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.subtotal, cart.items.length, removedCode, appliedCode, restoringCode]);

  // Validate + apply a coupon (live preview). Only a valid code sets appliedCode,
  // which re-creates the payment intent at the discounted total. `silent` (used by
  // the refresh-restore above) suppresses the error message on a stale code.
  async function applyCode(codeArg?: string, silent = false) {
    const code = (codeArg ?? codeInput).trim();
    if (!code) return;
    setCodeBusy(true);
    if (!silent) setCodeError("");
    try {
      const res = await fetch("/api/checkout/apply-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: linePayload(), code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setAppliedCode(data.code);
        setCodeInput(data.code);
        setRemovedCode(""); // applied → nothing pending to re-apply
        setCodeError(""); // clear any "coupon removed" note now that it's back on
      } else {
        setAppliedCode("");
        if (data.reason === "below_min") {
          // Recoverable — park it (persists via CODE_KEY + auto-re-applies once the
          // cart grows enough) and ALWAYS explain why, even on a silent restore.
          setRemovedCode(code);
          setCodeError(data.error || "Spend more to use this code.");
        } else {
          // Permanent (expired / used / invalid) — drop it. A silent restore of a
          // dead code drops quietly; a manual attempt shows the reason.
          setRemovedCode("");
          if (!silent) setCodeError(data.error || "This code can't be applied.");
        }
      }
    } catch {
      if (!silent) setCodeError("Couldn't apply the code. Please try again.");
    } finally {
      setCodeBusy(false);
    }
  }
  function removeCode() {
    setAppliedCode("");
    setCodeInput("");
    setCodeError("");
    setRemovedCode(""); // manual remove → don't auto-re-apply it
  }

  const set = <K extends keyof Delivery>(k: K, v: Delivery[K]) =>
    setDelivery((d) => ({ ...d, [k]: v }));

  function validate(): boolean {
    if (!delivery.address1.trim() || !delivery.city.trim()) {
      setError("Please enter your delivery address and city.");
      return false;
    }
    setError("");
    return true;
  }

  async function placeOrder(paymentIntentId?: string) {
    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: linePayload(), delivery, note: cart.note, paymentIntentId, code: appliedCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      // Show the processing loader BEFORE clearing the cart, so the empty-cart
      // state never flashes between clear() and the success page rendering.
      setRedirecting(true);
      try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ }
      cart.clear();
      router.push(`/checkout/success/${data.id}`);
    } else {
      setError(data.error || "We couldn't place your order.");
      setPlacing(false);
    }
  }

  const savings = cart.items.reduce(
    (s, i) => s + bundleFor(i) + (i.compareAt && i.compareAt > i.price ? (i.compareAt - i.price) * i.qty : 0),
    0
  );
  // Coupon + final total come from the server (authoritative). Fall back to the
  // client subtotal before the payment intent has loaded.
  const couponDiscount = pay?.couponDiscount ?? 0;
  const displayTotal = pay?.total ?? cart.subtotal;
  // Show "applying…" (never the empty input) for the WHOLE window a coupon is
  // coming: while a saved code restores, AND after it validates but before the
  // payment intent (pay) has reloaded with the discounted total.
  const couponPending = restoringCode || (!!appliedCode && pay === null);

  // Payment succeeded → show a processing loader while the order saves and we
  // navigate to the confirmation. This covers the moment after cart.clear() so
  // the empty-cart state never flashes before the thank-you page.
  if (redirecting) {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-center px-6 py-32 text-center md:px-10">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-espresso/20 border-t-espresso"
          aria-hidden="true"
        />
        <p className="mt-5 text-sm text-espresso/70">{t("checkout.payment_received", "Payment received — preparing your order confirmation…")}</p>
      </div>
    );
  }

  // While the cart is still loading from localStorage, show a skeleton — NOT the
  // empty state (which would flash for a moment before the items hydrate).
  if (!cart.hydrated) {
    return <CheckoutSkeleton />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-[1180px] px-6 py-24 text-center md:px-10">
        <p className="text-espresso/60">{t("checkout.empty", "Your cart is empty.")}</p>
        <a href="/shop" className="btn-lh mt-4 inline-flex">{t("checkout.continue", "Continue shopping")}</a>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-10 md:grid-cols-2 md:gap-16 md:px-10">
      {/* LEFT — contact + delivery + payment */}
      <div className="flex flex-col gap-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[1.05rem] font-medium">{t("checkout.contact", "Contact")}</h2>
          </div>
          <div className="rounded-md border border-line px-3.5 py-3 text-sm">{email}</div>
        </section>

        <section>
          <h2 className="mb-3 text-[1.05rem] font-medium">{t("checkout.delivery", "Delivery")}</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[0.72rem] text-espresso/55">{t("checkout.country", "Country/Region")}</label>
              <select className={inputCls} value={delivery.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>{countryLabel(c.code, c.name)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder={t("checkout.first_name", "First name (optional)")} value={delivery.firstName} onChange={(e) => set("firstName", e.target.value)} />
              <input className={inputCls} placeholder={t("checkout.last_name", "Last name")} value={delivery.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
            <input className={inputCls} placeholder={t("checkout.company", "Company (optional)")} value={delivery.company} onChange={(e) => set("company", e.target.value)} />
            <input className={inputCls} placeholder={t("checkout.address", "Address")} value={delivery.address1} onChange={(e) => set("address1", e.target.value)} />
            <input className={inputCls} placeholder={t("checkout.apartment", "Apartment, suite, etc. (optional)")} value={delivery.address2} onChange={(e) => set("address2", e.target.value)} />
            <div className="grid grid-cols-3 gap-3">
              <input className={inputCls} placeholder={t("checkout.city", "City")} value={delivery.city} onChange={(e) => set("city", e.target.value)} />
              {delivery.country === "India" ? (
                <select className={inputCls} value={delivery.state} onChange={(e) => set("state", e.target.value)}>
                  <option value="">{t("checkout.state", "State")}</option>
                  {INDIAN_STATES.map((st) => <option key={st} value={st}>{locale === "en" ? st : (stateMap[st] ?? st)}</option>)}
                </select>
              ) : (
                <input className={inputCls} placeholder={t("checkout.state", "State")} value={delivery.state} onChange={(e) => set("state", e.target.value)} />
              )}
              <input className={inputCls} placeholder={t("checkout.pin", "PIN code")} value={delivery.postcode} onChange={(e) => set("postcode", e.target.value)} />
            </div>
            <input className={inputCls} placeholder={t("checkout.phone", "Phone (optional)")} value={delivery.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </section>

        <section>
          <h2 className="text-[1.05rem] font-medium">{t("checkout.payment", "Payment")}</h2>
          <p className="mt-1 mb-3 text-[0.8rem] text-espresso/55">
            {t("checkout.secure", "All transactions are secure and encrypted.")}
          </p>

          {!pay ? (
            <div className="rounded-md border border-line px-4 py-6 text-center text-sm text-espresso/50">{t("checkout.loading_payment", "Loading payment…")}</div>
          ) : pay.free ? (
            <FreeOrder placing={placing} onPlace={() => validate() && placeOrder()} />
          ) : pay.mock ? (
            <MockPayment
              placing={placing}
              total={displayTotal}
              onPay={() => validate() && placeOrder()}
            />
          ) : (
            <Elements
              key={`${pay.clientSecret}:${locale}`}
              stripe={stripePromise}
              options={{ clientSecret: pay.clientSecret, locale: toStripeLocale(locale) }}
            >
              <StripePayment
                placing={placing}
                total={displayTotal}
                onValidate={validate}
                onPaid={(pid) => placeOrder(pid)}
                onError={(m) => setError(m)}
                setPlacing={setPlacing}
              />
            </Elements>
          )}

          {error && <p className="mt-3 text-sm text-[#c2334d]">{error}</p>}
        </section>
      </div>

      {/* RIGHT — order summary: a sticky card, so scrolling moves only the LEFT column */}
      <div className="md:sticky md:top-8 md:self-start">
        <div className="rounded-xl border border-line bg-[#faf9f7] p-5 sm:p-6">
        <ul className="flex flex-col gap-4">
          {cart.items.map((item) => {
            const onSale = item.compareAt != null && item.compareAt > item.price;
            const discount = bundleFor(item);
            const variant = [item.colour, item.size].filter(Boolean).join(" / ");
            return (
              <li key={item.key} className="flex gap-4">
                <div className="relative shrink-0">
                  {/* overflow-hidden lives on the inner wrapper so the qty badge
                      (on the outer, un-clipped box) sits on the corner, not inside. */}
                  <div className="relative h-[4.5rem] w-[3.375rem] overflow-hidden rounded-md border border-line bg-white">
                    <Image src={item.image} alt="" fill sizes="54px" className="object-cover" />
                  </div>
                  <span className="absolute -right-2 -top-2 z-10 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-espresso px-1 text-[11px] leading-none text-cream ring-2 ring-white">{item.qty}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-espresso">{tl(item.title)}</p>
                  {variant && <p className="text-xs text-espresso/55">{[item.colour, item.size].filter(Boolean).map(tl).join(" / ")}</p>}
                  {discount > 0 && (
                    <span className="mt-1 inline-block rounded bg-plum px-1.5 py-0.5 text-[10px] uppercase text-white">
                      {item.badge} (−{inr(discount)})
                    </span>
                  )}
                </div>
                <div className="text-right text-sm">
                  {onSale && <p className="text-espresso/35 line-through">{inr((item.compareAt as number) * item.qty)}</p>}
                  <p className="text-espresso">{inr(item.price * item.qty - discount)}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Discount code */}
        <div className="mt-5 border-t border-line pt-4">
          {couponPending ? (
            <div className="flex items-center gap-2 rounded-md bg-[#faf9f7] px-3 py-2 text-sm text-espresso/50">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-espresso/25 border-t-espresso" aria-hidden="true" />
              {t("checkout.applying", "Applying your discount…")}
            </div>
          ) : appliedCode && couponDiscount > 0 ? (
            <div className="flex items-center justify-between rounded-md bg-[#eef3ea] px-3 py-2 text-sm">
              <span className="text-[#307a07]">
                {t("checkout.code_prefix", "Code")} <strong>{appliedCode}</strong> {t("checkout.code_applied_suffix", "applied")} (−{inr(couponDiscount)})
              </span>
              <button type="button" onClick={removeCode} className="text-xs text-espresso/60 underline hover:text-espresso">
                {t("checkout.remove", "Remove")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  className="h-10 flex-1 rounded-md border border-line bg-white px-3 text-sm uppercase outline-none focus:border-espresso"
                  placeholder={t("checkout.discount_code", "Discount code")}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); applyCode(); }
                  }}
                />
                <button
                  type="button"
                  onClick={() => applyCode()}
                  disabled={codeBusy || !codeInput.trim()}
                  className="rounded-md border border-espresso bg-white px-4 text-sm text-espresso transition-colors hover:bg-espresso hover:text-cream disabled:opacity-50"
                >
                  {codeBusy ? "…" : t("checkout.apply", "Apply")}
                </button>
              </div>
              {codeError && <p className="mt-2 text-xs text-[#c2334d]">{codeError}</p>}
              {/* Available offer — of the coupons the cart has unlocked, show ONLY the
                  best one (the highest spend tier reached), not every lower tier too.
                  e.g. a ₹5,100 cart that clears both the ₹1,500 and ₹5,000 tiers shows
                  just the ₹5,000 offer. One tap applies. */}
              {(() => {
                const eligible = promos.filter((p) => cart.subtotal >= p.min && p.code !== appliedCode);
                const best = eligible.reduce<(typeof eligible)[number] | null>(
                  (a, b) => (a && a.min >= b.min ? a : b),
                  null
                );
                if (!best) return null;
                return (
                  <button
                    key={best.code}
                    type="button"
                    onClick={() => applyCode(best.code)}
                    disabled={codeBusy}
                    className="mt-2 flex w-full items-center justify-between gap-3 rounded-md border border-dashed border-[#c9c4bd] bg-[#faf9f7] px-3 py-2 text-left text-xs text-espresso/75 transition-colors hover:border-espresso hover:bg-white disabled:opacity-60"
                  >
                    <span>🎟 {promoTmap[best.message] ?? best.message}</span>
                    <span className="shrink-0 font-medium text-espresso underline">{t("checkout.apply", "Apply")}</span>
                  </button>
                );
              })()}
            </>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-espresso/70">{t("checkout.subtotal", "Subtotal")} · {(cart.count === 1 ? t("checkout.item_one", "{n} item") : t("checkout.item_other", "{n} items")).replace("{n}", String(cart.count))}</span>
            <span>{inr(cart.subtotal + savingsExcludingBundle(cart.items))}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-espresso/70">{t("checkout.shipping", "Shipping")}</span>
            <span className="text-espresso/60">{t("checkout.free", "Free")}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-espresso/70">{t("checkout.discount", "Discount")} ({appliedCode})</span>
              <span className="text-plum">− {inr(couponDiscount)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="text-base font-medium">{t("checkout.total", "Total")}</span>
            {/* With a coupon applied, show the pre-discount total struck through,
                then the new discounted total — so the code's effect is obvious. */}
            <span className="flex items-baseline gap-2 text-base font-medium">
              {couponDiscount > 0 && (
                <span className="text-sm font-normal text-espresso/40 line-through">{inr(displayTotal + couponDiscount)}</span>
              )}
              <span>
                <span className="mr-1 text-xs text-espresso/50">INR</span>
                {inr(displayTotal)}
              </span>
            </span>
          </div>
          {savings + couponDiscount > 0 && (
            <p className="mt-2 text-[0.8rem] text-plum">{t("checkout.total_savings", "TOTAL SAVINGS")} {inr(savings + couponDiscount)}</p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

// Loading placeholder shown until the cart hydrates from localStorage —
// mirrors the two-column checkout layout so there's no empty-cart flash.
function CheckoutSkeleton() {
  const bar = "animate-pulse rounded-md bg-espresso/10";
  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-10 md:grid-cols-2 md:gap-16 md:px-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} h-12 w-full`} />
        </div>
        <div className="flex flex-col gap-3">
          <div className={`${bar} h-4 w-28`} />
          <div className={`${bar} h-12 w-full`} />
          <div className="grid grid-cols-2 gap-3">
            <div className={`${bar} h-12 w-full`} />
            <div className={`${bar} h-12 w-full`} />
          </div>
          <div className={`${bar} h-12 w-full`} />
          <div className="grid grid-cols-3 gap-3">
            <div className={`${bar} h-12 w-full`} />
            <div className={`${bar} h-12 w-full`} />
            <div className={`${bar} h-12 w-full`} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} h-28 w-full`} />
        </div>
      </div>
      <div className="md:border-l md:border-line md:pl-16">
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className={`${bar} h-[4.5rem] w-[3.375rem] shrink-0`} />
              <div className="flex-1 space-y-2 pt-1">
                <div className={`${bar} h-3.5 w-3/4`} />
                <div className={`${bar} h-3 w-1/3`} />
              </div>
              <div className={`${bar} h-3.5 w-14`} />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2 border-t border-line pt-4">
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-2/3`} />
          <div className={`${bar} mt-2 h-6 w-1/2`} />
        </div>
      </div>
    </div>
  );
}

// Subtotal shown before discounts = sum of compareAt (or price) * qty.
function savingsExcludingBundle(items: ReturnType<typeof useCart>["items"]): number {
  return items.reduce(
    (s, i) => s + (i.compareAt && i.compareAt > i.price ? (i.compareAt - i.price) * i.qty : 0),
    0
  );
}

// Shown when a coupon makes the order ₹0 — no card needed, just place it.
function FreeOrder({ placing, onPlace }: { placing: boolean; onPlace: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-4">
      <p className="text-sm text-espresso/70">🎉 {t("checkout.free_order", "This order is free — no payment needed.")}</p>
      <button type="button" onClick={onPlace} disabled={placing} className="btn-lh w-full justify-center disabled:opacity-60">
        {placing ? t("checkout.placing", "Placing…") : t("checkout.place_free", "Place free order")}
      </button>
    </div>
  );
}

function MockPayment({ placing, total, onPay }: { placing: boolean; total: number; onPay: () => void }) {
  const { t } = useT();
  const { money: inr } = useCurrency();
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-4">
      <input className={inputCls} placeholder={t("checkout.card_number", "Card number")} inputMode="numeric" />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} placeholder={t("checkout.expiry", "Expiry (MM/YY)")} />
        <input className={inputCls} placeholder={t("checkout.security_code", "Security code")} inputMode="numeric" />
      </div>
      <input className={inputCls} placeholder={t("checkout.name_on_card", "Name on card")} />
      <button type="button" onClick={onPay} disabled={placing} className="btn-lh mt-1 w-full justify-center disabled:opacity-60">
        {placing ? t("checkout.processing", "Processing…") : `${t("checkout.pay", "Pay")} ${inr(total)}`}
      </button>
      <p className="text-[0.72rem] text-espresso/45">
        {t("checkout.test_mode", "Test mode — no real charge.")} Add Stripe test keys in <code>.env</code> for real card processing.
      </p>
    </div>
  );
}

function StripePayment({
  placing, total, onValidate, onPaid, onError, setPlacing,
}: {
  placing: boolean;
  total: number;
  onValidate: () => boolean;
  onPaid: (pid: string) => void;
  onError: (m: string) => void;
  setPlacing: (b: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useT();
  const { money: inr } = useCurrency();

  async function pay() {
    if (!stripe || !elements || placing) return;
    if (!onValidate()) return;
    setPlacing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      onError(error.message || "Payment failed.");
      setPlacing(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid(paymentIntent.id);
    } else {
      onError("Payment was not completed.");
      setPlacing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* A single "Card" row (like the live payment method selector), expanded to
          show the card fields. Card-only, so no Link "save my info" signup. */}
      <div className="overflow-hidden rounded-md border border-line">
        <div className="flex items-center justify-between border-b border-line bg-[#faf9f7] px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm font-medium text-espresso">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-[4px] border-espresso bg-white" aria-hidden="true" />
            {t("checkout.card", "Card")}
          </span>
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <CardMark label="VISA" bg="#1a1f71" />
            <CardMark label="MC" bg="#eb001b" />
            <CardMark label="AMEX" bg="#2e77bc" />
          </span>
        </div>
        <div className="p-4">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>
      </div>
      <button type="button" onClick={pay} disabled={placing || !stripe} className="btn-lh w-full justify-center disabled:opacity-60">
        {placing ? t("checkout.processing", "Processing…") : `${t("checkout.pay", "Pay")} ${inr(total)}`}
      </button>
    </div>
  );
}

// Tiny card-brand chip for the payment header.
function CardMark({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="inline-flex h-4 items-center rounded-[3px] px-1 text-[8px] font-bold tracking-tight text-white"
      style={{ backgroundColor: bg }}
    >
      {label}
    </span>
  );
}
