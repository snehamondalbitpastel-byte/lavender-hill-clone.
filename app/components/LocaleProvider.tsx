"use client";

import { createContext, useContext } from "react";

// Makes the current locale + UI dictionary available to client components. The
// dictionary is loaded on the server (in the root layout) and passed down here,
// so there is no client-side fetch and no flash. Server components load the
// dictionary directly via getDictionary() instead.

type Dict = Record<string, string>;

const LocaleContext = createContext<{ locale: string; dict: Dict }>({ locale: "en", dict: {} });

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: string;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

// t("nav.shop", "Shop") → the translated string, falling back to the English
// text (or the key) if a translation is missing.
export function useT() {
  const { dict, locale } = useContext(LocaleContext);
  const t = (key: string, fallback?: string) => dict[key] ?? fallback ?? key;
  return { t, locale };
}
