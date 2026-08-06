import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import { variantStock } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const s = (v: unknown) => String(v ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/stock-notify — subscribe to a back-in-stock alert for a product +
// colour + size (variant). Uses the signed-in customer's email when available,
// else a typed one (guests may subscribe). Only accepted when that variant is
// actually sold out.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productId = Number(body.productId);
  const colour = s(body.colour);
  const size = s(body.size);

  const session = await getCustomerSession();
  const email = (session?.email || s(body.email)).toLowerCase();

  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "Invalid product." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { colourData: true } });
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });

  // Only meaningful for a variant that's tracked AND currently out of stock.
  const stock = variantStock(product.colourData, colour, size || undefined);
  if (stock == null || stock > 0) {
    return Response.json({ error: "This item is available — you can add it to your cart." }, { status: 400 });
  }

  // De-dupe: one pending row per email + product + colour + size.
  const existing = await prisma.stockNotification.findFirst({
    where: { email, productId, colour, size, notified: false },
    select: { id: true },
  });
  if (!existing) {
    await prisma.stockNotification.create({ data: { email, productId, colour, size } });
  }
  return Response.json({ ok: true });
}
