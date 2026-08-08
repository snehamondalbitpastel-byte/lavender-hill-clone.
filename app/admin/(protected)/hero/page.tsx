import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import HeroManager from "@/app/components/admin/HeroManager";

export default async function AdminHeroPage() {
  await requireAdmin();
  const [rows, collections] = await Promise.all([
    prisma.heroSlide.findMany({ orderBy: { order: "asc" } }),
    prisma.category.findMany({ orderBy: [{ order: "asc" }, { label: "asc" }], select: { handle: true, label: true } }),
  ]);
  const slides = rows.map((s) => ({
    id: s.id,
    title: s.title,
    bold: s.bold,
    align: s.align,
    image: s.image,
    position: s.position,
    gradient: s.gradient,
    overlay: s.overlay,
    titleSize: s.titleSize,
    box: s.box,
    order: s.order,
    active: s.active,
    buttons: JSON.parse(s.buttons || "[]") as { label: string; href: string; variant: "taupe" | "light" | "outline" }[],
  }));

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Hero banners</h1>
        <p className="text-sm text-espresso/55 mt-1">
          The home-page carousel. Add, edit, reorder or hide banners — and set exactly where each button links.
        </p>
      </header>
      <HeroManager slides={slides} collections={collections} />
    </div>
  );
}
