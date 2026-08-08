import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// GET /api/hero — the active hero carousel slides for the storefront, in order.
// Buttons are parsed from JSON into [{ label, href, variant }]. Slide titles and
// button labels are localized for the caller's language.
export async function GET() {
  const slides = await prisma.heroSlide.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  type Btn = { label: string; href: string; variant: string };
  const parsed = slides.map((s) => ({
    ...s,
    buttons: JSON.parse(s.buttons || "[]") as Btn[],
  }));

  const locale = await getLocale();
  const titles = await localizeMany(parsed.map((s) => s.title), locale);
  const btnLabels = await localizeMany(parsed.flatMap((s) => s.buttons.map((b) => b.label)), locale);

  let bi = 0;
  const localized = parsed.map((s, i) => ({
    ...s,
    title: titles[i],
    buttons: s.buttons.map((b) => ({ ...b, label: btnLabels[bi++] })),
  }));

  return Response.json(localized);
}
