import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function AdminCollectionsPage() {
  await requireAdmin();

  const collections = await prisma.collection.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Catalog</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Collections</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The category groupings featured on the home page.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((c) => (
          <div key={c.id} className="bg-cream border border-line rounded-xl shadow-soft overflow-hidden">
            <div className="relative aspect-[4/3] bg-beige">
              <Image src={c.image} alt="" fill className="object-cover" sizes="(max-width:700px) 100vw, 33vw" />
            </div>
            <div className="p-4">
              <p className="text-espresso">{c.title}</p>
              <p className="text-[11px] text-espresso/40 mt-0.5 truncate">{c.image}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
