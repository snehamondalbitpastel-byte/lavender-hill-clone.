import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CollectionView, { optionsFor } from "../CollectionView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const cat = await prisma.category.findUnique({ where: { handle } });
  return {
    title: cat ? `${cat.heading || cat.label} | Lavender Hill` : "Shop | Lavender Hill",
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const collection = await prisma.category.findUnique({ where: { handle } });
  if (!collection) notFound();

  // If this collection has sub-categories (children), show THEM as option links,
  // each pointing to its nested page /collections/<parent>/<sub>. Otherwise fall
  // back to the flat relatedHandles cross-links (e.g. New In → T-shirts · …).
  const children = await prisma.category.findMany({
    where: { parentId: collection.id },
    orderBy: [{ order: "asc" }, { label: "asc" }],
    select: { handle: true, label: true },
  });
  const options =
    children.length > 0
      ? children.map((c) => ({ handle: c.handle, label: c.label, href: `/collections/${collection.handle}/${c.handle}` }))
      : await optionsFor(collection.relatedHandles);

  return <CollectionView collection={collection} options={options} />;
}
