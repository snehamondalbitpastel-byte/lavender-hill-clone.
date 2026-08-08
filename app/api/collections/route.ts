import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// GET /api/collections — the home "Shop by category" tiles. Tile titles are
// localized for the caller's language.
export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { order: "asc" },
  });

  const locale = await getLocale();
  const titles = await localizeMany(collections.map((c) => c.title), locale);

  return Response.json(collections.map((c, i) => ({ ...c, title: titles[i] })));
}
