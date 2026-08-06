import { prisma } from "@/lib/prisma";

// GET /api/brand — the single "Behind The Brand" content block
// (tiles parsed from their JSON string).
export async function GET() {
  const brand = await prisma.brandContent.findFirst();

  if (!brand) {
    return Response.json({ error: "No brand content" }, { status: 404 });
  }

  return Response.json({
    ...brand,
    tiles: JSON.parse(brand.tiles) as {
      img: string;
      title: string;
      href: string | null;
    }[],
  });
}
