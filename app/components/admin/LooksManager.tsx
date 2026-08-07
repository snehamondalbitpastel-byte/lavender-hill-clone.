"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Look = {
  id: number;
  look: string;
  hotspotTop: string;
  hotspotLeft: string;
  name: string;
  price: string;
  productImg: string;
  productImgAlt: string;
  colors: string[];
  href: string;
  order: number;
};
type Draft = Omit<Look, "id">;
type ImgKey = "look" | "productImg" | "productImgAlt";

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";
const BLANK: Draft = {
  look: "", hotspotTop: "50%", hotspotLeft: "50%", name: "", price: "",
  productImg: "", productImgAlt: "", colors: [], href: "/shop", order: 0,
};

export default function LooksManager({ looks }: { looks: Look[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number | null; data: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<ImgKey | null>(null);
  const [pendingDel, setPendingDel] = useState<Look | null>(null);

  const startAdd = () => setEditing({ id: null, data: { ...BLANK, order: looks.length + 1, colors: [] } });
  const startEdit = (l: Look) => { const { id, ...rest } = l; setEditing({ id, data: { ...rest, colors: [...rest.colors] } }); };
  function setField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setEditing((e) => (e ? { ...e, data: { ...e.data, [k]: v } } : e));
  }

  async function uploadImage(key: ImgKey, file: File) {
    setUploadingKey(key);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploadingKey(null);
    if (res.ok && data.url) { setField(key, data.url); toast.success("Image uploaded"); }
    else toast.error(data.error || "Upload failed");
  }

  const colors = editing?.data.colors ?? [];
  const addColor = () => setField("colors", [...colors, "#c9b7a0"]);
  const setColor = (i: number, v: string) => setField("colors", colors.map((c, ci) => (ci === i ? v : c)));
  const removeColor = (i: number) => setField("colors", colors.filter((_, ci) => ci !== i));

  async function save() {
    if (!editing) return;
    if (!editing.data.look || !editing.data.name.trim()) {
      toast.error("Look image and product name are required.");
      return;
    }
    setBusy(true);
    const isNew = editing.id === null;
    const res = await fetch(isNew ? "/api/admin/looks" : `/api/admin/looks/${editing.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing.data),
    });
    setBusy(false);
    if (res.ok) { toast.success(isNew ? "Look added" : "Look updated"); setEditing(null); router.refresh(); }
    else toast.error("Save failed");
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/looks/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { toast.success("Look deleted"); setPendingDel(null); router.refresh(); }
    else toast.error("Delete failed");
  }

  // Render-helper (returns JSX, NOT a component → the URL input keeps focus).
  function imageField(label: string, k: ImgKey, hint: string) {
    const url = editing!.data[k];
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
            {url && <Image src={url} alt="" fill className="object-cover" sizes="64px" />}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <input type="file" accept="image/*" onChange={(e) => { const fi = e.target.files?.[0]; if (fi) uploadImage(k, fi); }} className="text-xs text-espresso/70" />
            <input className={inputCls} value={url} onChange={(e) => setField(k, e.target.value)} placeholder={hint} />
          </div>
        </div>
        {uploadingKey === k && <p className="text-xs text-espresso/50 mt-1">Uploading…</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!editing && (
        <div><button onClick={startAdd} className="btn-lh">+ Add look</button></div>
      )}

      {editing && (
        <div className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-col gap-4">
          <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">
            {editing.id === null ? "New look" : "Edit look"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {imageField("Lifestyle image (the look)", "look", "/uploads/… lifestyle photo")}
            {imageField("Product image", "productImg", "/uploads/… product photo")}
            {imageField("Product image (hover)", "productImgAlt", "/uploads/… hover photo")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Product name</label><input className={inputCls} value={editing.data.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Organic Cotton Scoop Neck Tank Top" /></div>
            <div><label className={labelCls}>Price (display)</label><input className={inputCls} value={editing.data.price} onChange={(e) => setField("price", e.target.value)} placeholder="Rs. 5,900.00" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Link — “View product”</label><input className={inputCls} value={editing.data.href} onChange={(e) => setField("href", e.target.value)} placeholder="/products/organic-cotton-scoop-neck-tank-top" /></div>
            <div><label className={labelCls}>Hotspot top</label><input className={inputCls} value={editing.data.hotspotTop} onChange={(e) => setField("hotspotTop", e.target.value)} placeholder="50%" /></div>
            <div><label className={labelCls}>Hotspot left</label><input className={inputCls} value={editing.data.hotspotLeft} onChange={(e) => setField("hotspotLeft", e.target.value)} placeholder="50%" /></div>
            <div><label className={labelCls}>Order</label><input type="number" className={inputCls} value={editing.data.order} onChange={(e) => setField("order", Number(e.target.value))} /></div>
          </div>

          <div>
            <label className={labelCls}>Colour swatches</label>
            <div className="flex flex-wrap items-center gap-3">
              {colors.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} className="h-8 w-8 rounded border border-line bg-white p-0.5" />
                  <button onClick={() => removeColor(i)} aria-label="Remove colour" className="text-xs text-[#b23a3a] hover:underline">×</button>
                </span>
              ))}
              <button onClick={addColor} className="text-xs text-espresso hover:underline">+ Add colour</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy || !!uploadingKey} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2 disabled:opacity-50">Save</button>
            <button onClick={() => setEditing(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {looks.map((l) => (
          <div key={l.id} className="flex items-center gap-4 p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-beige border border-line">
              {l.look && <Image src={l.look} alt="" fill className="object-cover" sizes="64px" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-espresso truncate">{l.name}</p>
              <p className="text-[11px] text-espresso/45 truncate">{l.price}{l.price && " · "}→ {l.href}</p>
            </div>
            <span className="text-[11px] text-espresso/35 shrink-0">#{l.order}</span>
            <button onClick={() => startEdit(l)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
            <button onClick={() => setPendingDel(l)} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
          </div>
        ))}
        {looks.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No looks yet. Click “+ Add look”.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this look?"
        message="This removes it from the home-page “As Styled By You”. This can't be undone."
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
