"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Link = { id: number; label: string; href: string; order: number };
type Group = { id: number; title: string; href: string; order: number; links: Link[] };
type Collection = { handle: string; label: string };

const inputCls =
  "w-full border border-line rounded-md px-2.5 py-1.5 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

async function api(url: string, method: string, body?: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.ok;
}

export default function MenuManager({ groups, collections }: { groups: Group[]; collections: Collection[] }) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<{ kind: "group" | "link"; id: number; name: string } | null>(null);

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    const ok = await api("/api/admin/menu", "POST", { title: newTitle });
    setBusy(false);
    if (ok) {
      setNewTitle("");
      toast.success("Column added");
      router.refresh();
    } else toast.error("Couldn't add column");
  }

  async function moveGroup(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= groups.length) return;
    const a = groups[idx], b = groups[j];
    await api(`/api/admin/menu/${a.id}`, "PUT", { order: b.order });
    await api(`/api/admin/menu/${b.id}`, "PUT", { order: a.order });
    router.refresh();
  }

  async function moveLink(group: Group, idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= group.links.length) return;
    const a = group.links[idx], b = group.links[j];
    await api(`/api/admin/menu/links/${a.id}`, "PUT", { order: b.order });
    await api(`/api/admin/menu/links/${b.id}`, "PUT", { order: a.order });
    router.refresh();
  }

  async function doDelete() {
    if (!del) return;
    setBusy(true);
    const url = del.kind === "group" ? `/api/admin/menu/${del.id}` : `/api/admin/menu/links/${del.id}`;
    const ok = await api(url, "DELETE");
    setBusy(false);
    if (ok) {
      toast.success(del.kind === "group" ? "Column deleted" : "Link deleted");
      setDel(null);
      router.refresh();
    } else toast.error("Delete failed");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* shared collection suggestions for every link's target field */}
      <datalist id="lh-menu-collections">
        {collections.map((c) => (
          <option key={c.handle} value={`/collections/${c.handle}`}>{c.label}</option>
        ))}
      </datalist>

      {/* Add column */}
      <form onSubmit={addColumn} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className={labelCls}>New column (heading)</label>
          <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. T-shirts by Neckline" />
        </div>
        <button type="submit" disabled={busy} className="btn-lh">+ Add column</button>
      </form>

      {groups.length === 0 && (
        <p className="text-center text-sm text-espresso/40 py-8 border border-line rounded-xl bg-cream">
          No columns yet — add one above, then add links that point to your collections.
        </p>
      )}

      {/* Columns */}
      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((g, gi) => (
          <ColumnCard
            key={g.id}
            group={g}
            first={gi === 0}
            last={gi === groups.length - 1}
            onMove={(dir) => moveGroup(gi, dir)}
            onSaveGroup={(data) => api(`/api/admin/menu/${g.id}`, "PUT", data).then((ok) => { if (ok) { toast.success("Saved"); router.refresh(); } })}
            onDeleteGroup={() => setDel({ kind: "group", id: g.id, name: g.title })}
            onMoveLink={(idx, dir) => moveLink(g, idx, dir)}
            onSaveLink={(id, data) => api(`/api/admin/menu/links/${id}`, "PUT", data).then((ok) => { if (ok) { toast.success("Saved"); router.refresh(); } })}
            onDeleteLink={(id, label) => setDel({ kind: "link", id, name: label })}
            onAddLink={async (label, href) => {
              const ok = await api(`/api/admin/menu/${g.id}/links`, "POST", { label, href });
              if (ok) { toast.success("Link added"); router.refresh(); }
              else toast.error("A label and link are required.");
              return ok;
            }}
          />
        ))}
      </div>

      <ConfirmModal
        open={!!del}
        title={del?.kind === "group" ? "Delete this column?" : "Delete this link?"}
        message={del?.kind === "group" ? `"${del?.name}" and all its links will be removed.` : `"${del?.name}" will be removed.`}
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}

function ColumnCard({
  group, first, last, onMove, onSaveGroup, onDeleteGroup, onMoveLink, onSaveLink, onDeleteLink, onAddLink,
}: {
  group: Group;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onSaveGroup: (data: { title?: string; href?: string }) => void;
  onDeleteGroup: () => void;
  onMoveLink: (idx: number, dir: -1 | 1) => void;
  onSaveLink: (id: number, data: { label?: string; href?: string }) => void;
  onDeleteLink: (id: number, label: string) => void;
  onAddLink: (label: string, href: string) => Promise<boolean>;
}) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");

  return (
    <div className="bg-cream border border-line rounded-xl shadow-soft p-4 flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls} font-medium`}
          defaultValue={group.title}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== group.title) onSaveGroup({ title: v }); }}
        />
        <button onClick={() => onMove(-1)} disabled={first} className="text-espresso/50 disabled:opacity-30 px-1" title="Move up">↑</button>
        <button onClick={() => onMove(1)} disabled={last} className="text-espresso/50 disabled:opacity-30 px-1" title="Move down">↓</button>
        <button onClick={onDeleteGroup} className="text-xs text-[#b23a3a] hover:underline shrink-0">Delete</button>
      </div>
      {/* Optional heading link */}
      <input
        className={inputCls}
        defaultValue={group.href}
        placeholder="Heading link (optional) — pick a collection or leave blank"
        list="lh-menu-collections"
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== group.href) onSaveGroup({ href: v }); }}
      />

      {/* Links */}
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {group.links.map((lnk, li) => (
          <li key={lnk.id} className="flex items-center gap-2 py-2">
            <input
              className={`${inputCls} flex-1`}
              defaultValue={lnk.label}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== lnk.label) onSaveLink(lnk.id, { label: v }); }}
            />
            <input
              className={`${inputCls} flex-1`}
              defaultValue={lnk.href}
              list="lh-menu-collections"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== lnk.href) onSaveLink(lnk.id, { href: v }); }}
            />
            <button onClick={() => onMoveLink(li, -1)} disabled={li === 0} className="text-espresso/50 disabled:opacity-30 px-1">↑</button>
            <button onClick={() => onMoveLink(li, 1)} disabled={li === group.links.length - 1} className="text-espresso/50 disabled:opacity-30 px-1">↓</button>
            <button onClick={() => onDeleteLink(lnk.id, lnk.label)} className="text-xs text-[#b23a3a] hover:underline shrink-0">✕</button>
          </li>
        ))}
        {group.links.length === 0 && <li className="py-2 text-xs text-espresso/35">No links yet.</li>}
      </ul>

      {/* Add link */}
      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div className="flex-1 min-w-[110px]">
          <label className={labelCls}>Link label</label>
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Crew Neck T-shirts" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={labelCls}>Target (pick a collection)</label>
          <input className={inputCls} value={href} onChange={(e) => setHref(e.target.value)} list="lh-menu-collections" placeholder="/collections/…" />
        </div>
        <button
          type="button"
          onClick={async () => { const ok = await onAddLink(label, href); if (ok) { setLabel(""); setHref(""); } }}
          className="text-xs font-medium text-white bg-espresso rounded-md px-3 py-2"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
