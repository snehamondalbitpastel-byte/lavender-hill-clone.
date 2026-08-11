"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";
import CollectionProductsPicker, { type PickerProduct } from "./CollectionProductsPicker";

type Cat = {
  id: number;
  handle: string;
  label: string;
  heading: string;
  description: string;
  bottomHeading: string;
  bottomDescription: string;
  bannerImage: string;
  relatedHandles: string[];
  source: string;
  parentId: number | null;
};

// How this collection's product grid is filled (mirrors normalizeSource on the
// server). "category" = products tagged with this collection's handle; the rest
// fill automatically from a product flag / sale price.
const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "category", label: "Products tagged in this collection" },
  { value: "all", label: "All products (Shop)" },
  { value: "new", label: "New In products" },
  { value: "sale", label: "On-sale products" },
  { value: "bestseller", label: "Bestseller products" },
];
const sourceLabel = (v: string) => SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? v;

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

const EMPTY = { label: "", heading: "", description: "", bottomHeading: "", bottomDescription: "", bannerImage: "", relatedHandles: [] as string[], source: "category", parentId: null as number | null };

export default function CategoriesManager({ categories, products = [] }: { categories: Cat[]; products?: PickerProduct[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDel, setPendingDel] = useState<{ id: number; label: string } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [ed, setEd] = useState<typeof EMPTY>(EMPTY);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setLabel("");
    setBusy(false);
    toast.success("Collection added");
    router.refresh();
  }

  function startEdit(c: Cat) {
    setEditId(c.id);
    setEd({
      label: c.label,
      heading: c.heading ?? "",
      description: c.description ?? "",
      bottomHeading: c.bottomHeading ?? "",
      bottomDescription: c.bottomDescription ?? "",
      bannerImage: c.bannerImage ?? "",
      relatedHandles: c.relatedHandles ?? [],
      source: c.source ?? "category",
      parentId: c.parentId ?? null,
    });
  }

  async function save(id: number) {
    setBusy(true);
    await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ed),
    });
    setEditId(null);
    setBusy(false);
    toast.success("Collection updated");
    router.refresh();
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/categories/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast.success("Collection deleted");
      setPendingDel(null);
      router.refresh();
    } else {
      toast.error("Delete failed.");
    }
  }

  const toggleRelated = (handle: string) =>
    setEd((s) => ({
      ...s,
      relatedHandles: s.relatedHandles.includes(handle)
        ? s.relatedHandles.filter((h) => h !== handle)
        : [...s.relatedHandles, handle],
    }));

  // ---- Render helpers return JSX (NOT sub-components) so inputs keep focus. ----
  function rowNode(c: Cat) {
    const parent = c.parentId ? categories.find((o) => o.id === c.parentId) : null;
    return (
      <div className="flex items-center gap-3 py-3 px-4">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-espresso">{parent && <span className="text-espresso/40">↳ </span>}{c.label}</span>
          {parent && (
            <span className="ml-2 text-[10px] uppercase tracking-[0.08em] rounded px-1.5 py-0.5 bg-espresso/8 text-espresso/60">sub of {parent.label}</span>
          )}
          {c.description && (
            <span className="block text-[11px] text-espresso/40 truncate max-w-md">{c.description}</span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-[0.08em] shrink-0 rounded px-2 py-0.5 bg-espresso/8 text-espresso/70 hidden sm:inline">
          {sourceLabel(c.source)}
        </span>
        <span className="text-[11px] text-espresso/35 font-mono shrink-0 hidden md:inline">{c.handle}</span>
        <button onClick={() => startEdit(c)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
        <button onClick={() => setPendingDel({ id: c.id, label: c.label })} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
      </div>
    );
  }

  function editNode(c: Cat) {
    const others = categories.filter((o) => o.id !== c.id);
    return (
      <div className="py-4 px-4 bg-white/60 border-l-2 border-espresso flex flex-col gap-3">
        <div>
          <label className={labelCls}>Name (menu / tag)</label>
          <input className={inputCls} value={ed.label} onChange={(e) => setEd({ ...ed, label: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>Parent collection <span className="normal-case text-espresso/40">(makes this a sub-category — its page opens at /collections/&lt;parent&gt;/{c.handle})</span></label>
          <select
            className={inputCls}
            value={ed.parentId ?? ""}
            onChange={(e) => setEd({ ...ed, parentId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">— none (top-level collection) —</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Banner heading <span className="normal-case text-espresso/40">(falls back to the name)</span></label>
          <input className={inputCls} value={ed.heading} onChange={(e) => setEd({ ...ed, heading: e.target.value })} placeholder="e.g. Luxury Women's T-shirts" />
        </div>

        <div>
          <label className={labelCls}>Banner description <span className="normal-case text-espresso/40">(top — under the heading)</span></label>
          <textarea className={`${inputCls} min-h-[80px] resize-y`} value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} placeholder="Shown under the heading on this collection's page…" />
        </div>

        <div>
          <label className={labelCls}>Banner image URL <span className="normal-case text-espresso/40">(optional — shown at the top)</span></label>
          <input className={inputCls} value={ed.bannerImage} onChange={(e) => setEd({ ...ed, bannerImage: e.target.value })} placeholder="https://… (paste an image URL)" />
          {ed.bannerImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ed.bannerImage} alt="" className="mt-2 h-24 w-full max-w-md rounded-md border border-line object-cover" />
          )}
        </div>

        <div>
          <label className={labelCls}>Show these collections on this page <span className="normal-case text-espresso/40">(clickable options, e.g. New In → T-shirts · Nightwear)</span></label>
          {others.length === 0 ? (
            <p className="text-[13px] text-espresso/45">Create other collections first, then tick them here.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-white p-2 flex flex-col gap-1">
              {others.map((o) => (
                <label key={o.id} className="flex items-center gap-2.5 py-1 cursor-pointer text-sm text-espresso">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-espresso shrink-0"
                    checked={ed.relatedHandles.includes(o.handle)}
                    onChange={() => toggleRelated(o.handle)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Products in this collection (source)</label>
          <select className={inputCls} value={ed.source} onChange={(e) => setEd({ ...ed, source: e.target.value })}>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Products in this collection</label>
          <CollectionProductsPicker collectionId={c.id} handle={c.handle} source={ed.source} products={products} />
        </div>

        <div>
          <label className={labelCls}>Bottom heading <span className="normal-case text-espresso/40">(optional — above the closing note)</span></label>
          <input className={inputCls} value={ed.bottomHeading} onChange={(e) => setEd({ ...ed, bottomHeading: e.target.value })} placeholder="e.g. Our Commitment to Quality" />
        </div>

        <div>
          <label className={labelCls}>Bottom description <span className="normal-case text-espresso/40">(optional — closing note after the products)</span></label>
          <textarea className={`${inputCls} min-h-[80px] resize-y`} value={ed.bottomDescription} onChange={(e) => setEd({ ...ed, bottomDescription: e.target.value })} placeholder="Optional closing paragraph shown below the product grid…" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => save(c.id)} disabled={busy} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2">Save details</button>
          <button onClick={() => setEditId(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add — every collection is independent (no parent/child). */}
      <form onSubmit={add} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>New collection</label>
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Women's Luxury T-shirts" />
        </div>
        <button type="submit" disabled={busy} className="btn-lh">+ Add</button>
      </form>

      {/* Flat list — each collection is edited on its own. */}
      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {categories.map((c) => (
          <div key={c.id}>{editId === c.id ? editNode(c) : rowNode(c)}</div>
        ))}
        {categories.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No collections yet.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this collection?"
        message="This can't be undone. Products stay — they're just no longer tagged in this collection."
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
