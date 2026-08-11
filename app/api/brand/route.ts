import { prisma } from "@/lib/prisma";

// GET /api/brand — the single "Behind The Brand" content block (tiles parsed
// from their JSON string). Per the home-UI translation policy this section is
// NOT localized — it stays in the authored (English) language for every locale.
export async function GET() {
  const brand = await prisma.brandContent.findFirst();

  if (!brand) {
    return Response.json({ error: "No brand content" }, { status: 404 });
  }

  const tiles = JSON.parse(brand.tiles) as {
    img: string;
    title: string;
    href: string | null;
  }[];

  return Response.json({ ...brand, tiles });
}
