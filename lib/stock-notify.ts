// Shared back-in-stock flush. Called after ANY restock (admin product save or a
// restocked return): emails every pending subscriber whose exact (colour, size)
// variant is now available, then marks them notified so they're emailed once.
// Best-effort — a mail/DB hiccup here must never fail the caller.

import { prisma } from "./prisma";
import { sendBackInStockEmail } from "./email";
import { variantStock } from "./inventory";

export async function flushStockNotifications(productId: number, origin: string): Promise<void> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { title: true, slug: true, colourData: true },
    });
    if (!product) return;

    const subs = await prisma.stockNotification.findMany({ where: { productId, notified: false } });
    // A variant is available again when its stock is untracked (null) or > 0.
    const ready = subs.filter((s) => {
      const v = variantStock(product.colourData, s.colour, s.size || undefined);
      return v == null || v > 0;
    });
    if (!ready.length) return;

    const url = `${origin}/products/${product.slug}`;
    for (const s of ready) {
      sendBackInStockEmail(s.email, { productTitle: product.title, colour: s.colour, size: s.size, url }).catch(() => {});
    }
    await prisma.stockNotification.updateMany({ where: { id: { in: ready.map((x) => x.id) } }, data: { notified: true } });
  } catch {
    /* best-effort */
  }
}
