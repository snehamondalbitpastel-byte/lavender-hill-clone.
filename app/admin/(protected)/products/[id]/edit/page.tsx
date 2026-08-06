import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeContent } from "@/lib/products";
import ProductForm from "@/app/components/admin/ProductForm";

type Colour = { name: string; hex: string; image: string; hover: string; stock?: number | null; sizeStock?: Record<string, number | null> };

function parseContent(json: string) {
  try {
    return normalizeContent(JSON.parse(json || "{}"));
  } catch {
    return normalizeContent({});
  }
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  // Where "← Products" / Cancel should return — the list page the admin came
  // from (validated to an internal /admin/products path), else the list root.
  const from = (await searchParams).from;
  const backHref = from && from.startsWith("/admin/products") ? from : "/admin/products";
  const [p, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }] }),
  ]);
  if (!p) notFound();

  const initial = {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    category: p.category,
    productType: p.productType,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? "",
    discountType: p.discountType,
    discountValue: p.discountValue ? String(p.discountValue) : "",
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge ?? "",
    sizes: JSON.parse(p.sizes) as string[],
    // Stock lives in colourData; the form edits it as strings (blank = unlimited),
    // so map the stored number|null back to strings — colour-level `stock` and the
    // per-size `sizeStock` map.
    colours: (JSON.parse(p.colourData) as Colour[]).map((c) => ({
      name: c.name,
      hex: c.hex,
      image: c.image,
      hover: c.hover,
      stock: c.stock != null ? String(c.stock) : "",
      sizeStock: Object.fromEntries(
        Object.entries(c.sizeStock ?? {}).map(([sz, v]) => [sz, v != null ? String(v) : ""])
      ),
    })),
    content: parseContent(p.content),
    bestseller: p.bestseller,
    isNew: p.isNew,
  };

  return (
    <div>
      <header className="mb-6 flex items-center gap-4">
        <Link href={backHref} className="text-xs text-espresso/50 hover:text-espresso whitespace-nowrap">← Products</Link>
        <div className="flex-1 text-center">
          <p className="eyebrow text-taupe">Catalog</p>
          <h1 className="text-xl mt-0.5 tracking-[0.04em]">Edit product</h1>
          <p className="text-xs text-espresso/50 mt-0.5">{p.title}</p>
        </div>
        <span className="w-16 shrink-0" aria-hidden="true" />
      </header>
      <ProductForm initial={initial} categories={categories} backHref={backHref} />
    </div>
  );
}
