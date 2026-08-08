import { getAdmin } from "@/lib/auth";
import { collectSources } from "@/lib/i18n/collect";
import { localizeMany } from "@/lib/i18n/translations";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";

// POST /api/admin/translations/retranslate — pre-fill the translation cache for
// EVERY storefront string in EVERY language, so the first visitor in a language
// sees instant, fully-translated pages. Only fills what's missing (hand-edited
// entries are never overwritten). May take a while on the free engine; it's near
// instant once a DeepL key is set.
export async function POST() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sources = await collectSources();
  const targets = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE);

  for (const loc of targets) {
    await localizeMany(sources, loc.code); // fills any missing translations + caches
  }

  return Response.json({ ok: true, strings: sources.length, languages: targets.length });
}
