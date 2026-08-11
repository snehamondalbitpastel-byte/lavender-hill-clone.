import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/pages/[slug] — one content page (Press / As Seen on, Our Story, …).
// Public: read by the storefront /pages/[slug] route. `items` = image cards.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || !page.active) {
    return Response.json({ error: "Page not found" }, { status: 404 });
  }
  let items: { image: string; link: string; alt: string }[] = [];
  try {
    items = JSON.parse(page.items || "[]");
  } catch {
    /* ignore corrupt JSON */
  }
  return Response.json({ slug: page.slug, title: page.title, intro: page.intro, items });
}
