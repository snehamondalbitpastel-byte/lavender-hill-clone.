"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";
import { useFetch } from "@/hooks/useFetch";
import { getCollections, type Collection } from "@/lib/api";
import {
  SECTION_DEFS,
  sectionDef,
  sectionLabel,
  normalizeSections,
  asText,
  asItems,
  asHandles,
  type PageSection,
  type SectionField,
  type ItemRecord,
} from "@/lib/sections";

type Item = { image: string; link: string; alt: string };
type Page = {
  id: number;
  slug: string;
  title: string;
  intro: string;
  items: string; // JSON
  sections: string; // JSON: [{ id, type, data }]
  active: boolean;
};

// Fresh id for a new section (client-side; browsers have crypto.randomUUID).
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function parseSectionsJson(json: string): PageSection[] {
  try {
    // normalizeSections handles scalar/list/collections fields and drops unknown
    // types; it also fills a stable id, so this is safe to edit directly.
    return normalizeSections(JSON.parse(json || "[]")).map((s) => ({ ...s, id: s.id || newId() }));
  } catch {
    return [];
  }
}

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

function parseItems(json: string): Item[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map((x) => ({ image: String(x?.image ?? ""), link: String(x?.link ?? ""), alt: String(x?.alt ?? "") })) : [];
  } catch {
    return [];
  }
}

