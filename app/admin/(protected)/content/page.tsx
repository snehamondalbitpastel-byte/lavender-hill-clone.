import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function AdminContentPage() {
  await requireAdmin();

  const [brand, menuGroups, collectionPages] = await Promise.all([
    prisma.brandContent.findFirst(),
    prisma.menuGroup.findMany({
      orderBy: { order: "asc" },
      include: { links: { orderBy: { order: "asc" } } },
    }),
    prisma.collectionPage.findMany(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Content</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The editable pieces of the storefront pages.
        </p>
      </header>

      {/* Behind the Brand */}
      <section className="bg-cream border border-line rounded-xl shadow-soft p-6">
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-3">
          Behind the Brand
        </h2>
        {brand ? (
          <div>
            <p className="text-espresso font-medium">{brand.title}</p>
            <p className="text-sm text-espresso/60 mt-2 max-w-2xl">{brand.description}</p>
          </div>
        ) : (
          <p className="text-sm text-espresso/40">No brand content yet.</p>
        )}
      </section>

      {/* Mega-menu */}
      <section className="bg-cream border border-line rounded-xl shadow-soft p-6">
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-4">
          Shop mega-menu — {menuGroups.length} groups
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
          {menuGroups.map((g) => (
            <div key={g.id}>
              <p className="text-[13px] text-espresso font-medium mb-1.5">{g.title}</p>
              <ul className="text-xs text-espresso/55 flex flex-col gap-1">
                {g.links.map((link) => (
                  <li key={link.id}>{link.label}</li>
                ))}
                {g.links.length === 0 && <li className="text-espresso/30">(no sub-links)</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Collection page banners */}
      <section className="bg-cream border border-line rounded-xl shadow-soft p-6">
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-3">
          Listing-page banners — {collectionPages.length}
        </h2>
        <ul className="flex flex-col gap-2">
          {collectionPages.map((p) => (
            <li key={p.id} className="text-sm">
              <span className="text-espresso font-medium">{p.title}</span>
              <span className="text-espresso/40 ml-2 text-xs">/{p.slug}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
