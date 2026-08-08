import { requireAdmin } from "@/lib/auth";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";
import LanguagesManager from "@/app/components/admin/LanguagesManager";

export default async function AdminLanguagesPage() {
  await requireAdmin();

  // The languages the storefront offers (English is the base everything is
  // authored in; the rest are machine-translated + admin-editable here).
  const locales = LOCALES.map((l) => ({ ...l, base: l.code === DEFAULT_LOCALE }));

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow text-taupe">Storefront</p>
        <h1 className="text-2xl mt-1 tracking-[0.04em]">Languages</h1>
        <p className="text-sm text-espresso/55 mt-1">
          Product names, descriptions and all storefront copy are auto-translated into every
          language. Use “Translate all content” to pre-fill them, and edit any translation below to
          fine-tune it — edited entries are kept when you re-translate.
        </p>
      </header>
      <LanguagesManager locales={locales} baseLocale={DEFAULT_LOCALE} />
    </div>
  );
}