export default function PagesManager({ pages }: { pages: Page[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [pendingDel, setPendingDel] = useState<{ id: number; title: string } | null>(null);
  const [ed, setEd] = useState<{ title: string; intro: string; items: Item[]; sections: PageSection[]; active: boolean }>({ title: "", intro: "", items: [], sections: [], active: true });
  const [addType, setAddType] = useState(SECTION_DEFS[0]?.type ?? "");
  // Live collections — for the "Discover Our Collections" block's picker.
  const { data: collectionsData } = useFetch<Collection[]>(() => getCollections());
  const collections = collectionsData ?? [];
  const handleOf = (href: string) => href.split("/").filter(Boolean).pop() || "";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    setBusy(false);
    toast.success("Page added");
    router.refresh();
  }

  function startEdit(p: Page) {
    setEditId(p.id);
    setEd({ title: p.title, intro: p.intro ?? "", items: parseItems(p.items), sections: parseSectionsJson(p.sections), active: p.active });
  }

  async function save(id: number) {
    setBusy(true);
    await fetch(`/api/admin/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ed),
    });
    setEditId(null);
    setBusy(false);
    toast.success("Page updated");
    router.refresh();
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/pages/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast.success("Page deleted");
      setPendingDel(null);
      router.refresh();
    } else {
      toast.error("Delete failed.");
    }
  }

  const setItem = (i: number, patch: Partial<Item>) =>
    setEd((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const addItem = () => setEd((s) => ({ ...s, items: [...s.items, { image: "", link: "", alt: "" }] }));
  const removeItem = (i: number) => setEd((s) => ({ ...s, items: s.items.filter((_, j) => j !== i) }));

  // ---- Section (page-builder) helpers — operate on the editing draft ----
  const patchSection = (i: number, patch: (sec: PageSection) => PageSection) =>
    setEd((s) => ({ ...s, sections: s.sections.map((sec, j) => (j === i ? patch(sec) : sec)) }));

  const addSection = () => {
    const def = sectionDef(addType);
    if (!def) return;
    const data: Record<string, unknown> = { ...def.defaults };
    for (const f of def.fields) if (f.kind === "list" || f.kind === "collections") data[f.key] = [];
    setEd((s) => ({ ...s, sections: [...s.sections, { id: newId(), type: def.type, data: data as PageSection["data"] }] }));
  };
  const removeSection = (i: number) => setEd((s) => ({ ...s, sections: s.sections.filter((_, j) => j !== i) }));
  const setScalar = (i: number, key: string, value: string) =>
    patchSection(i, (sec) => ({ ...sec, data: { ...sec.data, [key]: value } }));
  const moveSection = (i: number, dir: -1 | 1) =>
    setEd((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.sections.length) return s;
      const next = [...s.sections];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, sections: next };
    });

  // List-field (repeatable sub-items) helpers.
  const addListItem = (i: number, key: string, itemFields: SectionField[]) =>
    patchSection(i, (sec) => {
      const blank: ItemRecord = {};
      for (const sf of itemFields) blank[sf.key] = "";
      return { ...sec, data: { ...sec.data, [key]: [...asItems(sec.data[key]), blank] } };
    });
  const removeListItem = (i: number, key: string, idx: number) =>
    patchSection(i, (sec) => ({ ...sec, data: { ...sec.data, [key]: asItems(sec.data[key]).filter((_, k) => k !== idx) } }));
  const setListItemField = (i: number, key: string, idx: number, subKey: string, value: string) =>
    patchSection(i, (sec) => ({
      ...sec,
      data: { ...sec.data, [key]: asItems(sec.data[key]).map((it, k) => (k === idx ? { ...it, [subKey]: value } : it)) },
    }));
  // Collections-field helper (toggle a handle in/out of the chosen list).
  const toggleHandle = (i: number, key: string, handle: string) =>
    patchSection(i, (sec) => {
      const cur = asHandles(sec.data[key]);
      const next = cur.includes(handle) ? cur.filter((h) => h !== handle) : [...cur, handle];
      return { ...sec, data: { ...sec.data, [key]: next } };
    });

  // A single scalar input (text / url / video / image / textarea / select).
  function scalarInput(value: string, f: SectionField, onChange: (v: string) => void) {
    if (f.kind === "textarea") {
      return <textarea className={`${inputCls} min-h-[80px] resize-y`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
    }
    if (f.kind === "select") {
      return (
        <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
          {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <div className="flex items-center gap-2">
        {f.kind === "image" && value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-10 w-10 shrink-0 rounded object-cover border border-line" />
        )}
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder || (f.kind === "image" ? "Image URL" : "")} />
      </div>
    );
  }

  function sectionFieldInput(sec: PageSection, i: number, f: SectionField) {
    if (f.kind === "list") {
      const items = asItems(sec.data[f.key]);
      const sub = f.itemFields ?? [];
      return (
        <div className="flex flex-col gap-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-md border border-line bg-cream/40 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.1em] text-espresso/45">Item {idx + 1}</span>
                <button type="button" onClick={() => removeListItem(i, f.key, idx)} className="text-xs text-[#b23a3a] hover:underline">Remove</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {sub.map((sf) => (
                  <div key={sf.key} className={sf.kind === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.08em] text-espresso/45">{sf.label}</label>
                    {scalarInput(it[sf.key] ?? "", sf, (v) => setListItemField(i, f.key, idx, sf.key, v))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addListItem(i, f.key, sub)} className="w-full rounded-md border border-dashed border-line py-2 text-xs text-espresso/60 hover:border-espresso/50 hover:text-espresso transition-colors">
            {f.addLabel || "+ Add item"}
          </button>
        </div>
      );
    }
    if (f.kind === "collections") {
      const chosen = asHandles(sec.data[f.key]);
      return (
        <div className="flex flex-col gap-1.5 rounded-md border border-line bg-cream/40 p-2.5">
          {collections.length === 0 && <span className="text-xs text-espresso/40">No collections found.</span>}
          {collections.map((c) => {
            const h = handleOf(c.href);
            return (
              <label key={c.id} className="flex items-center gap-2 text-sm text-espresso cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-espresso" checked={chosen.includes(h)} onChange={() => toggleHandle(i, f.key, h)} />
                {c.title} <span className="text-[11px] text-espresso/40">/{h}</span>
              </label>
            );
          })}
          {chosen.length > 0 && <span className="mt-1 text-[11px] text-espresso/45">{chosen.length} selected · shown in this order</span>}
        </div>
      );
    }
    return scalarInput(asText(sec.data[f.key]), f, (v) => setScalar(i, f.key, v));
  }

  function sectionEditor(sec: PageSection, i: number) {
    const def = sectionDef(sec.type);
    return (
      <div key={sec.id} className="rounded-md border border-line bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-espresso/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] text-espresso/70">{sectionLabel(sec.type)}</span>
          <span className="text-[11px] text-espresso/40">#{i + 1}</span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} className="rounded px-1.5 text-espresso/60 hover:text-espresso disabled:opacity-30" aria-label="Move up">↑</button>
            <button type="button" onClick={() => moveSection(i, 1)} disabled={i === ed.sections.length - 1} className="rounded px-1.5 text-espresso/60 hover:text-espresso disabled:opacity-30" aria-label="Move down">↓</button>
            <button type="button" onClick={() => removeSection(i)} className="ml-1 text-xs text-[#b23a3a] hover:underline">Remove</button>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(def?.fields ?? []).map((f) => (
            <div key={f.key} className={f.kind === "textarea" || f.kind === "list" || f.kind === "collections" ? "sm:col-span-2" : ""}>
              <label className={labelCls}>{f.label}{f.help && <span className="normal-case text-espresso/40"> — {f.help}</span>}</label>
              {sectionFieldInput(sec, i, f)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function editNode(p: Page) {
    return (
      <div className="py-4 px-4 bg-white/60 border-l-2 border-espresso flex flex-col gap-3">
        <div>
          <label className={labelCls}>Title (heading)</label>
          <input className={inputCls} value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} placeholder="Press / As Seen on" />
        </div>
        <div>
          <label className={labelCls}>Intro text <span className="normal-case text-espresso/40">(shown under the heading; each new line = a paragraph)</span></label>
          <textarea className={`${inputCls} min-h-[90px] resize-y`} value={ed.intro} onChange={(e) => setEd({ ...ed, intro: e.target.value })} placeholder="Over the years we've been featured in…" />
        </div>

        <div>
          <label className={labelCls}>Image cards <span className="normal-case text-espresso/40">— image URL + optional link (click-through) + alt text</span></label>
          <div className="flex flex-col gap-3">
            {ed.items.map((it, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 border border-line rounded-md bg-white p-2.5">
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover border border-line" />
                )}
                <div className="flex-1 flex flex-col gap-2">
                  <input className={inputCls} value={it.image} onChange={(e) => setItem(i, { image: e.target.value })} placeholder="Image URL" />
                  <div className="flex gap-2">
                    <input className={inputCls} value={it.link} onChange={(e) => setItem(i, { link: e.target.value })} placeholder="Link (optional) — e.g. https://…" />
                    <input className={`${inputCls} max-w-[38%]`} value={it.alt} onChange={(e) => setItem(i, { alt: e.target.value })} placeholder="Alt text" />
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(i)} className="text-xs text-[#b23a3a] hover:underline self-start sm:self-center shrink-0">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 w-full rounded-md border border-dashed border-line py-2 text-xs text-espresso/60 hover:border-espresso/50 hover:text-espresso transition-colors">
            + Add image card
          </button>
        </div>

        {/* Section-based page builder — add/reorder/remove content blocks.
            When a page has sections, the storefront renders these instead of the
            simple title + intro + image-cards template above. */}
        <div className="border-t border-line pt-3">
          <label className={labelCls}>Page sections <span className="normal-case text-espresso/40">— advanced page builder; when set, these replace the simple template above</span></label>
          {ed.sections.length > 0 && (
            <div className="flex flex-col gap-3">{ed.sections.map((sec, i) => sectionEditor(sec, i))}</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-line p-2.5">
            <select className={`${inputCls} sm:max-w-[16rem]`} value={addType} onChange={(e) => setAddType(e.target.value)}>
              {SECTION_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
            </select>
            <button type="button" onClick={addSection} className="text-xs font-medium text-white bg-espresso rounded-md px-3 py-2">+ Add section</button>
            <span className="text-[11px] text-espresso/40">{sectionDef(addType)?.description}</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-espresso cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-espresso" checked={ed.active} onChange={(e) => setEd({ ...ed, active: e.target.checked })} />
          Visible (published)
        </label>

        <div className="flex items-center gap-2">
          <button onClick={() => save(p.id)} disabled={busy} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2">Save page</button>
          <button onClick={() => setEditId(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
        </div>
      </div>
    );
  }

  function rowNode(p: Page) {
    const secCount = parseSectionsJson(p.sections).length;
    const count = parseItems(p.items).length;
    const meta = secCount > 0 ? `${secCount} section${secCount === 1 ? "" : "s"}` : `${count} image${count === 1 ? "" : "s"}`;
    return (
      <div className="flex items-center gap-3 py-3 px-4">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-espresso">{p.title || "(untitled)"}</span>
          <span className="block text-[11px] text-espresso/40 truncate">/pages/{p.slug} · {meta}{p.active ? "" : " · hidden"}</span>
        </div>
        <a href={`/pages/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-espresso/60 hover:underline shrink-0">View ↗</a>
        <button onClick={() => startEdit(p)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
        <button onClick={() => setPendingDel({ id: p.id, title: p.title })} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>New page</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Press / As Seen on" />
        </div>
        <button type="submit" disabled={busy} className="btn-lh">+ Add</button>
      </form>

      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {pages.map((p) => (
          <div key={p.id}>{editId === p.id ? editNode(p) : rowNode(p)}</div>
        ))}
        {pages.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No pages yet.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this page?"
        message="This can't be undone. Any links pointing to it will 404."
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
