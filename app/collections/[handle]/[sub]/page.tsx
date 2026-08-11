import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CollectionView from "../../CollectionView";

// Nested sub-category page: /collections/<parent>/<sub>. `sub` is a child
// collection; it shows its own product grid, with the parent in the breadcrumb
// and its sibling sub-categories as the option nav (active one highlighted).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; sub: string }>;
}): Promise<Metadata> {
  const { sub } = await params;
  const cat = await prisma.category.findUnique({ where: { handle: sub } });
  return {
    title: cat ? `${cat.heading || cat.label} | Lavender Hill` : "Shop | Lavender Hill",
  };
}

export default async function NestedCollectionPage({
  params,
}: {
  params: Promise<{ handle: string; sub: string }>;
}) {
  const { handle, sub } = await params;
  const collection = await prisma.category.findUnique({ where: { handle: sub } });
  if (!collection) notFound();

  const parent = await prisma.category.findUnique({ where: { handle } });

  // Sibling sub-categories (the parent's children) become the option nav; each
  // links to its own nested page and the current one is marked active.
  const siblings = parent
    ? await prisma.category.findMany({
        where: { parentId: parent.id },
        orderBy: [{ order: "asc" }, { label: "asc" }],
        select: { handle: true, label: true },
      })
    : [];
  const options = siblings.map((c) => ({
    handle: c.handle,
    label: c.label,
    href: `/collections/${handle}/${c.handle}`,
    active: c.handle === sub,
  }));

  const breadcrumbParent = parent
    ? { label: parent.label, href: `/collections/${parent.handle}` }
    : undefined;

  return <CollectionView collection={collection} options={options} breadcrumbParent={breadcrumbParent} />;
}
