"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

export type PickerProduct = {
  id: number;
  title: string;
  image: string;
  category: string;
  categories: string[];
};

// "Products in this collection" — used inside a collection's edit panel. Tick the
// products that belong here and Save (one call). Only shown for category-source
// collections; flag collections (New In / Sale / Bestsellers) fill automatically.
export default function CollectionProductsPicker({
  collectionId,
  handle,
  source,
  products,
}: {
  collectionId: number;
  handle: string;
  source: string;
  products: PickerProduct[];
}) {
  const inHere = (p: PickerProduct) => p.category === handle || p.categories.includes(handle);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(products.filter(inHere).map((p) => p.id))
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.title.toLowerCase().includes(query));
  }, [products, q]);

  if (source !== "category") {
    const by =
      source === "new" ? "the New In flag" : source === "sale" ? "an on-sale price" : source === "bestseller" ? "the Bestseller flag" : "all products";
    return (
      <div className="rounded-md border border-dashed border-line bg-white/60 p-3 text-[13px] text-espresso/60">
        Products here are chosen automatically (by <b className="text-espresso/80">{by}</b>) — set that on each product. No manual picking needed.
      </div>
    );
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${collectionId}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Saved — ${selected.size} product${selected.size === 1 ? "" : "s"} in this collection`);
    } catch {
      toast.error("Couldn't save products");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.1em] text-espresso/55">
          Products in this collection · <b className="text-espresso">{selected.size}</b>
        </span>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-xs font-medium text-white bg-espresso rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save products"}
        </button>
      </div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="mb-2 w-full border border-line rounded-md px-2.5 py-1.5 text-sm bg-white text-espresso focus:outline-none focus:border-espresso"
      />
      <ul className="max-h-64 overflow-y-auto divide-y divide-line">
        {filtered.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-espresso shrink-0"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span className="relative h-9 w-7 shrink-0 overflow-hidden bg-beige">
                {p.image && <Image src={p.image} alt="" fill sizes="28px" className="object-cover" />}
              </span>
              <span className="text-sm text-espresso truncate">{p.title}</span>
            </label>
          </li>
        ))}
        {filtered.length === 0 && <li className="py-4 text-center text-sm text-espresso/40">No products match.</li>}
      </ul>
    </div>
  );
}
