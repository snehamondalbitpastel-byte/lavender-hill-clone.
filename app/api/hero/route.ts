import { prisma } from "@/lib/prisma";

// GET /api/hero — the active hero carousel slides for the storefront, in order.
// Buttons are parsed from JSON into [{ label, href, variant }]. Per the home-UI
// translation policy, the hero (slide titles + "Shop Now" button labels) is NOT
// localized — it stays in the authored (English) language for every locale.
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

  return Response.json(parsed);
}
