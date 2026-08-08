import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// GET /api/looks — the "As Styled By You" carousel looks (colours parsed from
// their JSON string). Product names are localized for the caller's language.
export async function GET() {
  const looks = await prisma.look.findMany({ orderBy: { order: "asc" } });

  const locale = await getLocale();
  const names = await localizeMany(looks.map((l) => l.name), locale);

  const result = looks.map((l, i) => ({
    ...l,
    colors: JSON.parse(l.colors) as string[],
    name: names[i],
  }));

  return Response.json(result);
}
