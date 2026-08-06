import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import DiscountsManager from "@/app/components/admin/DiscountsManager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  await requireAdmin();
  const rows = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });

  // Serialize dates to plain YYYY-MM-DD strings for the client form.
  const discounts = rows.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type,
    value: d.value,
    minSubtotal: d.minSubtotal,
    maxDiscount: d.maxDiscount,
    usageLimit: d.usageLimit,
    usageCount: d.usageCount,
    startsAt: d.startsAt ? d.startsAt.toISOString().slice(0, 10) : "",
    endsAt: d.endsAt ? d.endsAt.toISOString().slice(0, 10) : "",
    active: d.active,
    showInBanner: d.showInBanner,
    oncePerCustomer: d.oncePerCustomer,
  }));

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Sell</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Discounts</h1>
        <p className="text-sm text-espresso/55 mt-1">
          Create coupon codes customers enter at checkout. Conditions (expiry, usage
          limit, minimum order) are enforced automatically — codes stack on top of the
          automatic “Buy 3+” product discounts.
        </p>
      </header>
      <DiscountsManager discounts={discounts} />
    </div>
  );
}
