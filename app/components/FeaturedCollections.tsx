"use client";

import { useFetch } from "@/hooks/useFetch";
import { getBestsellers, type Product } from "@/lib/api";
import ProductCard from "./ProductCard";

// "Our Bestselling T-Shirts" — the flagged subset via /api/products?bestseller=true.
export default function FeaturedCollections() {
  const { data: products } = useFetch<Product[]>(getBestsellers);

  return (
    <section className="py-16 md:py-24 bg-beige">
      {/* Full-width (.container = 100%) with the theme gutter — near edge-to-edge,
          which also widens the cards so the product images are taller. */}
      <div className="w-full px-6 md:px-12 lg:px-14">
        <h2 className="text-2xl md:text-3xl text-center mb-12">
          Our Bestselling T-Shirts
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
          {(products ?? []).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
