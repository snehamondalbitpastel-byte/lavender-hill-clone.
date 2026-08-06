import { prisma } from "@/lib/prisma";

// GET /api/menu — the Shop mega-menu (groups with their nested links, ordered).
export async function GET() {
  const groups = await prisma.menuGroup.findMany({
    orderBy: { order: "asc" },
    include: { links: { orderBy: { order: "asc" } } },
  });

  return Response.json(groups);
}
