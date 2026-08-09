import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import MenuManager from "@/app/components/admin/MenuManager";

export default async function AdminMenuPage() {
  await requireAdmin();
  const [groups, collections] = await Promise.all([
    prisma.menuGroup.findMany({
      orderBy: { order: "asc" },
      include: { links: { orderBy: { order: "asc" } } },
    }),
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
      select: { handle: true, label: true },
    }),
  ]);

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Shop Menu</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The <b>Shop</b> hover mega-menu. Each <b>column</b> is just a heading; each <b>link</b> points to a
          collection (or any URL). Create collections in <b>Collections</b>, then pick them here —
          you never create a collection twice. The storefront dropdown updates automatically.
        </p>
      </header>
      <MenuManager groups={groups} collections={collections} />
    </div>
  );
}
