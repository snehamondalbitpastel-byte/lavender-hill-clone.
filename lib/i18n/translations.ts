import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "./config";
import { translateBatch } from "@/lib/translate";

// Server-side content localization, backed by the Translation cache table.
// localizeMany() takes English strings + a locale and returns their translations:
// cache hits come from the DB; misses are machine-translated once, cached, and
// returned. The base locale (or blank strings) pass straight through. One helper
// powers every storefront surface — product names, descriptions, category/hero/
// marketing copy, and the shop-grid titles.

export const sourceKeyOf = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const key = sourceKeyOf;

export async function localizeMany(texts: string[], locale: string): Promise<string[]> {
  if (!locale || locale === DEFAULT_LOCALE || texts.length === 0) return texts;

  // Unique, non-blank sources only (dedupe repeated strings across the list).
  const uniq = Array.from(new Set(texts.filter((t) => t && t.trim())));
  if (uniq.length === 0) return texts;

  const keys = uniq.map(key);
  const rows = await prisma.translation.findMany({
    where: { locale, sourceKey: { in: keys } },
    select: { sourceKey: true, value: true },
  });
  const byKey = new Map(rows.map((r) => [r.sourceKey, r.value]));

  const misses = uniq.filter((t) => !byKey.has(key(t)));
  if (misses.length > 0) {
    const translated = await translateBatch(misses, locale, DEFAULT_LOCALE);
    const data = misses.map((src, i) => ({
      locale,
      sourceKey: key(src),
      source: src,
      value: translated[i] ?? src,
    }));
    // Cache; skipDuplicates guards against concurrent requests racing on a key.
    try {
      await prisma.translation.createMany({ data, skipDuplicates: true });
    } catch {
      /* caching is best-effort — still return the translations below */
    }
    misses.forEach((src, i) => byKey.set(key(src), translated[i] ?? src));
  }

  const bySource = new Map(uniq.map((t) => [t, byKey.get(key(t)) ?? t]));
  return texts.map((t) => (t && bySource.has(t) ? (bySource.get(t) as string) : t));
}

export async function localizeOne(text: string, locale: string): Promise<string> {
  const [r] = await localizeMany([text], locale);
  return r ?? text;
}
