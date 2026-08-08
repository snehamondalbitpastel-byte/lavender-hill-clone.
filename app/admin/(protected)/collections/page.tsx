import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import CollectionsManager from "@/app/components/admin/CollectionsManager";

export default async function AdminCollectionsPage() {
  await requireAdmin();

  const collections = await prisma.collection.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront · Home page</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Home Tiles</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The “Shop by Category” tiles on the home page (“Find your perfect t-shirt”). Add, edit,
          reorder — and set exactly where each tile links (usually a Collection page,
          e.g. <code className="text-espresso/70">/collections/short-sleeve-t-shirts</code>).
        </p>
      </header>

      <CollectionsManager
        tiles={collections.map((c) => ({ id: c.id, title: c.title, href: c.href, image: c.image, order: c.order }))}
      />
    </div>
  );
}
