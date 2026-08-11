import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import LooksManager from "@/app/components/admin/LooksManager";

export default async function AdminLooksPage() {
  await requireAdmin();
  const [rows, products] = await Promise.all([
    prisma.look.findMany({ orderBy: { order: "asc" } }),
    prisma.product.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, title: true, slug: true } }),
  ]);
  const looks = rows.map((l) => ({
    id: l.id,
    look: l.look,
    hotspotTop: l.hotspotTop,
    hotspotLeft: l.hotspotLeft,
    productSlug: l.productSlug,
    name: l.name,
    price: l.price,
    productImg: l.productImg,
    productImgAlt: l.productImgAlt,
    href: l.href,
    order: l.order,
    colors: JSON.parse(l.colors || "[]") as string[],
  }));

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">As Styled By You</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The home-page shop-the-look carousel. Add, edit, reorder — each look links to a product.
        </p>
      </header>
      <LooksManager looks={looks} products={products} />
    </div>
  );
}
