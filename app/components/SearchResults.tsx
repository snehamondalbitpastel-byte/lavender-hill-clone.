"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { type Card } from "@/lib/api";

// Full "View all results" page grid — reads ?q= and lists every matching product
// (up to 48) as full shop cards (swatches + rating + price, currency-aware).

export default function SearchResults() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [products, setProducts] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (q.length < 2) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=48`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setProducts(d.products || []);
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <section className="px-4 py-10 md:px-12 lg:px-[53px] lg:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-[clamp(1.375rem,1.17rem+0.86vw,1.925rem)] mb-2">Search results</h1>
        <p className="text-sm text-espresso/55">
          {q ? <>{products.length} result{products.length === 1 ? "" : "s"} for “{q}”</> : "Type a search term."}
        </p>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-espresso/45">Searching…</p>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-sm text-espresso/45">
          No results could be found. Please try again with a different query.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} colourHint={p.colour ?? undefined} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
