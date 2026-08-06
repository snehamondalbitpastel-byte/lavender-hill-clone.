"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

export type Discount = {
  id: number;
  code: string;
  type: string; // percent | fixed
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string; // YYYY-MM-DD or ""
  endsAt: string;
  active: boolean;
  showInBanner: boolean;
  oncePerCustomer: boolean;
};

type Form = {
  code: string; type: string; value: string; minSubtotal: string;
  maxDiscount: string; usageLimit: string; startsAt: string; endsAt: string; active: boolean; showInBanner: boolean; oncePerCustomer: boolean;
};
const EMPTY: Form = {
  code: "", type: "percent", value: "", minSubtotal: "", maxDiscount: "", usageLimit: "", startsAt: "", endsAt: "", active: true, showInBanner: false, oncePerCustomer: true,
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 });
const inputCls = "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-[11px] uppercase tracking-[0.1em] text-espresso/55 mb-1 block";

function summarize(d: Discount): string {
  const amount = d.type === "percent" ? `${d.value}% off` : `${inr(d.value)} off`;
  const bits = [amount];
  if (d.minSubtotal > 0) bits.push(`min ${inr(d.minSubtotal)}`);
  if (d.type === "percent" && d.maxDiscount) bits.push(`max ${inr(d.maxDiscount)}`);
  return bits.join(" · ");
}

export default function DiscountsManager({ discounts }: { discounts: Discount[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDel, setPendingDel] = useState<Discount | null>(null);
  // Mirror the server list so a delete/create reflects INSTANTLY (optimistic),
  // then re-syncs whenever the server sends fresh data via router.refresh().
  const [list, setList] = useState<Discount[]>(discounts);
  useEffect(() => { setList(discounts); }, [discounts]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit(d: Discount) {
    setEditId(d.id);
    setForm({
      code: d.code, type: d.type, value: String(d.value),
      minSubtotal: d.minSubtotal ? String(d.minSubtotal) : "",
      maxDiscount: d.maxDiscount != null ? String(d.maxDiscount) : "",
      usageLimit: d.usageLimit != null ? String(d.usageLimit) : "",
      startsAt: d.startsAt, endsAt: d.endsAt, active: d.active, showInBanner: d.showInBanner, oncePerCustomer: d.oncePerCustomer,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() { setEditId(null); setForm(EMPTY); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const url = editId ? `/api/admin/discounts/${editId}` : "/api/admin/discounts";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast.success(editId ? "Code updated" : "Code created");
      cancelEdit();
      router.refresh();
    } else {
      toast.error(data.error || "Something went wrong.");
    }
  }

  async function doDelete() {
    if (!pendingDel) return;
    const delId = pendingDel.id;
    setBusy(true);
    const res = await fetch(`/api/admin/discounts/${delId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setList((cur) => cur.filter((d) => d.id !== delId)); // remove from the table now
      if (editId === delId) cancelEdit(); // if it was open in the form, clear the form too
      toast.success("Code deleted");
      setPendingDel(null);
      router.refresh(); // re-sync with the server
    } else toast.error("Delete failed.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create / edit form */}
      <form onSubmit={submit} className="bg-cream border border-line rounded-xl shadow-soft p-5 flex flex-col gap-4">
        <p className="text-sm font-medium text-espresso">{editId ? "Edit code" : "New discount code"}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Code</label>
            <input className={`${inputCls} uppercase`} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SAVE10" />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{form.type === "percent" ? "Percent off" : "Amount off (₹)"}</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "percent" ? "10" : "500"} />
          </div>
          <div>
            <label className={labelCls}>Min order (₹)</label>
            <input className={inputCls} type="number" min="0" step="1" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} placeholder="0" />
          </div>
          {form.type === "percent" && (
            <div>
              <label className={labelCls}>Max discount (₹)</label>
              <input className={inputCls} type="number" min="0" step="1" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="no cap" />
            </div>
          )}
          <div>
            <label className={labelCls}>Usage limit</label>
            <input className={inputCls} type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="unlimited" />
          </div>
          <div>
            <label className={labelCls}>Starts</label>
            <input className={inputCls} type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Expires</label>
            <input className={inputCls} type="date" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-espresso/80">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-espresso/80" title="Headline this code in the storefront promo bar">
              <input type="checkbox" checked={form.showInBanner} onChange={(e) => set("showInBanner", e.target.checked)} />
              Show in banner
            </label>
            <label className="flex items-center gap-2 text-sm text-espresso/80" title="When on, each customer can redeem this code only once. Turn off to allow repeat use up to the usage limit.">
              <input type="checkbox" checked={form.oncePerCustomer} onChange={(e) => set("oncePerCustomer", e.target.checked)} />
              Limit to one use per customer
            </label>
          </div>
          <div className="flex items-center gap-2">
            {editId && <button type="button" onClick={cancelEdit} className="text-xs text-espresso/60 px-2">Cancel</button>}
            <button type="submit" disabled={busy} className="btn-lh">{editId ? "Save changes" : "+ Create code"}</button>
          </div>
        </div>
      </form>

      {/* List */}
      <div className="bg-cream border border-line rounded-xl shadow-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-espresso/50 border-b border-line">
              <th className="py-3 px-4 font-medium">Code</th>
              <th className="py-3 px-4 font-medium">Discount</th>
              <th className="py-3 px-4 font-medium">Window</th>
              <th className="py-3 px-4 font-medium text-center">Used</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="border-b border-line/70 last:border-0">
                <td className="py-3 px-4 font-mono text-espresso">
                  {d.code}
                  {d.showInBanner && (
                    <span className="ml-2 rounded-full bg-[#efedf3] px-1.5 py-0.5 align-middle text-[9px] font-sans uppercase tracking-[0.08em] text-[#5b4b9b]">Banner</span>
                  )}
                </td>
                <td className="py-3 px-4 text-espresso/75">{summarize(d)}</td>
                <td className="py-3 px-4 text-espresso/60 whitespace-nowrap text-xs">
                  {d.startsAt || "—"} → {d.endsAt || "—"}
                </td>
                <td className="py-3 px-4 text-center text-espresso/70">{d.usageCount}{d.usageLimit != null ? ` / ${d.usageLimit}` : ""}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[10px] uppercase tracking-[0.08em] rounded-full px-2 py-0.5 ${d.active ? "bg-[#d4e3cb] text-[#307a07]" : "bg-[#ece9e4] text-[#6b6257]"}`}>
                    {d.active ? "Active" : "Off"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(d)} className="text-xs text-espresso hover:underline">Edit</button>
                  <button onClick={() => setPendingDel(d)} className="ml-3 text-xs text-[#b23a3a] hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-espresso/40">No discount codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!pendingDel}
        title="Delete this code?"
        message={pendingDel ? `“${pendingDel.code}” will stop working immediately.` : ""}
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setPendingDel(null)}
      />
    </div>
  );
}
