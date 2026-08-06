"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Cat = {
  id: number;
  handle: string;
  label: string;
  parentId: number | null;
  heading: string;
  description: string;
  page: string;
};

// The listing pages a category can be shown on. The value is stored on the
// category; the label is what the storefront/admin display. Keep in sync with
// normalizePage() in app/api/admin/categories/route.ts.
const PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "shop", label: "Shop" },
  { value: "new-in", label: "New In" },
  { value: "sale", label: "Sale" },
];
const pageLabel = (v: string) =>
  PAGE_OPTIONS.find((p) => p.value === v)?.label ?? "Shop";

const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

export default function CategoriesManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState("");
  const [page, setPage] = useState("shop");
  const [busy, setBusy] = useState(false);
  const [pendingDel, setPendingDel] = useState<{ id: number; label: string; kids: number } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [ed, setEd] = useState({ label: "", heading: "", parentId: "", description: "", page: "shop" });

  const childrenOf = (pid: number | null) => categories.filter((c) => c.parentId === pid);

  // Flatten the tree (pre-order) with depth — used for the parent dropdowns so
  // you can nest under ANY level, not just the top.
  function flatten(pid: number | null, depth: number, acc: { c: Cat; depth: number }[]) {
    for (const c of childrenOf(pid)) {
      acc.push({ c, depth });
      flatten(c.id, depth + 1, acc);
    }
    return acc;
  }
  const flat = flatten(null, 0, []);

  // A category can't become a child of itself or of its own descendants.
  function descendantIds(id: number): Set<number> {
    const set = new Set<number>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop() as number;
      for (const ch of childrenOf(cur)) {
        set.add(ch.id);
        stack.push(ch.id);
      }
    }
    return set;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, parentId: parentId || null, page }),
    });
    setLabel("");
    setParentId("");
    setPage("shop");
    setBusy(false);
    toast.success("Category added");
    router.refresh();
  }

  function startEdit(c: Cat) {
    setEditId(c.id);
    setEd({
      label: c.label,
      heading: c.heading ?? "",
      parentId: c.parentId ? String(c.parentId) : "",
      description: c.description ?? "",
      page: c.page ?? "shop",
    });
  }

  async function save(id: number) {
    setBusy(true);
    await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ed, parentId: ed.parentId || null }),
    });
    setEditId(null);
    setBusy(false);
    toast.success("Category updated");
    router.refresh();
  }

  async function doDelete() {
    if (!pendingDel) return;
    setBusy(true);
    const res = await fetch(`/api/admin/categories/${pendingDel.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      toast.success("Category deleted");
      setPendingDel(null);
      router.refresh();
    } else {
      toast.error("Delete failed.");
    }
  }

  // ---- Render helpers return JSX (NOT sub-components) so inputs keep focus. ----
  function rowNode(c: Cat, depth: number) {
    const subs = childrenOf(c.id).length;
    return (
      <div className="flex items-center gap-3 py-3 pr-4" style={{ paddingLeft: 16 + depth * 24 }}>
        {depth > 0 && <span className="text-espresso/30 -ml-4">↳</span>}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-espresso">{c.label}</span>
          {c.description && (
            <span className="block text-[11px] text-espresso/40 truncate max-w-md">{c.description}</span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-[0.08em] shrink-0 rounded px-2 py-0.5 bg-espresso/8 text-espresso/70">
          {pageLabel(c.page)}
        </span>
        <span
          className={`text-[10px] uppercase tracking-[0.08em] shrink-0 rounded px-2 py-0.5 ${
            subs ? "bg-taupe/15 text-taupe" : "text-espresso/30"
          }`}
        >
          {subs ? `${subs} sub` : "leaf"}
        </span>
        <span className="text-[11px] text-espresso/35 font-mono shrink-0 hidden sm:inline">{c.handle}</span>
        <button onClick={() => startEdit(c)} className="text-xs text-espresso hover:underline shrink-0">Edit</button>
        <button onClick={() => setPendingDel({ id: c.id, label: c.label, kids: childrenOf(c.id).length })} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
      </div>
    );
  }

  function editNode(c: Cat, depth: number) {
    const invalid = descendantIds(c.id);
    return (
      <div className="py-4 pr-4 bg-white/60 border-l-2 border-espresso flex flex-col gap-3" style={{ paddingLeft: 16 + depth * 24 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name (menu / tag)</label>
            <input className={inputCls} value={ed.label} onChange={(e) => setEd({ ...ed, label: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Under (parent)</label>
            <select className={inputCls} value={ed.parentId} onChange={(e) => setEd({ ...ed, parentId: e.target.value })}>
              <option value="">— top level —</option>
              {flat
                .filter((f) => f.c.id !== c.id && !invalid.has(f.c.id))
                .map((f) => (
                  <option key={f.c.id} value={f.c.id}>{`${"— ".repeat(f.depth)}${f.c.label}`}</option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Shows on (page)</label>
            <select className={inputCls} value={ed.page} onChange={(e) => setEd({ ...ed, page: e.target.value })}>
              {PAGE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Banner heading <span className="normal-case text-espresso/40">(falls back to the name)</span></label>
          <input className={inputCls} value={ed.heading} onChange={(e) => setEd({ ...ed, heading: e.target.value })} placeholder="e.g. Luxury Women's T-shirts" />
        </div>
        <div>
          <label className={labelCls}>Banner description</label>
          <textarea className={`${inputCls} min-h-[90px] resize-y`} value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} placeholder="Shown under the heading on this category's page…" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => save(c.id)} disabled={busy} className="text-xs font-medium text-white bg-espresso rounded-md px-4 py-2">Save</button>
          <button onClick={() => setEditId(null)} className="text-xs text-espresso/60 px-2">Cancel</button>
        </div>
      </div>
    );
  }

  // Recursive pre-order render → a flat list of rows, indented by depth.
  function renderTree(pid: number | null, depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const c of childrenOf(pid)) {
      out.push(<div key={c.id}>{editId === c.id ? editNode(c, depth) : rowNode(c, depth)}</div>);
      out.push(...renderTree(c.id, depth + 1));
    }
    return out;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add — can nest under ANY existing category */}
      <form onSubmit={add} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>New category</label>
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Shop by Fit" />
        </div>
        <div>
          <label className={labelCls}>Under</label>
          <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— top level —</option>
            {flat.map((f) => (
              <option key={f.c.id} value={f.c.id}>{`${"— ".repeat(f.depth)}${f.c.label}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Shows on</label>
          <select className={inputCls} value={page} onChange={(e) => setPage(e.target.value)}>
            {PAGE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-lh">+ Add</button>
      </form>

      {/* Full tree — any depth, indented, with sub-count / leaf badge */}
      <div className="bg-cream border border-line rounded-xl shadow-soft divide-y divide-line">
        {renderTree(null, 0)}
        {categories.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-espresso/40">No categories yet.</p>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this category?"
        message={
          pendingDel?.kids
            ? `Its ${pendingDel.kids} sub-categor${pendingDel.kids === 1 ? "y" : "ies"} will move up one level.`
            : "This can't be undone."
        }
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
