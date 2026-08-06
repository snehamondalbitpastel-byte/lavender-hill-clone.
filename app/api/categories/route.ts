import { prisma } from "@/lib/prisma";

// GET /api/categories — all categories (for the product form + shop nav).
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });
  return Response.json(categories);
}
