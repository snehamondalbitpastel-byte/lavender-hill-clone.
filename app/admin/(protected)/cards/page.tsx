import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export default async function AdminCardsPage() {
  await requireAdmin();

  const cards = await prisma.card.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-taupe">Catalog</p>
          <h1 className="text-2xl mt-1 tracking-[0.04em]">Shop cards</h1>
          <p className="text-sm text-espresso/55 mt-1">
            One card per colour — the exact grid order shown on /shop.
          </p>
        </div>
        <p className="text-sm text-espresso/55">{cards.length} cards</p>
      </header>

      <div className="bg-cream border border-line rounded-xl shadow-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-espresso/50 border-b border-line">
              <th className="py-3 px-4 font-medium">#</th>
              <th className="py-3 px-4 font-medium">Card</th>
              <th className="py-3 px-4 font-medium">Colour</th>
              <th className="py-3 px-4 font-medium text-right">Price</th>
              <th className="py-3 px-4 font-medium">Badge</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-b border-line/70 last:border-0">
                <td className="py-3 px-4 text-espresso/40 tabular-nums">{c.order}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={c.image}
                      alt=""
                      width={30}
                      height={40}
                      className="rounded object-cover border border-line shrink-0"
                    />
                    <p className="text-espresso truncate max-w-[280px]">{c.title}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-espresso/70">{c.colour ?? "—"}</td>
                <td className="py-3 px-4 text-right tabular-nums text-espresso/80">{c.price}</td>
                <td className="py-3 px-4">
                  {c.saveBadge ? (
                    <span className="text-[10px] uppercase tracking-[0.06em] rounded px-2 py-0.5 text-white" style={{ background: "rgb(83 58 89)" }}>
                      {c.saveBadge}
                    </span>
                  ) : c.badge ? (
                    <span className="text-[10px] uppercase tracking-[0.06em] rounded px-2 py-0.5 bg-taupe/15 text-taupe">
                      {c.badge}
                    </span>
                  ) : (
                    <span className="text-espresso/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
