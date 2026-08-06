import { prisma } from "@/lib/prisma";

// GET /api/collections — the "Shop by category" cards.
export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { order: "asc" },
  });

  return Response.json(collections);
}
