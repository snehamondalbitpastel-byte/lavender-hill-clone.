import { getLocale } from "@/lib/i18n";
import { localizeMany } from "@/lib/i18n/translations";
import { SIZE_GUIDE } from "@/lib/size-guide";

// GET /api/size-guide — the shared Size Guide (constant in lib/size-guide.ts),
// localized into the caller's language. Only the human-readable text (title,
// intro, column headers, How To Measure) is translated; the measurements and
// size codes/numbers are returned as-is. Base locale → no-op.
export async function GET() {
  const g = SIZE_GUIDE;
  const locale = await getLocale();

  // One batched translate pass, in a fixed order we then unpack.
  const strings = [
    g.title,
    g.intro,
    g.howToTitle,
    ...g.headers,
    ...g.howTo.flatMap((h) => [h.term, h.desc]),
  ];
  const t = await localizeMany(strings, locale);

  let i = 0;
  const title = t[i++];
  const intro = t[i++];
  const howToTitle = t[i++];
  const headers = g.headers.map(() => t[i++]);
  const howTo = g.howTo.map(() => ({ term: t[i++], desc: t[i++] }));

  return Response.json({ title, intro, headers, rows: g.rows, howToTitle, howTo });
}
