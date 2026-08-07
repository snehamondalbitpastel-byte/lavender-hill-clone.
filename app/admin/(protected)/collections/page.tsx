import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CollectionsManager from "@/app/components/admin/CollectionsManager";

export default async function AdminCollectionsPage() {
  await requireAdmin();

  const collections = await prisma.collection.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Shop by Category tiles</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The category tiles on the home page (“Find your perfect t-shirt”). Add, edit, reorder — and
          set exactly where each tile links (e.g. a collection page).
        </p>
      </header>

      <CollectionsManager
        tiles={collections.map((c) => ({ id: c.id, title: c.title, href: c.href, image: c.image, order: c.order }))}
      />
    </div>
  );
}
