import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PagesManager from "@/app/components/admin/PagesManager";

export default async function AdminPagesPage() {
  await requireAdmin();
  const pages = await prisma.page.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Pages</h1>
        <p className="text-sm text-espresso/55 mt-1">
          Standalone content pages — each renders at <code className="text-espresso/70">/pages/&lt;name&gt;</code>. Add a
          page, then <b>Edit</b> it. A page is either the simple template (heading + intro + image cards, e.g.{" "}
          <b>Press / As Seen on</b>) or a <b>section-built page</b> — add blocks like <i>Heading + text</i>,{" "}
          <i>Image + text</i> and <i>Quote over image</i>, reorder them, and they render top-to-bottom (great for{" "}
          <b>Our Story</b>). When a page has sections, they replace the simple template.
        </p>
      </header>
      <PagesManager pages={pages} />
    </div>
  );
}
