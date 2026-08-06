import { prisma } from "@/lib/prisma";

// GET /api/collection-page?slug=new-in — a listing page's banner content
// (breadcrumbs + links parsed from their JSON strings).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";

  const page = await prisma.collectionPage.findUnique({ where: { slug } });

  if (!page) {
    return Response.json({ error: "Collection page not found" }, { status: 404 });
  }

  return Response.json({
    ...page,
    breadcrumbs: JSON.parse(page.breadcrumbs) as { label: string; href: string }[],
    links: JSON.parse(page.links) as { label: string; href: string }[],
  });
}
