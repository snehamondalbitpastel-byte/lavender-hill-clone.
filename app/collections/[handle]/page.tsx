import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CollectionView from "../CollectionView";

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
  const collection = await prisma.category.findUnique({
    where: { handle },
    include: { children: { orderBy: { order: "asc" } } },
  });
  if (!collection) notFound();
  return <CollectionView collection={collection} />;
}
