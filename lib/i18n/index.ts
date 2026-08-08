import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, DEFAULT_LOCALE, isLocale } from "./config";

// Server-side i18n: read the visitor's locale from the cookie and load its UI
// dictionary. Dictionaries are static JSON, imported lazily, and run only on the
// server — they never add to the client bundle.

export type Dict = Record<string, string>;

const loaders: Record<string, () => Promise<Dict>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  it: () => import("./dictionaries/it.json").then((m) => m.default),
  da: () => import("./dictionaries/da.json").then((m) => m.default),
  no: () => import("./dictionaries/no.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  sv: () => import("./dictionaries/sv.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  pt: () => import("./dictionaries/pt.json").then((m) => m.default),
  nl: () => import("./dictionaries/nl.json").then((m) => m.default),
};

export async function getLocale(): Promise<string> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(locale: string): Promise<Dict> {
  const load = loaders[locale] ?? loaders[DEFAULT_LOCALE];
  try {
    return await load();
  } catch {
    return loaders[DEFAULT_LOCALE]();
  }
}
