import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { normalizeCode } from "@/lib/discounts";

// Parse + validate a discount payload into Prisma data (or an error message).
// Shared by create (POST here) and update ([id]/route.ts).
export function parseDiscountBody(body: Record<string, unknown>):
  | { ok: true; data: {
      code: string; type: string; value: number; minSubtotal: number;
      maxDiscount: number | null; usageLimit: number | null;
      startsAt: Date | null; endsAt: Date | null; active: boolean; showInBanner: boolean;
      oncePerCustomer: boolean;
    } }
  | { ok: false; error: string } {
  const code = normalizeCode(body.code);
  if (!code) return { ok: false, error: "A code is required." };
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return { ok: false, error: "Code must be 2–32 letters, numbers, - or _." };
  }

  const type = String(body.type ?? "percent");
  if (type !== "percent" && type !== "fixed") {
    return { ok: false, error: "Type must be percent or fixed." };
  }

  const value = Number(body.value);
  if (!(value > 0)) return { ok: false, error: "Enter a value greater than zero." };
  if (type === "percent" && value > 100) {
    return { ok: false, error: "A percent code can't be more than 100%." };
  }

  const minSubtotal = Math.max(0, Number(body.minSubtotal) || 0);

  const maxRaw = body.maxDiscount;
  const maxDiscount =
    maxRaw === "" || maxRaw == null ? null : Number(maxRaw) > 0 ? Number(maxRaw) : null;

  const limitRaw = body.usageLimit;
  const usageLimit =
    limitRaw === "" || limitRaw == null ? null : Number(limitRaw) >= 1 ? Math.floor(Number(limitRaw)) : null;

  const parseDate = (v: unknown): Date | null => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, error: "End date can't be before the start date." };
  }

  return {
    ok: true,
    data: {
      code, type, value, minSubtotal, maxDiscount, usageLimit, startsAt, endsAt,
      active: body.active === undefined ? true : Boolean(body.active),
      showInBanner: Boolean(body.showInBanner),
      oncePerCustomer: body.oncePerCustomer === undefined ? true : Boolean(body.oncePerCustomer),
    },
  };
}

// POST /api/admin/discounts — create a discount code.
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseDiscountBody(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const exists = await prisma.discountCode.findUnique({ where: { code: parsed.data.code }, select: { id: true } });
  if (exists) return Response.json({ error: "That code already exists." }, { status: 409 });

  const created = await prisma.discountCode.create({ data: parsed.data });
  return Response.json({ ok: true, id: created.id });
}
