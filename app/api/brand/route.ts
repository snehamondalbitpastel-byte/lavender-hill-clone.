import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// GET /api/brand — the single "Behind The Brand" content block (tiles parsed
// from their JSON string). Title, description and tile titles are localized.
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

  const locale = await getLocale();
  const [title, description] = await localizeMany([brand.title, brand.description], locale);
  const tileTitles = await localizeMany(tiles.map((t) => t.title), locale);

  return Response.json({
    ...brand,
    title,
    description,
    tiles: tiles.map((t, i) => ({ ...t, title: tileTitles[i] })),
  });
}
