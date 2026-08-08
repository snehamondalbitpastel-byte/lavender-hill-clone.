"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Locale = { code: string; native: string; english: string; base: boolean };
type Group = { source: string; byLocale: Record<string, { value: string; edited: boolean }> };

const inputCls =
  "w-full border border-line rounded-md px-2.5 py-1.5 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors";

export default function LanguagesManager({ locales, baseLocale }: { locales: Locale[]; baseLocale: string }) {
  const targets = locales.filter((l) => !l.base);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/translations?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
        setGroups(data.groups || []);
      }
    } catch {
      /* leave as-is */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const id = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q, load]);

  async function retranslateAll() {
    setBusy(true);
    toast.info("Translating all content… this can take a moment on the free engine.");
    try {
      const res = await fetch("/api/admin/translations/retranslate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Translated ${data.strings} strings × ${data.languages} languages.`);
        load(q.trim());
      } else {
        toast.error(data.error || "Failed.");
      }
    } catch {
      toast.error("Failed to translate.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(locale: string, source: string, value: string) {
    try {
      const res = await fetch("/api/admin/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, source, value }),
      });
      if (!res.ok) throw new Error();
      setGroups((gs) =>
        gs.map((g) =>
          g.source === source ? { ...g, byLocale: { ...g.byLocale, [locale]: { value, edited: true } } } : g
        )
      );
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Coverage + translate-all */}
      <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {targets.map((l) => (
              <span
                key={l.code}
                title={`${l.english}: ${stats[l.code] ?? 0} translations cached`}
                className="inline-flex items-center gap-1.5 rounded-full bg-espresso/8 px-3 py-1 text-[12px] text-espresso/75"
              >
                {l.native}
                <b className="tabular-nums text-espresso">{stats[l.code] ?? 0}</b>
              </span>
            ))}
          </div>
          <button type="button" onClick={retranslateAll} disabled={busy} className="btn-lh shrink-0">
            {busy ? "Translating…" : "Translate all content"}
          </button>
        </div>
        <p className="mt-3 text-[12px] text-espresso/45">
          Base language: <b className="text-espresso/70">{locales.find((l) => l.base)?.native ?? baseLocale}</b>{" "}
          — authored directly; not translated.
        </p>
      </div>

      {/* Search + edit */}
      <div className="bg-cream border border-line rounded-xl shadow-soft p-5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search text to edit (e.g. a product name)…"
          className={inputCls + " mb-4"}
        />
        {loading && <p className="py-6 text-center text-sm text-espresso/40">Loading…</p>}
        {!loading && groups.length === 0 && (
          <p className="py-6 text-center text-sm text-espresso/40">
            No translations yet — click “Translate all content”.
          </p>
        )}
        <div className="flex flex-col divide-y divide-line">
          {groups.map((g) => (
            <div key={g.source} className="py-4">
              <p className="mb-2 text-sm font-medium text-espresso [overflow-wrap:anywhere]">{g.source}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {targets.map((l) => (
                  <label key={l.code} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[11px] uppercase tracking-[0.08em] text-espresso/45">{l.code}</span>
                    <input
                      defaultValue={g.byLocale[l.code]?.value ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (g.byLocale[l.code]?.value ?? "")) saveEdit(l.code, g.source, v);
                      }}
                      className={`${inputCls} ${g.byLocale[l.code]?.edited ? "border-taupe" : ""}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
