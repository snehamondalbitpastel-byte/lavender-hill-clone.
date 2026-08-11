"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import CartDrawer from "./CartDrawer";
import { maxQtyFor } from "@/lib/inventory";

// ============================================================
// Client-side cart — lives in the browser (localStorage). No server/DB;
// products are referenced by what's captured at add-time. An Order is only
// created at checkout (a later phase).
// ============================================================

export type CartItem = {
  key: string; // productId|colourKey|size — identifies a line
  productId: number;
  slug: string;
  title: string;
  colour: string; // localized display name (e.g. "White" / "白") — for rendering only
  colourKey?: string; // stable, language-INDEPENDENT colour id (hex/index) — used in the line key
  size: string;
  image: string;
  price: number; // unit selling price
  compareAt: number | null; // original (struck) price if on sale
  badge: string | null; // e.g. "Buy 3+, Save 15%" → the bundle rule
  stock: number | null; // units available; null = not tracked (unlimited). Server re-checks at checkout.
  qty: number;
};

// The shape callers pass to add()/requestAdd() — key + qty are derived/optional.
export type AddInput = Omit<CartItem, "key" | "qty"> & { qty?: number };

type CartContext = {
  items: CartItem[];
  isOpen: boolean;
  note: string;
  hydrated: boolean; // false until localStorage is read (avoids empty-cart flash)
  count: number;
  subtotal: number; // net of bundle discounts
  add: (item: AddInput) => void;
  // Login-gated add: adds if signed in, else parks the item + shows a sign-in
  // prompt, then replays the add automatically after login.
  requestAdd: (item: AddInput, redirectTo?: string) => Promise<void>;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  setNote: (n: string) => void;
};

const Ctx = createContext<CartContext | null>(null);

export function useCart(): CartContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within <CartProvider>");
  return c;
}

// ---- money helpers ----
export function parseRs(s: string | null | undefined): number {
  const m = (s ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
export function formatRs(n: number): string {
  return (
    "Rs. " +
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

// "Buy 3+, Save 15%" → { threshold: 3, pct: 15 }. Any "Save N%" → threshold 1.
export function parseBundle(badge: string | null): { threshold: number; pct: number } | null {
  if (!badge) return null;
  const pctM = badge.match(/(\d+)\s*%/);
  if (!pctM) return null;
  const thM = badge.match(/(\d+)\s*\+/);
  return { pct: Number(pctM[1]), threshold: thM ? Number(thM[1]) : 1 };
}
// Bundle discount amount for a line (0 if not eligible).
export function bundleFor(item: CartItem): number {
  const b = parseBundle(item.badge);
  if (!b || item.qty < b.threshold) return 0;
  return Math.round(((item.price * item.qty * b.pct) / 100) * 100) / 100;
}

const STORAGE_KEY = "lh_cart_v1";
// A login-gated add parks here while the guest signs in, then replays on return.
const PENDING_KEY = "lh_pending_add";

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<{ redirect: string } | null>(null);
  const pathname = usePathname();

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (typeof parsed.note === "string") setNote(parsed.note);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration so we don't overwrite with []).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, note }));
    } catch {
      /* ignore quota / private mode */
    }
  }, [items, note, hydrated]);

  const add = useCallback((it: AddInput) => {
    if (it.stock != null && it.stock <= 0) return; // out of stock → nothing to add
    // Identify a line by a language-INDEPENDENT colour id (hex/index) so the same
    // variant added under different languages ("White" vs "白") merges into ONE
    // line and just bumps the quantity — instead of showing the card twice.
    const cid = (it.colourKey && it.colourKey.trim()) || it.colour;
    const key = `${it.productId}|${cid}|${it.size}`;
    const addQty = it.qty ?? 1;
    // Cap at min(available stock, 5 per order) — the same limit the server enforces.
    const cap = maxQtyFor(it.stock);
    setItems((prev) => {
      const i = prev.findIndex((x) => x.key === key);
      if (i >= 0) {
        const next = [...prev];
        const want = next[i].qty + addQty;
        next[i] = { ...next[i], stock: it.stock, qty: Math.min(want, cap) };
        return next;
      }
      return [...prev, { ...it, key, qty: Math.min(addQty, cap) }];
    });
    setIsOpen(true);
  }, []);

  // Login-gated add. Only signed-in shoppers can add to the cart: if not signed
  // in, park the intended add (incl. quantity) + show the sign-in prompt; it
  // replays automatically after login. `redirectTo` = where to return post-login.
  const requestAdd = useCallback(
    async (it: AddInput, redirectTo?: string) => {
      const me = await fetch("/api/auth/me")
        .then((r) => r.json())
        .catch(() => ({ loggedIn: false }));
      if (me.loggedIn) {
        add(it);
        return;
      }
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(it)); } catch { /* ignore */ }
      const redirect =
        redirectTo ||
        (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
      setLoginPrompt({ redirect });
    },
    [add]
  );

  // After a gated add, the shopper signs in and is redirected back — complete the
  // parked add automatically. Runs on route change so it fires on their return.
  useEffect(() => {
    if (!hydrated) return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING_KEY); } catch { return; }
    if (!raw) return;
    let pending: AddInput | null = null;
    try { pending = JSON.parse(raw) as AddInput; } catch { pending = null; }
    if (!pending) { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } return; }
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (cancelled) return;
        if (me.loggedIn) {
          add(pending as AddInput);
          try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        }
        // Not signed in yet → leave it parked until sign-in completes.
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname, hydrated, add]);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.key !== key)
        : prev.map((x) => {
            if (x.key !== key) return x;
            const capped = Math.min(qty, maxQtyFor(x.stock)); // cap at min(stock, 5/order)
            return { ...x, qty: Math.max(1, capped) };
          })
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const count = useMemo(() => items.reduce((n, x) => n + x.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, x) => sum + x.price * x.qty - bundleFor(x), 0),
    [items]
  );

  const value: CartContext = {
    items,
    isOpen,
    note,
    hydrated,
    count,
    subtotal,
    add,
    requestAdd,
    setQty,
    remove,
    clear,
    openCart,
    closeCart,
    setNote,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <CartDrawer />
      {/* Global "please sign in to add to cart" prompt — shown by requestAdd
          (e.g. the shop card "+" quick-add) when a guest tries to add. */}
      {loginPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-espresso/40" onClick={() => setLoginPrompt(null)} />
          <div className="relative z-[1] w-full max-w-sm rounded-xl border border-line bg-cream p-6 text-center shadow-soft-lg">
            <h3 className="text-lg text-espresso">Please sign in</h3>
            <p className="mt-2 text-sm text-espresso/70">You need to be signed in to add items to your cart.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => { setLoginPrompt(null); try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } }}
                className="px-4 py-2 text-sm text-espresso/60 hover:text-espresso"
              >
                Cancel
              </button>
              <a href={`/authentication/login?redirect=${encodeURIComponent(loginPrompt.redirect)}`} className="btn-lh">
                Sign in
              </a>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
