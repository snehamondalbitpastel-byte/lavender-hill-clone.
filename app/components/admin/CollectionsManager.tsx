"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Tile = { id: number; title: string; href: string; image: string; order: number };
type Draft = Omit<Tile, "id">;

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";
const BLANK: Draft = { title: "", href: "/shop", image: "", order: 0 };

export default function CollectionsManager({ tiles }: { tiles: Tile[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number | null; data: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDel, setPendingDel] = useState<Tile | null>(null);

  const startAdd = () => setEditing({ id: null, data: { ...BLANK, order: tiles.length + 1 } });
  const startEdit = (t: Tile) => { const { id, ...rest } = t; setEditing({ id, data: { ...rest } }); };
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

  async function save() {
    if (!editing) return;
    if (!editing.data.title.trim() || !editing.data.image) {
      toast.error("Title and image are required.");
      return;
    }
    setBusy(true);
    const isNew = editing.id === null;
    const res = await fetch(isNew ? "/api/admin/collections" : `/api/admin/collections/${editing.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing.data),
    });
    setBusy(false);
    if (res.ok) { toast.success(isNew ? "Tile added" : "Tile updated"); setEditing(null); router.refresh(); }
    else toast.error("Save failed");
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/collections/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { toast.success("Tile deleted"); setPendingDel(null); router.refresh(); }
    else toast.error("Delete failed");
  }

  return (
    <div className="flex flex-col gap-6">
      {!editing && (
        <div><button onClick={startAdd} className="btn-lh">+ Add tile</button></div>
      )}

      {editing && (
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-col gap-4">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">
            {editing.id === null ? "New tile" : "Edit tile"}
          </h2>

          <div>
            <label className={labelCls}>Image</label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
                {editing.data.image && (
                  <Image src={editing.data.image} alt="" fill className="object-cover" sizes="80px" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} className="text-xs text-espresso/70" />
                <input className={inputCls} value={editing.data.image} onChange={(e) => setField("image", e.target.value)} placeholder="/uploads/… or /category-….jpg" />
              </div>
            </div>
            {uploading && <p className="text-xs text-espresso/50 mt-1">Uploading…</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={editing.data.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Short Sleeve T-shirts" />
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" className={inputCls} value={editing.data.order} onChange={(e) => setField("order", Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Link — where “Shop Now” goes</label>
              <input className={inputCls} value={editing.data.href} onChange={(e) => setField("href", e.target.value)} placeholder="/collections/womens-half-sleeve-t-shirts" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy || uploading} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2 disabled:opacity-50">Save</button>
            <button onClick={() => setEditing(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {tiles.map((t) => (
          <div key={t.id} className="flex items-center gap-4 p-4">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
              {t.image && <Image src={t.image} alt="" fill className="object-cover" sizes="48px" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-espresso truncate">{t.title}</p>
              <p className="text-[11px] text-espresso/45 truncate">→ {t.href}</p>
            </div>
            <span className="text-[11px] text-espresso/35 shrink-0">#{t.order}</span>
            <button onClick={() => startEdit(t)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
            <button onClick={() => setPendingDel(t)} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
          </div>
        ))}
        {tiles.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No tiles yet. Click “+ Add tile”.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this tile?"
        message="This removes it from the home-page “Shop by category”. This can't be undone."
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
