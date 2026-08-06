"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { getNewIn, type Product } from "@/lib/api";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import FiltersDrawer from "./FiltersDrawer";

type SortKey = "featured" | "az" | "za" | "price-asc" | "price-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "az", label: "Alphabetically, A-Z" },
  { key: "za", label: "Alphabetically, Z-A" },
  { key: "price-asc", label: "Price, low to high" },
  { key: "price-desc", label: "Price, high to low" },
];

// Layout switch — mirrors the live toolbar (large / medium / compact grids).
type Layout = "large" | "medium" | "compact";

const LAYOUTS: { value: Layout; label: string; path: string }[] = [
  {
    value: "large",
    label: "Larger product images",
    path: "M0 0h8v8H0zM0 10h8v8H0zM10 0h8v8h-8zM10 10h8v8h-8z",
  },
  {
    value: "medium",
    label: "Smaller product images",
    path: "M0 0h4v4H0zM0 7h4v4H0zM0 14h4v4H0zM7 0h4v4H7zM7 7h4v4H7zM7 14h4v4H7zM14 0h4v4h-4zM14 7h4v4h-4zM14 14h4v4h-4z",
  },
  {
    value: "compact",
    label: "Compact product images",
    path: "M0 0h18v2H0zm0 4h18v2H0zm0 4h18v2H0zm0 4h18v2H0zm0 4h18v2H0z",
  },
];

const GRID: Record<Layout, string> = {
  large: "grid-cols-2 lg:grid-cols-3",
  medium: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  compact: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
};

// "Rs. 7,300.00" -> 7300
function priceOf(p: Product): number {
  return parseFloat(p.price.replace(/[^0-9.]/g, "")) || 0;
}

export default function NewInProducts() {
  // Real "New Arrivals" products (distinct from the shop catalogue) via /api/new-in.
  const { data, loading } = useFetch<Product[]>(getNewIn);

  const [sort, setSort] = useState<SortKey>("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>("medium");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const products = useMemo(() => {
    const list = [...(data ?? [])];
    switch (sort) {
      case "az":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "za":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "price-asc":
        list.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case "price-desc":
        list.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      // "featured" keeps the original order
    }
    return list;
  }, [data, sort]);

  return (
    <div>
      {/* Full-bleed toolbar: layout switch · count · Sort by · Filter */}
      <div className="border-y border-line mb-8 md:mb-12">
        <div className="flex items-stretch min-h-[54px]">
          {/* Layout switch */}
          <div className="flex items-center gap-1.5 border-r border-line px-5 md:px-8">
            {LAYOUTS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLayout(l.value)}
                aria-label={l.label}
                aria-pressed={layout === l.value}
                className={`p-1 transition-colors ${
                  layout === l.value
                    ? "text-espresso"
                    : "text-espresso/40 hover:text-espresso/70"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path fill="currentColor" d={l.path} />
                </svg>
              </button>
            ))}
          </div>

          {/* Product count */}
          <div className="flex flex-1 items-center justify-center">
            <p className="eyebrow text-espresso/60">
              {loading
                ? "…"
                : `${products.length} product${products.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* Sort by */}
          <div className="relative flex items-center border-l border-line px-5 md:px-8">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="eyebrow text-espresso/70 hover:text-espresso transition-colors flex items-center gap-1.5"
            >
              Sort by
              <svg width="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="m1 3 4 4 4-4" stroke="currentColor" strokeLinecap="square" />
              </svg>
            </button>

            {sortOpen && (
              <ul
                role="listbox"
                className="absolute right-0 top-full mt-2 w-56 border border-line bg-cream shadow-soft-lg z-20 py-2"
              >
                {SORT_OPTIONS.map((o) => (
                  <li key={o.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === o.key}
                      onClick={() => {
                        setSort(o.key);
                        setSortOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-beige transition-colors ${
                        sort === o.key ? "font-medium" : "text-espresso/80"
                      }`}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center border-l border-line px-5 md:px-8">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              className="eyebrow text-espresso/70 hover:text-espresso transition-colors"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Product grid (density from the layout switch) */}
      <div className="px-6 md:px-12 lg:px-14">
        <div className={`grid ${GRID[layout]} gap-x-4 gap-y-10 md:gap-x-6`}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>

      {/* Filters drawer (static UI for now) */}
      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </div>
  );
}
