import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CollectionView from "../../CollectionView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; sub: string }>;
}): Promise<Metadata> {
  const { handle, sub } = await params;
  const child = await prisma.category.findUnique({ where: { handle: sub } });
  const parent = await prisma.category.findUnique({ where: { handle } });
  const name = child?.heading || child?.label || parent?.heading || parent?.label;
  return { title: name ? `${name} | Lavender Hill` : "Shop | Lavender Hill" };
}

// Nested sub-tab: /collections/<parent>/<child>. Keeps the parent's banner + tabs
// and swaps the products to the child (or shows the child's own copy if it set it).
export default async function NestedCollectionPage({
  params,
}: {
  params: Promise<{ handle: string; sub: string }>;
}) {
  const { handle, sub } = await params;
  const collection = await prisma.category.findUnique({
    where: { handle },
    include: { children: { orderBy: { order: "asc" } } },
  });
  if (!collection) notFound();

  const child = await prisma.category.findUnique({ where: { handle: sub } });
  // The child must exist AND actually be a child of this parent.
  if (!child || child.parentId !== collection.id) notFound();

  return <CollectionView collection={collection} child={child} />;
}
