"use client";

import { useFetch } from "@/hooks/useFetch";
import { getBestsellerCards, type Card } from "@/lib/api";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

// "Our Bestselling T-Shirts" — home-page grid of the products an admin ticked as
// Bestseller (Product form → "Feature in Our Bestselling T-Shirts"). Fully
// data-driven; hides itself when nothing is flagged.
export default function BestSellers() {
  const { data, loading } = useFetch<Card[]>(getBestsellerCards);

  // Cards are one-per-colour → collapse to one card per product, and strip the
  // colour prefix so the title reads as the product name.
  const items: Card[] = [];
  const seen = new Set<string>();
  for (const c of data ?? []) {
    if (seen.has(c.productSlug)) continue;
    seen.add(c.productSlug);
    const title =
      c.colour && c.title.startsWith(`${c.colour} `) ? c.title.slice(c.colour.length + 1) : c.title;
    items.push({ ...c, title });
  }

  // Nothing flagged → don't render an empty band.
  if (!loading && items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="container-lh">
        <div className="text-center mb-10 md:mb-14">
          <p className="eyebrow text-espresso/60 mb-3">Shop the favourites</p>
          <h2 className="text-2xl md:text-3xl">Our Bestselling T-Shirts</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : items.map((p) => (
                <ProductCard key={p.id} p={p} colourHint={p.colour ?? undefined} />
              ))}
        </div>
      </div>
    </section>
  );
}
