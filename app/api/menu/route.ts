import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/menu[?location=shop|about] — a nav mega-menu (columns + their links,
// ordered). `location` scopes it to a nav item; omit for all.
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location");
  const groups = await prisma.menuGroup.findMany({
    where: location ? { location } : undefined,
    orderBy: { order: "asc" },
    include: { links: { orderBy: { order: "asc" } } },
  });
  return Response.json(groups);
}
