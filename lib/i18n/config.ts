// Supported storefront languages. Plain constants (no server/DB imports) so this
// file is safe to import from BOTH server and client code. English is the base
// language everything is authored in; the rest are auto-translated.

export type LocaleDef = {
  code: string; // our locale key + the free engine's code
  native: string; // shown in the language dropdown
  english: string; // English name (for the admin)
};

export const DEFAULT_LOCALE = "en";
export const COOKIE_NAME = "NEXT_LOCALE";

export const LOCALES: LocaleDef[] = [
  { code: "en", native: "English", english: "English" },
  { code: "fr", native: "Français", english: "French" },
  { code: "it", native: "Italiano", english: "Italian" },
  { code: "da", native: "Dansk", english: "Danish" },
  { code: "no", native: "Norsk", english: "Norwegian" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "sv", native: "Svenska", english: "Swedish" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "pt", native: "Português", english: "Portuguese (Portugal)" },
  { code: "nl", native: "Nederlands", english: "Dutch" },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isLocale(code: unknown): code is string {
  return typeof code === "string" && LOCALE_CODES.includes(code);
}
