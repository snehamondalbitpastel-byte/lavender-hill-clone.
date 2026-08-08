"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Btn = { label: string; href: string; variant: "taupe" | "light" | "outline" };
type Slide = {
  id: number;
  title: string;
  bold: boolean;
  align: string;
  image: string;
  position: string;
  gradient: string;
  overlay: string;
  titleSize: string;
  box: string;
  buttons: Btn[];
  order: number;
  active: boolean;
};
type Draft = Omit<Slide, "id">;

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

const BLANK: Draft = {
  title: "", bold: false, align: "center", image: "", position: "center",
  gradient: "", overlay: "", titleSize: "", box: "", buttons: [], order: 0, active: true,
};

export default function HeroManager({
  slides,
  collections = [],
}: {
  slides: Slide[];
  collections?: { handle: string; label: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number | null; data: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDel, setPendingDel] = useState<Slide | null>(null);

  const startAdd = () => setEditing({ id: null, data: { ...BLANK, order: slides.length + 1 } });
  const startEdit = (s: Slide) => {
    const { id, ...rest } = s;
    setEditing({ id, data: { ...rest, buttons: rest.buttons.map((b) => ({ ...b })) } });
  };

  function setField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setEditing((e) => (e ? { ...e, data: { ...e.data, [k]: v } } : e));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok && data.url) { setField("image", data.url); toast.success("Image uploaded"); }
    else toast.error(data.error || "Upload failed");
  }

  const btns = editing?.data.buttons ?? [];
  const addBtn = () => setField("buttons", [...btns, { label: "", href: "", variant: "light" }]);
  const setBtn = (i: number, patch: Partial<Btn>) =>
    setField("buttons", btns.map((b, bi) => (bi === i ? { ...b, ...patch } : b)));
  const removeBtn = (i: number) => setField("buttons", btns.filter((_, bi) => bi !== i));

  async function save() {
    if (!editing) return;
    if (!editing.data.image || !editing.data.title.trim()) {
      toast.error("Image and title are required.");
      return;
    }
    setBusy(true);
    const isNew = editing.id === null;
    const res = await fetch(isNew ? "/api/admin/hero" : `/api/admin/hero/${editing.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing.data),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(isNew ? "Banner added" : "Banner updated");
      setEditing(null);
      router.refresh();
    } else {
      toast.error("Save failed");
    }
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/hero/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { toast.success("Banner deleted"); setPendingDel(null); router.refresh(); }
    else toast.error("Delete failed");
  }

  return (
    <div className="flex flex-col gap-6">
      {!editing && (
        <div>
          <button onClick={startAdd} className="btn-lh">+ Add banner</button>
        </div>
      )}

      {editing && (
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-col gap-4">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">
            {editing.id === null ? "New banner" : "Edit banner"}
          </h2>

          {/* Background image */}
          <div>
            <label className={labelCls}>Background image</label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
                {editing.data.image && (
                  <Image src={editing.data.image} alt="" fill className="object-cover" sizes="128px" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                  className="text-xs text-espresso/70"
                />
                <input
                  className={inputCls}
                  value={editing.data.image}
                  onChange={(e) => setField("image", e.target.value)}
                  placeholder="/uploads/… or /hero-….jpg"
                />
              </div>
            </div>
            {uploading && <p className="text-xs text-espresso/50 mt-1">Uploading…</p>}
          </div>

          {/* Title / align / order / flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={editing.data.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. The Linen Collection" />
            </div>
            <div>
              <label className={labelCls}>Text alignment</label>
              <select className={inputCls} value={editing.data.align} onChange={(e) => setField("align", e.target.value)}>
                <option value="start">Left</option>
                <option value="center">Center</option>
                <option value="end">Right</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" className={inputCls} value={editing.data.order} onChange={(e) => setField("order", Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-5">
              <label className="flex items-center gap-2 text-sm text-espresso">
                <input type="checkbox" checked={editing.data.bold} onChange={(e) => setField("bold", e.target.checked)} /> Bold title
              </label>
              <label className="flex items-center gap-2 text-sm text-espresso">
                <input type="checkbox" checked={editing.data.active} onChange={(e) => setField("active", e.target.checked)} /> Visible
              </label>
            </div>
          </div>

          {/* Collection links, offered as suggestions on the link field below */}
          <datalist id="lh-collection-links">
            {collections.map((c) => (
              <option key={c.handle} value={`/collections/${c.handle}`}>{c.label}</option>
            ))}
          </datalist>

          {/* Buttons */}
          <div>
            <label className={labelCls}>Buttons (0–2) — label, link &amp; style <span className="normal-case text-espresso/40">(pick a collection from the link list, or type any URL)</span></label>
            <div className="flex flex-col gap-2">
              {btns.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className={`${inputCls} flex-1 min-w-[120px]`} value={b.label} onChange={(e) => setBtn(i, { label: e.target.value })} placeholder="Label (e.g. Shop now)" />
                  <input list="lh-collection-links" className={`${inputCls} flex-1 min-w-[150px]`} value={b.href} onChange={(e) => setBtn(i, { href: e.target.value })} placeholder="Link — pick a collection or type a URL" />
                  <select className="border border-line rounded-md px-2 py-2 text-sm bg-white text-espresso" value={b.variant} onChange={(e) => setBtn(i, { variant: e.target.value as Btn["variant"] })}>
                    <option value="taupe">Taupe</option>
                    <option value="light">Light</option>
                    <option value="outline">Outline</option>
                  </select>
                  <button onClick={() => removeBtn(i)} className="text-xs text-[#b23a3a] hover:underline">Remove</button>
                </div>
              ))}
              {btns.length < 2 && (
                <button onClick={addBtn} className="text-xs text-espresso hover:underline self-start">+ Add button</button>
              )}
            </div>
          </div>

          {/* Advanced styling — optional */}
          <details className="text-sm">
            <summary className="cursor-pointer text-espresso/55 text-[11px] uppercase tracking-[0.1em]">Advanced styling (optional)</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div><label className={labelCls}>Image position</label><input className={inputCls} value={editing.data.position} onChange={(e) => setField("position", e.target.value)} placeholder="center  or  32% 50%" /></div>
              <div><label className={labelCls}>Fallback gradient (CSS)</label><input className={inputCls} value={editing.data.gradient} onChange={(e) => setField("gradient", e.target.value)} placeholder="linear-gradient(135deg,#cfc6ba,#6f6353)" /></div>
              <div><label className={labelCls}>Overlay (CSS)</label><input className={inputCls} value={editing.data.overlay} onChange={(e) => setField("overlay", e.target.value)} placeholder="rgba(0,0,0,0.25)" /></div>
              <div><label className={labelCls}>Title size (Tailwind)</label><input className={inputCls} value={editing.data.titleSize} onChange={(e) => setField("titleSize", e.target.value)} placeholder="text-3xl md:text-4xl" /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Box width/offset (Tailwind)</label><input className={inputCls} value={editing.data.box} onChange={(e) => setField("box", e.target.value)} placeholder="max-w-212" /></div>
            </div>
          </details>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy || uploading} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2 disabled:opacity-50">Save</button>
            <button onClick={() => setEditing(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Existing banners */}
      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {slides.map((s) => (
          <div key={s.id} className="flex items-center gap-4 p-4">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
              {s.image && <Image src={s.image} alt="" fill className="object-cover" sizes="96px" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-espresso truncate">{s.title}</p>
              <p className="text-[11px] text-espresso/45 truncate">
                {s.buttons.map((b) => `${b.label} → ${b.href}`).join("   ·   ") || "no buttons"}
              </p>
            </div>
            {!s.active && (
              <span className="text-[10px] uppercase tracking-[0.08em] rounded px-2 py-0.5 bg-espresso/8 text-espresso/50 shrink-0">Hidden</span>
            )}
            <span className="text-[11px] text-espresso/35 shrink-0">#{s.order}</span>
            <button onClick={() => startEdit(s)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
            <button onClick={() => setPendingDel(s)} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No banners yet. Click “+ Add banner”.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this banner?"
        message="This removes it from the home-page carousel. This can't be undone."
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
