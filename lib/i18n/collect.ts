import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeContent } from "@/lib/products";

// Gathers every English source string shown on the storefront (product names,
// descriptions, colours, rich content, shop-grid titles, categories, hero,
// tiles, brand story, looks). Used by the admin "Translate all content" action
// to pre-fill the translation cache for every language ahead of time.
export async function collectSources(): Promise<string[]> {
  const set = new Set<string>();
  const add = (v?: string | null) => {
    if (v && v.trim()) set.add(v);
  };

  const products = await prisma.product.findMany();
  for (const p of products) {
    add(p.title);
    add(p.description);
    add(p.productType);
    add(p.badge);
    try {
      const cols = JSON.parse(p.colourData || "[]") as { name?: string }[];
      cols.forEach((c) => add(c.name));
    } catch {}
    try {
      const c = normalizeContent(JSON.parse(p.content || "{}"));
      c.materialMatters.forEach((m) => add(m.label));
      c.accordions.forEach((a) => {
        add(a.title);
        add(a.body);
      });
      add(c.keyFeatures.intro);
      c.keyFeatures.items.forEach((x) => {
        add(x.title);
        add(x.desc);
      });
      c.whyYouLoveIt.items.forEach((x) => {
        add(x.title);
        add(x.desc);
      });
      c.stylingTips.tips.forEach(add);
      add(c.stylingTips.closing);
      add(c.behindTheSeams.description);
    } catch {}
  }

  const cards = await prisma.card.findMany({ select: { title: true, badge: true } });
  cards.forEach((c) => {
    add(c.title);
    add(c.badge);
  });

  const cats = await prisma.category.findMany();
  cats.forEach((c) => {
    add(c.label);
    add(c.heading);
    add(c.description);
  });

  const hero = await prisma.heroSlide.findMany();
  hero.forEach((h) => {
    add(h.title);
    try {
      (JSON.parse(h.buttons || "[]") as { label?: string }[]).forEach((b) => add(b.label));
    } catch {}
  });

  const tiles = await prisma.collection.findMany();
  tiles.forEach((t) => add(t.title));

  const brand = await prisma.brandContent.findFirst();
  if (brand) {
    add(brand.title);
    add(brand.description);
    try {
      (JSON.parse(brand.tiles) as { title?: string }[]).forEach((t) => add(t.title));
    } catch {}
  }

  const looks = await prisma.look.findMany();
  looks.forEach((l) => add(l.name));

  return Array.from(set);
}
