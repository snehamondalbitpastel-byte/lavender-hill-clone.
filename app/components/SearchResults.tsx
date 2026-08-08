"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useCurrency } from "./CurrencyProvider";

// Full "View all results" page grid — reads ?q= and lists every matching product
// (up to 48). Prices localize to the chosen currency, like the rest of the store.

type Product = { slug: string; title: string; image: string; price: string; compareAt: string | null };

export default function SearchResults() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const { localize } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
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
        <p className="py-16 text-center text-sm text-espresso/45">No products found.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6">
          {products.map((p) => (
            <li key={p.slug}>
              <a href={`/products/${p.slug}`} className="group block">
                <span className="relative block aspect-[2/3] overflow-hidden bg-white">
                  <Image src={p.image} alt={p.title} fill sizes="(max-width:640px) 45vw, 22vw" className="object-cover transition-opacity duration-300 group-hover:opacity-90" />
                </span>
                <span className="mt-3 block text-center text-sm text-espresso group-hover:text-taupe">{p.title}</span>
                <span className="block text-center text-sm text-espresso/60">
                  {p.compareAt ? (
                    <>
                      <span className="text-plum">{localize(p.price)}</span>{" "}
                      <s className="text-espresso/40">{localize(p.compareAt)}</s>
                    </>
                  ) : (
                    localize(p.price)
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
