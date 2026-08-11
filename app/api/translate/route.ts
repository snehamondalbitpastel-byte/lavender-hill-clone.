import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";

// POST /api/translate — localize a batch of strings into the caller's language
// (from the NEXT_LOCALE cookie), backed by the same cache/engine as the rest of
// the storefront. Used by client components that hold stored English text (e.g.
// the cart drawer shows product titles captured at add-time). Base locale → no-op.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const texts = Array.isArray(body?.texts) ? body.texts.map((t: unknown) => String(t ?? "")) : [];
  if (texts.length === 0) return Response.json({ translations: [] });
  const locale = await getLocale();
  const translations = await localizeMany(texts, locale);
  return Response.json({ translations });
}
