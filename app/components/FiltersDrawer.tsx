"use client";

import { useState } from "react";

// ============================================================
// STATIC filter facets — taken from the live New Arrivals drawer.
// UI only for now (checking a box doesn't filter yet). Later: derive these
// from the product data and wire the checkboxes to the query / product list.
// ============================================================
const PRODUCT_TYPES: { label: string; count: number }[] = [
  { label: "Lavender Scented Toiletries", count: 1 },
  { label: "Women's 3/4 Sleeve T-shirt", count: 4 },
  { label: "Women's Crew Neck T-shirts", count: 1 },
  { label: "Women's Half Sleeve T-shirt", count: 3 },
  { label: "Women's Jumpers", count: 1 },
  { label: "Women's Long Sleeve T-shirt", count: 6 },
  { label: "Women's Lounge Pants", count: 1 },
  { label: "Women's Nightwear", count: 2 },
  { label: "Women's Short Sleeve T-shirt", count: 5 },
  { label: "Women's Sleeveless Top", count: 5 },
  { label: "Women's Socks", count: 1 },
  { label: "Women's Trousers / Leggings", count: 1 },
];

const COLOURS: { name: string; hex: string }[] = [
  { name: "Birch", hex: "#deb39c" },
  { name: "Black", hex: "#000000" },
  { name: "Blue", hex: "#3160a6" },
  { name: "Chocolate", hex: "#d2691e" },
  { name: "Coffee", hex: "#6f4e37" },
  { name: "Cream", hex: "#e7dac8" },
  { name: "Crimson", hex: "#dc143c" },
  { name: "Dark Red", hex: "#c23331" },
  { name: "Foam", hex: "#669eab" },
  { name: "Green", hex: "#008000" },
  { name: "Ivory", hex: "#fffff0" },
  { name: "Lavender", hex: "#b4adce" },
  { name: "Light Blue", hex: "#b3cbdc" },
  { name: "Light Grey", hex: "#d3d3d3" },
  { name: "Light Pink", hex: "#efcfd9" },
  { name: "Mango", hex: "#e3af57" },
  { name: "Natural", hex: "#d2c1b6" },
  { name: "Navy", hex: "#24243d" },
  { name: "Olive", hex: "#7c7a69" },
  { name: "Peach Puff", hex: "#ffdab9" },
  { name: "Pink", hex: "#be5a9f" },
  { name: "Red", hex: "#ff0000" },
  { name: "Rosy Brown", hex: "#8f7060" },
  { name: "Royal Blue", hex: "#133e93" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "Taupe", hex: "#d6b39e" },
  { name: "Violet", hex: "#4540a0" },
  { name: "White", hex: "#ffffff" },
  { name: "Wine", hex: "#740f21" },
  { name: "Yellow", hex: "#e2dcb4" },
];

const SIZES: { label: string; count: number }[] = [
  { label: "XXS", count: 5 },
  { label: "XS", count: 28 },
  { label: "S", count: 28 },
  { label: "M", count: 28 },
  { label: "L", count: 28 },
  { label: "XL", count: 28 },
  { label: "XXL", count: 10 },
  { label: "One Size", count: 1 },
  { label: "UK 8", count: 1 },
  { label: "UK 10", count: 1 },
  { label: "UK 12", count: 1 },
  { label: "UK 14", count: 1 },
  { label: "UK 16", count: 1 },
];

// Accordion (details/summary) — one facet group.
function Accordion({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4"
      >
        <span className="eyebrow text-espresso">{title}</span>
        <svg
          width="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m1 3 4 4 4-4" stroke="currentColor" strokeLinecap="square" />
        </svg>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

// A round "dot" checkbox row (Product type / Size).
function CheckRow({ label, count }: { label: string; count: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm text-espresso/80 hover:text-espresso">
      <input type="checkbox" className="peer sr-only" />
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-espresso/40 transition-colors peer-checked:border-espresso peer-checked:bg-espresso">
        <span className="h-1.5 w-1.5 rounded-full bg-cream opacity-0 peer-checked:opacity-100" />
      </span>
      <span>
        {label} <span className="text-espresso/40">({count})</span>
      </span>
    </label>
  );
}

export default function FiltersDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-espresso/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel (drawer--sm, slides from the right) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[26rem] flex-col bg-cream shadow-soft-lg transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <p className="text-lg">Filters</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <svg width="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6">
          <Accordion title="Product type">
            <div className="flex flex-col">
              {PRODUCT_TYPES.map((t) => (
                <CheckRow key={t.label} label={t.label} count={t.count} />
              ))}
            </div>
          </Accordion>

          <Accordion title="Colour">
            <div className="flex flex-wrap gap-2">
              {COLOURS.map((c) => (
                <label
                  key={c.name}
                  className="relative cursor-pointer"
                  title={c.name}
                >
                  <input type="checkbox" className="peer sr-only" />
                  <span
                    className="block h-6 w-6 rounded-full border border-line transition-shadow peer-checked:ring-2 peer-checked:ring-espresso peer-checked:ring-offset-1 peer-checked:ring-offset-cream"
                    style={{ background: c.hex }}
                  />
                  <span className="sr-only">{c.name}</span>
                </label>
              ))}
            </div>
          </Accordion>

          <Accordion title="Size">
            <div className="flex flex-col">
              {SIZES.map((s) => (
                <CheckRow key={s.label} label={s.label} count={s.count} />
              ))}
            </div>
          </Accordion>
        </div>

        {/* Footer */}
        <div className="border-t border-line p-6">
          <button type="button" onClick={onClose} className="btn-lh w-full">
            View results
          </button>
        </div>
      </div>
    </div>
  );
}
