import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "@/app/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }] });
  return (
    <div>
      <header className="mb-6 flex items-center gap-4">
        <Link href="/admin/products" className="text-xs text-espresso/50 hover:text-espresso whitespace-nowrap">← Products</Link>
        <div className="flex-1 text-center">
          <p className="eyebrow text-taupe">Catalog</p>
          <h1 className="text-xl mt-0.5 tracking-[0.04em]">Add product</h1>
        </div>
        <span className="w-16 shrink-0" aria-hidden="true" />
      </header>
      <ProductForm categories={categories} />
    </div>
  );
}
