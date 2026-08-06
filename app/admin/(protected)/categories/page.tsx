import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CategoriesManager from "@/app/components/admin/CategoriesManager";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Catalog</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Categories</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The category tree shoppers browse. Nest one under another (e.g. “Shop by
          Neckline” under “T-shirts”). Products are assigned a category on their edit page.
        </p>
      </header>
      <CategoriesManager categories={categories} />
    </div>
  );
}
