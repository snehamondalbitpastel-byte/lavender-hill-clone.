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
import CartDrawer from "./CartDrawer";
import { maxQtyFor } from "@/lib/inventory";

// ============================================================
// Client-side cart — lives in the browser (localStorage). No server/DB;
// products are referenced by what's captured at add-time. An Order is only
// created at checkout (a later phase).
// ============================================================

export type CartItem = {
  key: string; // productId|colour|size — identifies a line
  productId: number;
  slug: string;
  title: string;
  colour: string;
  size: string;
  image: string;
  price: number; // unit selling price
  compareAt: number | null; // original (struck) price if on sale
  badge: string | null; // e.g. "Buy 3+, Save 15%" → the bundle rule
  stock: number | null; // units available; null = not tracked (unlimited). Server re-checks at checkout.
  qty: number;
};

type CartContext = {
  items: CartItem[];
  isOpen: boolean;
  note: string;
  hydrated: boolean; // false until localStorage is read (avoids empty-cart flash)
  count: number;
  subtotal: number; // net of bundle discounts
  add: (item: Omit<CartItem, "key" | "qty"> & { qty?: number }) => void;
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

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

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

  const add = useCallback((it: Omit<CartItem, "key" | "qty"> & { qty?: number }) => {
    if (it.stock != null && it.stock <= 0) return; // out of stock → nothing to add
    const key = `${it.productId}|${it.colour}|${it.size}`;
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
    </Ctx.Provider>
  );
}
