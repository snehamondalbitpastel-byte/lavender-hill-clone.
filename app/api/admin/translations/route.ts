import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { sourceKeyOf } from "@/lib/i18n/translations";

// Admin translation editor.
//   GET  /api/admin/translations?q=  → per-language counts + grouped rows
//                                       (one row per English source, all locales)
//   PUT  /api/admin/translations     → save a hand-edited translation (edited=true)
export async function GET(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const grouped = await prisma.translation.groupBy({ by: ["locale"], _count: { _all: true } });
  const stats: Record<string, number> = {};
  grouped.forEach((g) => {
    stats[g.locale] = g._count._all;
  });

  const rows = await prisma.translation.findMany({
    where: q ? { source: { contains: q, mode: "insensitive" } } : {},
    orderBy: { source: "asc" },
    take: 500,
  });

  const map = new Map<string, { source: string; byLocale: Record<string, { value: string; edited: boolean }> }>();
  for (const r of rows) {
    if (!map.has(r.source)) map.set(r.source, { source: r.source, byLocale: {} });
    map.get(r.source)!.byLocale[r.locale] = { value: r.value, edited: r.edited };
  }

  return Response.json({ stats, groups: Array.from(map.values()).slice(0, 80) });
}

export async function PUT(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const locale = String(b.locale || "").trim();
  const source = String(b.source ?? "");
  const value = String(b.value ?? "");
  if (!locale || !source) return Response.json({ error: "locale and source are required" }, { status: 400 });

  const sourceKey = sourceKeyOf(source);
  await prisma.translation.upsert({
    where: { locale_sourceKey: { locale, sourceKey } },
    create: { locale, sourceKey, source, value, edited: true },
    update: { value, edited: true },
  });

  return Response.json({ ok: true });
}
