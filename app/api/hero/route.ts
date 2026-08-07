import { prisma } from "@/lib/prisma";

// GET /api/hero — the active hero carousel slides for the storefront, in order.
// Buttons are parsed from JSON into [{ label, href, variant }].
export async function GET() {
  const slides = await prisma.heroSlide.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return Response.json(
    slides.map((s) => ({ ...s, buttons: JSON.parse(s.buttons || "[]") }))
  );
}
