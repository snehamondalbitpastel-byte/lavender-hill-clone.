import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import MenuManager from "@/app/components/admin/MenuManager";

export default async function AdminMenuPage() {
  await requireAdmin();
  const [groups, pages] = await Promise.all([
    prisma.menuGroup.findMany({ orderBy: { order: "asc" }, include: { links: { orderBy: { order: "asc" } } } }),
    prisma.page.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, slug: true, title: true } }),
  ]);

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Menus</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The navbar dropdown menus. Pick a menu (<b>About</b> or <b>Shop</b>), add <b>columns</b>, and under each column add
          <b> links</b> — each link opens a <b>Page</b>. Add as many or as few as you like; the dropdown lays them out
          automatically. Hovering the nav item shows the columns; clicking it opens the first link.
        </p>
      </header>
      <MenuManager groups={groups} pages={pages} />
    </div>
  );
}
