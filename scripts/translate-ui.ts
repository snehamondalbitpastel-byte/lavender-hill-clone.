// Generates the non-English UI dictionaries from en.json using the translation
// engine (free endpoint, or DeepL if DEEPL_API_KEY is set). Run once now, and
// again whenever you add new keys to en.json:
//   npx tsx --env-file=.env scripts/translate-ui.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES, DEFAULT_LOCALE } from "../lib/i18n/config";
import { translateBatch } from "../lib/translate";

const DIR = join(process.cwd(), "lib", "i18n", "dictionaries");
const en = JSON.parse(readFileSync(join(DIR, "en.json"), "utf8")) as Record<string, string>;
const keys = Object.keys(en);
const values = keys.map((k) => en[k]);

async function main() {
  for (const loc of LOCALES) {
    if (loc.code === DEFAULT_LOCALE) continue;
    process.stdout.write(`translating ${loc.code} (${loc.english})… `);
    const translated = await translateBatch(values, loc.code, DEFAULT_LOCALE);
    const out: Record<string, string> = {};
    keys.forEach((k, i) => {
      out[k] = translated[i] ?? en[k];
    });
    writeFileSync(join(DIR, `${loc.code}.json`), JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`✓ ${keys.length} keys`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
