import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });

// GET /api/promo — EVERY storefront promo the admin has opted in. Public: read by
// the AnnouncementBar (rotates them) + checkout hint (chips). The admin decides
// which codes appear via the per-code "Show in banner" toggle. Only returns codes
// that are flagged "show in banner", active, inside their date window, not used up.
export async function GET() {
  const now = new Date();
  const candidates = await prisma.discountCode.findMany({
    where: {
      showInBanner: true,
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const usable = candidates.filter((c) => c.usageLimit == null || c.usageCount < c.usageLimit);
  // Read low → high by minimum bill, like a real "spend & save" offers ladder.
  usable.sort((a, b) => a.minSubtotal - b.minSubtotal);

  const items = usable.map((dc) => {
    const off = dc.type === "percent" ? `${dc.value}% off` : `${inr(dc.value)} off`; // "5% off" / "₹500 off"
    const minNote = dc.minSubtotal > 0 ? ` on orders over ${inr(dc.minSubtotal)}` : "";
    return {
      code: dc.code,
      off,                     // short discount label
      min: dc.minSubtotal,     // minimum bill (0 = no minimum)
      message: `Use code ${dc.code} for ${off} your order${minNote}`,
    };
  });

  // `items` = all opted-in codes (offers ladder); `message`/`code` kept as the
  // first for single-code consumers (backward-compatible).
  return Response.json({ items, message: items[0]?.message ?? null, code: items[0]?.code ?? null });
}
