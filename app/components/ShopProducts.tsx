"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import { getCards, getSaleCards, getNewInCards, getBestsellerCards, type Card } from "@/lib/api";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import { useT } from "./LocaleProvider";

type SortKey = "featured" | "az" | "za" | "price-asc" | "price-desc";

const SORT_OPTIONS: { key: SortKey; tkey: string; label: string }[] = [
  { key: "featured", tkey: "shop.sort_featured", label: "Featured" },
  { key: "az", tkey: "shop.sort_az", label: "Alphabetically, A-Z" },
  { key: "za", tkey: "shop.sort_za", label: "Alphabetically, Z-A" },
  { key: "price-asc", tkey: "shop.sort_price_asc", label: "Price, low to high" },
  { key: "price-desc", tkey: "shop.sort_price_desc", label: "Price, high to low" },
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

// Count + paginate by PRODUCT (48/page) so the header matches the backend/admin
// product count, even though the grid renders one card per colour.
const PER_PAGE = 48;

// "Rs. 7,300.00" -> 7300
function priceOf(p: Card): number {
  return parseFloat(p.price.replace(/[^0-9.]/g, "")) || 0;
}

// Filter facets are derived from the products' own attributes.
type FilterKey = "productType" | "colour" | "size";
const FILTER_KEYS: FilterKey[] = ["productType", "colour", "size"];
const FILTER_LABELS: Record<FilterKey, string> = {
  productType: "Product type",
  colour: "Colour",
  size: "Size",
};
function cardValues(c: Card, key: FilterKey): string[] {
  if (key === "productType") return c.productType ? [c.productType] : [];
  if (key === "colour") return c.colour ? [c.colour] : [];
  return c.sizes ?? [];
}

export default function ShopProducts({
  category,
  saleOnly = false,
  newIn = false,
  bestseller = false,
}: { category?: string; saleOnly?: boolean; newIn?: boolean; bestseller?: boolean } = {}) {
  // Sale / New In / Bestseller / category collections all reuse this exact grid +
  // filter, just fetching a different slice of cards. Same data-driven facets,
  // live counts, and "Clear all" as the main shop — so every listing page filters
  // identically.
  const { data, loading } = useFetch<Card[]>(
    () =>
      bestseller
        ? getBestsellerCards()
        : newIn
          ? getNewInCards()
          : saleOnly
            ? getSaleCards()
            : getCards(category),
    bestseller
      ? "cards:bestseller"
      : newIn
        ? "cards:new"
        : saleOnly
          ? "cards:sale"
          : `cards:cat:${category ?? "all"}`
  );
  const router = useRouter();
  const { t, locale } = useT();
  // A stable key per listing (shop / sale / new-in / bestseller / each category)
  // so the applied view is remembered separately for each — see the persist +
  // restore effects below.
  const scope = bestseller ? "bestseller" : newIn ? "new" : saleOnly ? "sale" : `cat:${category ?? "all"}`;
  const STORE_KEY = `lh_shopview:${scope}`;
  // Localized DISPLAY labels for the dynamic facet values (product types, colours,
  // sizes). The underlying English values still drive filtering/links/cart; only
  // the shown text is localized (via /api/translate). Base locale → identity.
  const [valueLabels, setValueLabels] = useState<Record<string, string>>({});
  const lbl = (v: string) => valueLabels[v] ?? v;
  const [sort, setSort] = useState<SortKey>("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>("compact");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    productType: [],
    colour: [],
    size: [],
  });
  // Draft selections live INSIDE the drawer — the grid only updates when the
  // shopper clicks "View results" (or resets via "Clear all").
  const [draft, setDraft] = useState<Record<FilterKey, string[]>>({
    productType: [],
    colour: [],
    size: [],
  });
  const [filterOpen, setFilterOpen] = useState(false); // drawer mounted in DOM
  const [drawerShown, setDrawerShown] = useState(false); // slid into view
  const topRef = useRef<HTMLDivElement>(null);

  // ---- Persist the applied view (filters / sort / page / layout) per listing ----
  // Without this, opening a product from the results and coming back reset the
  // filter (component unmounts → state lost). Now the applied filter STAYS until
  // the shopper clears it. `restored` gates the save so we never overwrite the
  // stored value with the initial empty defaults on first mount.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as {
          filters?: Record<FilterKey, string[]>;
          sort?: SortKey;
          page?: number;
          layout?: Layout;
        };
        if (v.filters && typeof v.filters === "object") {
          const f: Record<FilterKey, string[]> = {
            productType: Array.isArray(v.filters.productType) ? v.filters.productType : [],
            colour: Array.isArray(v.filters.colour) ? v.filters.colour : [],
            size: Array.isArray(v.filters.size) ? v.filters.size : [],
          };
          setFilters(f);
          setDraft(f);
        }
        if (v.sort) setSort(v.sort);
        if (typeof v.page === "number" && v.page >= 1) setPage(v.page);
        if (v.layout) setLayout(v.layout);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORE_KEY]);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ filters, sort, page, layout }));
    } catch {
      /* ignore quota / private mode */
    }
  }, [restored, STORE_KEY, filters, sort, page, layout]);

  // Localize the unique facet VALUES for display (product types, colours, sizes).
  // English values still drive filtering; only the shown label changes.
  useEffect(() => {
    if (locale === "en" || !data || data.length === 0) { setValueLabels({}); return; }
    const vals = new Set<string>();
    for (const c of data) {
      if (c.productType) vals.add(c.productType);
      if (c.colour) vals.add(c.colour);
      for (const s of c.sizes ?? []) vals.add(s);
    }
    const uniq = [...vals];
    if (uniq.length === 0) return;
    let cancelled = false;
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: uniq }),
    })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        if (cancelled || !Array.isArray(d.translations)) return;
        const m: Record<string, string> = {};
        uniq.forEach((s, i) => { m[s] = d.translations![i] ?? s; });
        setValueLabels(m);
      })
      .catch(() => { /* fall back to English facet labels */ });
    return () => { cancelled = true; };
  }, [data, locale]);

  // Mount first (off-screen), then flip to the on-screen transform next frame so
  // the panel slides in from the right edge (and slides back out on close).
  function openFilter() {
    setDraft(filters); // start the drawer from what's currently applied
    setFilterOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawerShown(true)));
  }
  function closeFilter() {
    setDrawerShown(false);
    window.setTimeout(() => setFilterOpen(false), 300);
  }

  // colour name -> its hex, for the swatch dots in the Colour facet.
  const colourHex = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data ?? []) {
      if (c.colour && c.swatch && !map.has(c.colour)) map.set(c.colour, c.swatch);
    }
    return map;
  }, [data]);

  // 1. Sort
  const sorted = useMemo(() => {
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
    }
    return list;
  }, [data, sort]);

  // 2. Filter — a card matches a facet if it has NO selected values there, or one
  //    of its values is selected. `except` skips a dimension (for facet counts).
  //    `set` is the filter set to apply: APPLIED `filters` for the grid, or the
  //    in-progress `draft` for the drawer's live facet counts.
  const matchesWith = (c: Card, set: Record<FilterKey, string[]>, except?: FilterKey) =>
    FILTER_KEYS.every((k) => {
      if (k === except) return true;
      const sel = set[k];
      return sel.length === 0 || cardValues(c, k).some((v) => sel.includes(v));
    });

  // The grid reflects only the APPLIED filters (not the in-drawer draft).
  const filtered = useMemo(
    () => sorted.filter((c) => matchesWith(c, filters)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, filters]
  );

  // Facet options + live counts, computed against the in-progress DRAFT so the
  // numbers update as the shopper builds a selection (a facet's own dimension is
  // excluded so it doesn't shrink its own list).
  const facets = useMemo(() => {
    const build = (key: FilterKey) => {
      // Count DISTINCT PRODUCTS per value so the number matches the backend/admin
      // product count (the grid still renders one card per colour). e.g. a type
      // with 1 product in 5 colours counts as 1. Purely derived, never static.
      const seen = new Map<string, Set<string>>();
      for (const c of data ?? []) {
        if (!matchesWith(c, draft, key)) continue;
        for (const v of cardValues(c, key)) {
          let set = seen.get(v);
          if (!set) { set = new Set(); seen.set(v, set); }
          set.add(c.productSlug);
        }
      }
      return [...seen.entries()]
        .map(([v, set]) => [v, set.size] as [string, number])
        .sort((a, b) => a[0].localeCompare(b[0]));
    };
    return {
      productType: build("productType"),
      colour: build("colour"),
      size: build("size"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, draft]);

  // Applied count → the toolbar "Filter (N)" badge. Draft count → the drawer's
  // "Clear all" visibility.
  const activeCount = filters.productType.length + filters.colour.length + filters.size.length;
  const draftCount = draft.productType.length + draft.colour.length + draft.size.length;

  // Toggling inside the drawer only touches the DRAFT — nothing applies to the
  // grid until "View results".
  function toggleDraft(key: FilterKey, value: string) {
    setDraft((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }
  const clearDraft = () => setDraft({ productType: [], colour: [], size: [] });
  // "View results" — apply the draft to the grid, then close.
  const applyDraft = () => {
    setFilters(draft);
    setPage(1);
    closeFilter();
  };
  // Full reset (empty-state button): clears applied + draft.
  const resetFilters = () => {
    setFilters({ productType: [], colour: [], size: [] });
    setDraft({ productType: [], colour: [], size: [] });
    setPage(1);
  };

  // 3. Count + paginate by PRODUCT so the number matches the backend/admin (the
  //    grid still shows one card per colour within each product's page slot).
  const productOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const c of filtered) {
      if (!seen.has(c.productSlug)) {
        seen.add(c.productSlug);
        order.push(c.productSlug);
      }
    }
    return order;
  }, [filtered]);

  const totalProducts = productOrder.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageSlugs = useMemo(
    () => new Set(productOrder.slice((current - 1) * PER_PAGE, current * PER_PAGE)),
    [productOrder, current]
  );
  const pageItems = filtered.filter((c) => pageSlugs.has(c.productSlug));

  // Show ONE card per PRODUCT (the shop lists products, not every colour). Use the
  // card that matches the active colour filter when set, else the product's first
  // colour; and strip the colour prefix so the title reads as the product name.
  const displayItems = useMemo(() => {
    const seen = new Set<string>();
    const out: Card[] = [];
    for (const c of pageItems) {
      if (seen.has(c.productSlug)) continue;
      seen.add(c.productSlug);
      const title =
        c.colour && c.title.startsWith(`${c.colour} `) ? c.title.slice(c.colour.length + 1) : c.title;
      out.push({ ...c, title });
    }
    return out;
  }, [pageItems]);

  function goToPage(n: number) {
    setPage(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef}>
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
                  layout === l.value ? "text-espresso" : "text-espresso/40 hover:text-espresso/70"
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
                : (totalProducts === 1
                    ? t("shop.count_one", "{n} product")
                    : t("shop.count_other", "{n} products")
                  ).replace("{n}", String(totalProducts))}
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
              {t("shop.sort_by", "Sort by")}
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
                        setPage(1);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-beige transition-colors ${
                        sort === o.key ? "font-medium" : "text-espresso/80"
                      }`}
                    >
                      {t(o.tkey, o.label)}
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
              onClick={openFilter}
              className="eyebrow text-espresso/70 hover:text-espresso transition-colors flex items-center gap-1.5"
            >
              {t("shop.filter", "Filter")}
              {activeCount > 0 && (
                <span className="text-[10px] bg-espresso text-cream rounded-full px-1.5 py-0.5 leading-none">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product grid (density from the layout switch) */}
      <div className="px-6 md:px-12 lg:px-14">
        {loading ? (
          // Skeleton grid while the cards are being fetched.
          <div className={`grid ${GRID[layout]} gap-x-4 gap-y-10 md:gap-x-6`}>
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          activeCount > 0 ? (
            // Empty because of active filters → reset the filter selections.
            <div className="py-16 text-center">
              <p className="text-espresso/70">{t("shop.no_matching", "No matching products found.")}</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center rounded-md border border-espresso px-5 py-2 text-sm text-espresso transition-colors hover:bg-espresso hover:text-cream"
              >
                {t("shop.clear_filters", "Clear all filters")}
              </button>
            </div>
          ) : (
            // Empty category/collection (no products here at all) → "Clear all"
            // takes the shopper back to the previous page where results showed.
            <div className="py-16 text-center">
              <p className="text-espresso/70">{t("shop.no_products", "No products found.")}</p>
              <button
                type="button"
                onClick={() => router.back()}
                className="mt-4 inline-flex items-center rounded-md border border-espresso px-5 py-2 text-sm text-espresso transition-colors hover:bg-espresso hover:text-cream"
              >
                {t("shop.clear_all", "Clear all")}
              </button>
            </div>
          )
        ) : (
          <div className={`grid ${GRID[layout]} gap-x-4 gap-y-10 md:gap-x-6`}>
            {displayItems.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                // Open the detail page on the shown colour (the filtered colour when
                // a colour filter is active, else the product's first colour).
                colourHint={p.colour ?? undefined}
                // Carry the size the shopper filtered by (the first selected size
                // this card actually offers) into the product link.
                sizeHint={filters.size.find((s) => (p.sizes ?? []).includes(s))}
              />
            ))}
          </div>
        )}

        {/* Pagination — matches the live theme's centered grid of page cells. */}
        {totalPages > 1 && (
          <nav
            role="navigation"
            aria-label="Pagination navigation"
            className="mt-14 md:mt-20 flex justify-center"
          >
            <div className="inline-grid grid-flow-col border-b border-line [grid-auto-rows:minmax(0,2.8125rem)] [grid-auto-columns:minmax(0,2.625rem)] md:[grid-auto-columns:minmax(0,3.75rem)]">
              {current > 1 && (
                <button
                  type="button"
                  onClick={() => goToPage(current - 1)}
                  aria-label={`Go to page ${current - 1}`}
                  className="flex items-center justify-center text-espresso/70 hover:text-espresso transition-colors"
                >
                  <svg width="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="m7 9-4-4 4-4" stroke="currentColor" strokeLinecap="square" />
                  </svg>
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
                n === current ? (
                  <span
                    key={n}
                    aria-current="page"
                    className="flex items-center justify-center text-sm text-espresso underline underline-offset-4"
                  >
                    {n}
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    aria-label={`Go to page ${n}`}
                    className="flex items-center justify-center text-sm text-espresso/70 hover:text-espresso transition-colors"
                  >
                    {n}
                  </button>
                )
              )}

              {current < totalPages && (
                <button
                  type="button"
                  rel="next"
                  onClick={() => goToPage(current + 1)}
                  aria-label={`Go to page ${current + 1}`}
                  className="flex items-center justify-center text-espresso/70 hover:text-espresso transition-colors"
                >
                  <svg width="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="m3 9 4-4-4-4" stroke="currentColor" strokeLinecap="square" />
                  </svg>
                </button>
              )}
            </div>
          </nav>
        )}
      </div>

      {/* Filter drawer — slides in from the right edge (matches the live theme) */}
      {filterOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filter">
          {/* Scrim fades in */}
          <div
            className={`absolute inset-0 bg-espresso/40 transition-opacity duration-300 ease-out ${
              drawerShown ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeFilter}
          />
          {/* Panel slides right→left */}
          <div
            className={`absolute right-0 top-0 h-full w-[min(92vw,25rem)] bg-cream shadow-soft-lg flex flex-col transition-transform duration-300 ease-out ${
              drawerShown ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-8 py-[1.125rem] border-b border-line">
              <span className="text-sm uppercase tracking-[0.2em] text-espresso">{t("shop.filters", "Filters")}</span>
              <button type="button" onClick={closeFilter} aria-label="Close filters" className="text-espresso/60 hover:text-espresso">
                <svg width="16" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8">
              {FILTER_KEYS.map((key) => (
                <FacetGroup
                  key={key}
                  title={t(`shop.facet_${key}`, FILTER_LABELS[key])}
                  options={facets[key]}
                  selected={draft[key]}
                  onToggle={(v) => toggleDraft(key, v)}
                  swatches={key === "colour" ? colourHex : undefined}
                  labelFor={lbl}
                />
              ))}
            </div>

            <div className="border-t border-line px-8 py-6">
              {draftCount > 0 && (
                <button type="button" onClick={clearDraft} className="block w-full text-center text-sm text-espresso/60 hover:text-espresso underline underline-offset-2 mb-4">
                  {t("shop.clear_all", "Clear all")}
                </button>
              )}
              <button type="button" onClick={applyDraft} className="btn-lh w-full">
                {t("shop.view_results", "View results")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// A light colour needs a hairline border to be visible on the cream drawer
// (the live theme borders "White" the same way).
function isLightHex(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.88;
}

// One collapsible facet group. COLLAPSED by default (matches live). When a
// `swatches` map is supplied (the Colour facet) it renders circular colour
// chips (.color-swatch); otherwise a list of dot-checkbox rows.
function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  swatches,
  labelFor = (v) => v,
}: {
  title: string;
  options: [string, number][];
  selected: string[];
  onToggle: (value: string) => void;
  swatches?: Map<string, string>;
  labelFor?: (value: string) => string; // localized display label for a value
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left py-4"
      >
        <span className="font-heading font-light uppercase tracking-[0.2em] text-[0.8125rem] text-espresso">
          {title}
        </span>
        <svg
          width="11"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m1 3 4 4 4-4" stroke="currentColor" strokeLinecap="square" />
        </svg>
      </button>

      {open &&
        (swatches ? (
          // Colour chips — h-stack wrap; selected ring, tooltip = name + count.
          <ul className="flex flex-wrap gap-2.5 pb-5 pt-1">
            {options.map(([value, count]) => {
              const hex = swatches.get(value) || "#d8d2c8";
              const sel = selected.includes(value);
              return (
                <li key={value}>
                  <button
                    type="button"
                    onClick={() => onToggle(value)}
                    aria-pressed={sel}
                    title={`${labelFor(value)} (${count})`}
                    className={`color-swatch${sel ? " is-selected" : ""}${
                      isLightHex(hex) ? " is-bordered" : ""
                    }`}
                    style={
                      {
                        "--swatch-background": `linear-gradient(to right, ${hex}, ${hex})`,
                      } as React.CSSProperties
                    }
                  >
                    <span className="sr-only">{labelFor(value)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          // Product type / Size — v-stack of dot-checkbox rows.
          <ul className="flex flex-col gap-2.5 pb-5 pt-1">
            {options.map(([value, count]) => (
              <li key={value}>
                <label className="checkbox-control">
                  <input
                    type="checkbox"
                    className="dot-checkbox"
                    checked={selected.includes(value)}
                    onChange={() => onToggle(value)}
                  />
                  <span>
                    {labelFor(value)} ({count})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
