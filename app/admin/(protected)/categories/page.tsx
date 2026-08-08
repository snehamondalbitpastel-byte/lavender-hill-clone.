import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoriesManager from "@/app/components/admin/CategoriesManager";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }] }),
    prisma.product.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, image: true, category: true, categories: true },
    }),
  ]);

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Catalog</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Collections</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The collections shoppers browse — each one is a <code className="text-espresso/70">/collections/&lt;name&gt;</code> page.
          Add a collection, then <b>Edit</b> it to set its heading, descriptions, sub-categories and
          which products it contains. New collections appear automatically on every product's edit page.
        </p>
      </header>
      <CategoriesManager categories={categories} products={products} />
    </div>
  );
}
