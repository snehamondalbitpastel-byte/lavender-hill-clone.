import { prisma } from "@/lib/prisma";

// GET /api/collections — the home "Shop by category" tiles. Per the home-UI
// translation policy these tile names are NOT localized — they stay in the
// authored (English) language for every locale.
export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { order: "asc" },
  });

  return Response.json(collections);
}
