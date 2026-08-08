import { DEFAULT_LOCALE } from "./i18n/config";

// Machine translation with a swappable engine. If DEEPL_API_KEY is set we use
// DeepL (best quality); otherwise we use a free, no-key endpoint. Swapping to
// DeepL later is JUST setting the env var — no code change. Used both by the
// build-time UI-dictionary script and at runtime when the admin saves content.

// DeepL wants region-specific codes for a few of our locales.
const DEEPL_TARGET: Record<string, string> = { no: "nb", pt: "pt-PT", en: "en-US" };

export function hasDeepL(): boolean {
  return !!process.env.DEEPL_API_KEY;
}

async function viaDeepL(texts: string[], target: string, source: string): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY as string;
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const body = new URLSearchParams();
  for (const t of texts) body.append("text", t);
  body.append("target_lang", (DEEPL_TARGET[target] ?? target).toUpperCase());
  body.append("source_lang", source.toUpperCase());
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}`);
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.translations as any[]).map((t) => t.text as string);
}

async function viaFree(text: string, target: string, source: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx` +
    `&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = await res.json();
  // Shape: [[["translated","original",...], ...], ...]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data[0] as any[]).map((seg) => seg[0] as string).join("");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Translate an array of strings into `target`. Returns an array of the SAME
// length; any per-item failure falls back to the original text so callers never
// get undefined. Same source (default English) → returns input unchanged.
export async function translateBatch(
  texts: string[],
  target: string,
  source: string = DEFAULT_LOCALE
): Promise<string[]> {
  if (!texts.length || target === source) return texts;

  if (hasDeepL()) {
    try {
      return await viaDeepL(texts, target, source);
    } catch {
      /* fall through to the free engine */
    }
  }

  const out: string[] = [];
  for (const t of texts) {
    if (!t || !t.trim()) {
      out.push(t);
      continue;
    }
    try {
      out.push(await viaFree(t, target, source));
    } catch {
      out.push(t); // safe fallback: keep the original
    }
    await sleep(80); // be gentle on the free endpoint
  }
  return out;
}

export async function translateText(
  text: string,
  target: string,
  source: string = DEFAULT_LOCALE
): Promise<string> {
  const [r] = await translateBatch([text], target, source);
  return r ?? text;
}
