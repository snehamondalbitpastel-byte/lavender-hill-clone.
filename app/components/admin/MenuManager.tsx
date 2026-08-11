"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Link = { id?: number; label: string; href: string };
type Group = {
  id: number;
  title: string;
  href: string;
  location: string;
  image: string;
  caption: string;
  links: { id: number; label: string; href: string }[];
};
type PageOption = { id: number; slug: string; title: string };

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

const LOCATIONS: { value: string; label: string }[] = [
  { value: "about", label: "About menu" },
  { value: "shop", label: "Shop menu" },
];

export default function MenuManager({ groups, pages = [] }: { groups: Group[]; pages?: PageOption[] }) {
  const router = useRouter();
  const [location, setLocation] = useState("about");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDel, setPendingDel] = useState<{ id: number; title: string } | null>(null);
  const [ed, setEd] = useState<{ id: number; title: string; image: string; caption: string; links: Link[]; deleted: number[] } | null>(null);

  const cols = groups.filter((g) => g.location === location);

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, location }),
    });
    setNewTitle("");
    setBusy(false);
    toast.success("Column added");
    router.refresh();
  }

  function startEdit(g: Group) {
    setEd({
      id: g.id,
      title: g.title,
      image: g.image ?? "",
      caption: g.caption ?? "",
      links: g.links.map((l) => ({ id: l.id, label: l.label, href: l.href })),
      deleted: [],
    });
  }

  async function save() {
    if (!ed) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/menu/${ed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: ed.title, image: ed.image, caption: ed.caption, location }),
      });
      for (const link of ed.links) {
        if (!link.label.trim()) continue;
        if (link.id) {
          await fetch(`/api/admin/menu/links/${link.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) });
        } else {
          await fetch(`/api/admin/menu/${ed.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) });
        }
      }
      for (const did of ed.deleted) {
        await fetch(`/api/admin/menu/links/${did}`, { method: "DELETE" });
      }
      toast.success("Column saved");
      setEd(null);
      router.refresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/menu/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { toast.success("Column deleted"); setPendingDel(null); router.refresh(); }
    else toast.error("Delete failed");
  }

  // Link helpers (operate on the editing draft).
  const setLink = (i: number, patch: Partial<Link>) => setEd((e) => (e ? { ...e, links: e.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : e));
  const addLink = () => setEd((e) => (e ? { ...e, links: [...e.links, { label: "", href: "" }] } : e));
  const removeLink = (i: number) => setEd((e) => {
    if (!e) return e;
    const l = e.links[i];
    return { ...e, links: e.links.filter((_, j) => j !== i), deleted: l.id ? [...e.deleted, l.id] : e.deleted };
  });

  function linkEditor(link: Link, i: number) {
    const slug = link.href.startsWith("/pages/") ? link.href.slice("/pages/".length) : "";
    return (
      <div key={link.id ?? `new-${i}`} className="flex flex-col gap-2 border border-line rounded-md bg-white p-2.5 sm:flex-row sm:items-center">
        <input className={`${inputCls} sm:max-w-[38%]`} value={link.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Link label (e.g. Our Story)" />
        <select className={inputCls} value={slug} onChange={(e) => setLink(i, { href: e.target.value ? `/pages/${e.target.value}` : "" })}>
          <option value="">— pick a page —</option>
          {pages.map((p) => <option key={p.id} value={p.slug}>{p.title}</option>)}
        </select>
        <input className={`${inputCls} sm:max-w-[30%]`} value={link.href} onChange={(e) => setLink(i, { href: e.target.value })} placeholder="/pages/… or any URL" />
        <button type="button" onClick={() => removeLink(i)} className="text-xs text-[#b23a3a] hover:underline shrink-0">Remove</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Which nav item this menu is for */}
      <div className="flex gap-2">
        {LOCATIONS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => { setLocation(l.value); setEd(null); }}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${location === l.value ? "bg-espresso text-cream" : "bg-white border border-line text-espresso/70 hover:border-espresso/40"}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <form onSubmit={addColumn} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>New column (heading)</label>
          <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Our Commitment" />
        </div>
        <button type="submit" disabled={busy} className="btn-lh">+ Add column</button>
      </form>

      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {cols.map((g) => (
          <div key={g.id}>
            {ed?.id === g.id ? (
              <div className="py-4 px-4 bg-white/60 border-l-2 border-espresso flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>Column heading</label><input className={inputCls} value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} /></div>
                  <div><label className={labelCls}>Featured image URL <span className="normal-case text-espresso/40">(optional)</span></label><input className={inputCls} value={ed.image} onChange={(e) => setEd({ ...ed, image: e.target.value })} placeholder="https://… (renders as an image tile)" /></div>
                </div>
                {ed.image && <div><label className={labelCls}>Image caption</label><input className={inputCls} value={ed.caption} onChange={(e) => setEd({ ...ed, caption: e.target.value })} placeholder="e.g. Female founded & independently owned" /></div>}
                <div>
                  <label className={labelCls}>Links <span className="normal-case text-espresso/40">— each opens a page</span></label>
                  <div className="flex flex-col gap-2">{ed.links.map((l, i) => linkEditor(l, i))}</div>
                  <button type="button" onClick={addLink} className="mt-2 w-full rounded-md border border-dashed border-line py-2 text-xs text-espresso/60 hover:border-espresso/50 hover:text-espresso transition-colors">+ Add link</button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={save} disabled={busy} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2">Save column</button>
                  <button onClick={() => setEd(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-espresso">{g.title}</span>
                  <span className="block text-[11px] text-espresso/40 truncate">{g.links.length} link{g.links.length === 1 ? "" : "s"}{g.image ? " · image" : ""}</span>
                </div>
                <button onClick={() => startEdit(g)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
                <button onClick={() => setPendingDel({ id: g.id, title: g.title })} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
              </div>
            )}
          </div>
        ))}
        {cols.length === 0 && <p className="px-4 py-8 text-center text-sm text-espresso/40">No columns in the {location} menu yet.</p>}
      </div>

      <ConfirmModal open={!!pendingDel} title="Delete this column?" message="Its links are removed too. This can't be undone." busy={busy} onConfirm={doDelete} onCancel={() => setPendingDel(null)} />
    </div>
  );
}
