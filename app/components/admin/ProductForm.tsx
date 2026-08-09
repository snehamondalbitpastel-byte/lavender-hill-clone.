"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EMPTY_CONTENT, type ProductContent } from "@/lib/products";

// stock: "" = not tracked (unlimited) · a number (as string) = units of THIS colour
// (fallback, used only when the product has no sizes). sizeStock: per-size units
// keyed by size label ("" = unlimited), the source of truth when sizes exist.
type Colour = { name: string; hex: string; image: string; hover: string; stock: string; sizeStock: Record<string, string> };

export type ProductFormData = {
  id?: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  categories: string[];
  productType: string;
  price: string;
  compareAtPrice: string;
  discountType: string; // "" (none) | percent | fixed
  discountValue: string;
  rating: number;
  reviews: number;
  badge: string;
  sizes: string[];
  colours: Colour[];
  content: ProductContent;
  bestseller: boolean;
  isNew: boolean;
};

type Category = { handle: string; label: string };

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const inputCls =
  "border border-line rounded-md px-3 py-2 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full";
const labelCls = "text-xs uppercase tracking-[0.1em] text-espresso/60 mb-1.5 block";
const cardCls = "bg-cream border border-line rounded-xl shadow-soft p-6";

// Live preview of the resulting sale price (display only — the real, authoritative
// calc is productPricing() on the server; this just mirrors its whole-rupee math).
function previewSale(price: string, type: string, value: string) {
  const list = Number((price || "").replace(/[^0-9.]/g, "")) || 0;
  const v = Number(value) || 0;
  if (!type || v <= 0 || list <= 0) return null;
  const off =
    type === "percent"
      ? Math.round((list * Math.min(v, 100)) / 100)
      : Math.min(Math.round(v), list);
  if (off <= 0) return null;
  const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US") + ".00";
  return {
    sell: fmt(Math.max(0, list - off)),
    was: fmt(list),
    off: type === "percent" ? `${Math.min(v, 100)}%` : fmt(off),
  };
}

export default function ProductForm({
  initial,
  categories = [],
  backHref = "/admin/products",
}: {
  initial?: Partial<ProductFormData>;
  categories?: Category[];
  backHref?: string;
}) {
  const router = useRouter();
  const editing = !!initial?.id;
  // Collections listed A→Z so a newly-created one slots in predictably.
  const sortedCategories = [...categories].sort((a, b) => a.label.localeCompare(b.label));

  const [f, setF] = useState<ProductFormData>({
    id: initial?.id,
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    categories: initial?.categories ?? [],
    productType: initial?.productType ?? "",
    price: initial?.price ?? "",
    compareAtPrice: initial?.compareAtPrice ?? "",
    discountType: initial?.discountType ?? "",
    discountValue: initial?.discountValue ?? "",
    rating: initial?.rating ?? 0,
    reviews: initial?.reviews ?? 0,
    badge: initial?.badge ?? "",
    sizes: initial?.sizes ?? [],
    colours: initial?.colours?.length ? initial.colours : [{ name: "", hex: "#000000", image: "", hover: "", stock: "", sizeStock: {} }],
    content: initial?.content ?? structuredClone(EMPTY_CONTENT),
    bestseller: initial?.bestseller ?? false,
    isNew: initial?.isNew ?? false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }
  // Merge a patch into the rich content object.
  const C = f.content;
  function setC<K extends keyof ProductContent>(k: K, v: ProductContent[K]) {
    set("content", { ...C, [k]: v });
  }
  const salePreview = previewSale(f.price, f.discountType, f.discountValue);
  // Live compare-at sale preview: a compare-at HIGHER than the price puts the
  // product on Sale (struck "was" price + auto "Save Rs X" badge). Shown so the
  // admin sees the result — and is warned if compare-at ≤ price (no sale).
  const priceNum = parseFloat(String(f.price).replace(/[^\d.]/g, "")) || 0;
  const compareNum = parseFloat(String(f.compareAtPrice).replace(/[^\d.]/g, "")) || 0;
  const compareSave = compareNum > priceNum && priceNum > 0 ? Math.round(compareNum - priceNum) : 0;
  const compareInvalid = compareNum > 0 && priceNum > 0 && compareNum <= priceNum;
  const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US") + ".00";
  const toggleSize = (s: string) =>
    set("sizes", f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s]);
  const setColour = (i: number, patch: Partial<Colour>) =>
    set("colours", f.colours.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setColourSize = (i: number, size: string, value: string) =>
    set("colours", f.colours.map((c, j) => (j === i ? { ...c, sizeStock: { ...(c.sizeStock ?? {}), [size]: value } } : c)));
  const addColour = () => set("colours", [...f.colours, { name: "", hex: "#000000", image: "", hover: "", stock: "", sizeStock: {} }]);
  const removeColour = (i: number) => set("colours", f.colours.filter((_, j) => j !== i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...f, colours: f.colours.filter((c) => c.name && c.image) };
    const url = editing ? `/api/admin/products/${f.id}` : "/api/admin/products";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      // The API returns which list page this product landed on — go there so the
      // saved product is visible (new products sit on the last page, not page 1).
      const data = await res.json().catch(() => ({}));
      toast.success(editing ? "Product updated" : "Product added");
      router.push(data.page ? `/admin/products?page=${data.page}` : "/admin/products");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Save failed.");
      toast.error(d.error || "Save failed.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT: basics + price + sizes ---------- */}
        <div className="flex flex-col gap-6">
          <section className={cardCls}>
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-4">Basics</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} required placeholder="Crew Neck Cotton Modal T-shirt" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={`${inputCls} min-h-[80px] resize-y`} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Made from a premium cotton-modal blend…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Collection <span className="normal-case text-espresso/40">(main)</span></label>
                  <select className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value)}>
                    <option value="">— none —</option>
                    {sortedCategories.map((c) => <option key={c.handle} value={c.handle}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Product type</label>
                  <input className={inputCls} value={f.productType} onChange={(e) => set("productType", e.target.value)} placeholder="Women's Short Sleeve T-shirt" />
                </div>
              </div>
              {categories.length > 0 && (
                <div>
                  <label className={labelCls}>Also show in these collections <span className="normal-case text-espresso/40">— optional; a product can appear in several collections</span></label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 border border-line rounded-md p-3 bg-white">
                    {sortedCategories.map((c) => (
                      <label key={c.handle} className="flex items-center gap-1.5 text-sm text-espresso cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-espresso"
                          checked={f.categories.includes(c.handle)}
                          onChange={(e) =>
                            set("categories", e.target.checked ? [...f.categories, c.handle] : f.categories.filter((h) => h !== c.handle))
                          }
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={cardCls}>
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-4">Price</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Price <span className="normal-case text-espresso/40">(what the customer pays)</span></label>
                <input className={inputCls} value={f.price} onChange={(e) => set("price", e.target.value)} required placeholder="6500 or Rs. 6,500.00" />
              </div>
              <div>
                <label className={labelCls}>Compare-at price <span className="normal-case text-espresso/40">(the higher “was” price)</span></label>
                <input className={inputCls} value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="e.g. 9100 (must be higher)" />
              </div>
            </div>
            {compareSave > 0 ? (
              <p className="text-xs mt-2 text-[#307a07]">
                ✓ On sale — <s className="text-espresso/40">{rs(compareNum)}</s> <span className="text-plum">{rs(priceNum)}</span> · auto <b>Save {rs(compareSave)}</b> badge (purple) shows on the storefront.
              </p>
            ) : compareInvalid ? (
              <p className="text-xs mt-2 text-[#b23a3a]">
                ⚠ Compare-at ({rs(compareNum)}) must be <b>higher</b> than the price ({rs(priceNum)}) to put it on Sale — right now it won’t show a “Save” badge.
              </p>
            ) : (
              <p className="text-xs text-espresso/45 mt-2">A compare-at price <b>higher</b> than the price puts this product on Sale (auto “Save Rs X” badge, in purple).</p>
            )}

            {/* Per-product discount — an automatic markdown on the price. When set,
                the store sells at price − discount and shows the original struck
                through with a "Save Rs X" badge. Clear the type to end the sale. */}
            <div className="mt-5 border-t border-line pt-4">
              <label className={labelCls}>Discount (optional)</label>
              <div className="grid grid-cols-2 gap-4">
                <select className={inputCls} value={f.discountType} onChange={(e) => set("discountType", e.target.value)}>
                  <option value="">No discount</option>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
                {f.discountType && (
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    max={f.discountType === "percent" ? 100 : undefined}
                    value={f.discountValue}
                    onChange={(e) => set("discountValue", e.target.value)}
                    placeholder={f.discountType === "percent" ? "20" : "500"}
                  />
                )}
              </div>
              {salePreview ? (
                <p className="text-xs text-espresso/55 mt-2">
                  Sells at <span className="text-plum">{salePreview.sell}</span>{" "}
                  <s className="text-espresso/40">{salePreview.was}</s> — {salePreview.off} off, applied automatically at checkout.
                </p>
              ) : (
                <p className="text-xs text-espresso/45 mt-2">Applies automatically — no code needed. Stacks with coupon codes.</p>
              )}
            </div>

          </section>

          <section className={cardCls}>
            <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-4">Sizes</h2>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-4 py-2 rounded-md text-sm border transition-colors ${f.sizes.includes(s) ? "bg-espresso text-cream border-espresso" : "bg-white text-espresso/70 border-line hover:border-espresso/40"}`}>
                  {s}
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* ---------- RIGHT: colours (bounded height, scrolls internally) ---------- */}
        <div className="flex flex-col gap-6">
          <section className={`${cardCls} flex flex-col`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70">Colours</h2>
              <button type="button" onClick={addColour} className="text-xs font-medium text-white bg-espresso rounded-md px-3 py-1.5">+ Add colour</button>
            </div>
            <p className="text-xs text-espresso/45 mb-4">Each colour becomes one card on the shop grid. <b>Main</b> shows at rest, <b>Hover</b> on hover. Paste a URL or upload from your device.</p>
            <div className="flex flex-col gap-5 max-h-[52rem] overflow-y-auto pr-2 -mr-2">
              {f.colours.map((c, i) => (
                <div key={i} className="border border-line rounded-lg p-4 bg-white/50 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <input type="color" value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#cccccc"} onChange={(e) => setColour(i, { hex: e.target.value })} className="w-9 h-9 rounded border border-line shrink-0 cursor-pointer" title="Swatch colour" />
                    <input className={inputCls} value={c.name} onChange={(e) => setColour(i, { name: e.target.value })} placeholder="Colour name (e.g. Navy)" />
                    {f.colours.length > 1 && (
                      <button type="button" onClick={() => removeColour(i)} className="text-xs text-[#b23a3a] hover:underline shrink-0">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ImageField label="Main image" value={c.image} onChange={(url) => setColour(i, { image: url })} />
                    <ImageField label="Hover image (optional)" value={c.hover} onChange={(url) => setColour(i, { hover: url })} />
                  </div>
                  {/* Per-colour stock — blank = unlimited. Sizes of this colour share
                      this pool. Decrements on each order, restored on a restocked return. */}
                  {f.sizes.length > 0 ? (
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.08em] text-espresso/55">Stock per size</span>
                      <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {f.sizes.map((sz) => (
                          <label key={sz} className="flex flex-col gap-1">
                            <span className="text-center text-[11px] text-espresso/60">{sz}</span>
                            <input
                              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-center text-sm text-espresso focus:border-espresso focus:outline-none"
                              type="number"
                              min="0"
                              step="1"
                              value={c.sizeStock?.[sz] ?? ""}
                              onChange={(e) => setColourSize(i, sz, e.target.value)}
                              placeholder="∞"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="text-[11px] text-espresso/45 mt-1.5">
                        Units per size for this colour. Blank = unlimited, 0 = out of stock. Customers can buy up to 5 per order.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.08em] text-espresso/55">Stock for this colour</span>
                      <input
                        className={`${inputCls} mt-1.5`}
                        type="number"
                        min="0"
                        step="1"
                        value={c.stock}
                        onChange={(e) => setColour(i, { stock: e.target.value })}
                        placeholder="Leave blank for unlimited"
                      />
                      <p className="text-[11px] text-espresso/45 mt-1.5">
                        {c.stock === ""
                          ? "Not tracked — unlimited."
                          : Number(c.stock) === 0
                            ? "Out of stock — this colour can't be added."
                            : `${Number(c.stock)} in stock. Customers can buy up to 5 per order.`}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ---------- Placement & details (full width) ---------- */}
      <section className={cardCls}>
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-4">Placement &amp; details</h2>
        <div className="rounded-md bg-beige/70 border border-line px-3 py-2.5 mb-4 text-xs text-espresso/70 leading-relaxed">
          Every product shows on <b className="text-espresso">Shop</b> automatically. Add a <b className="text-espresso">Compare-at price</b> to put it on <b className="text-espresso">Sale</b>. Tick below to feature it on <b className="text-espresso">New Arrivals</b>.
        </div>
        <label className="flex items-center gap-2 text-sm text-espresso cursor-pointer mb-3">
          <input type="checkbox" checked={f.isNew} onChange={(e) => set("isNew", e.target.checked)} className="w-4 h-4 accent-espresso" />
          Show on New In page
        </label>
        <label className="flex items-center gap-2 text-sm text-espresso cursor-pointer mb-5">
          <input type="checkbox" checked={f.bestseller} onChange={(e) => set("bestseller", e.target.checked)} className="w-4 h-4 accent-espresso" />
          Feature in “Our Bestselling T-Shirts” (home page)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          <div>
            <label className={labelCls}>Rating (0–5)</label>
            <input type="number" step="0.1" min="0" max="5" className={inputCls} value={f.rating} onChange={(e) => set("rating", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Reviews</label>
            <input type="number" min="0" className={inputCls} value={f.reviews} onChange={(e) => set("reviews", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Badge</label>
            <input className={inputCls} value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Buy 3+, Save 15%" />
          </div>
        </div>
        <p className="text-xs text-espresso/45 mt-3">
          The star rating shows on the storefront only when <b className="text-espresso">Reviews</b> is 1 or more.
        </p>
      </section>

      {/* ---------- Product detail content (full width) ---------- */}
      <section className={cardCls}>
        <h2 className="text-sm uppercase tracking-[0.1em] text-espresso/70 mb-1">Product detail content</h2>
        <p className="text-xs text-espresso/45 mb-5">
          Shown on the product page. Leave a section empty to hide it. Paste image/video URLs.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Material Matters */}
          <div>
            <SubHead title="Material Matters" />
            <div className="flex flex-col gap-2">
              {C.materialMatters.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} placeholder="Label (e.g. Super Soft)" value={m.label}
                    onChange={(e) => setC("materialMatters", C.materialMatters.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className={inputCls} placeholder="Icon URL" value={m.icon}
                    onChange={(e) => setC("materialMatters", C.materialMatters.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))} />
                  <DelBtn onClick={() => setC("materialMatters", C.materialMatters.filter((_, j) => j !== i))} />
                </div>
              ))}
            </div>
            <AddBox label="Add badge" onClick={() => setC("materialMatters", [...C.materialMatters, { label: "", icon: "" }])} />
          </div>

          {/* Accordions */}
          <div>
            <SubHead title="Accordions (Fabric & Care, Size Guide…)" />
            <div className="flex flex-col gap-3">
              {C.accordions.map((a, i) => (
                <div key={i} className="border border-line rounded-md bg-white/50 p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input className={inputCls} placeholder="Title" value={a.title}
                      onChange={(e) => setC("accordions", C.accordions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <DelBtn onClick={() => setC("accordions", C.accordions.filter((_, j) => j !== i))} />
                  </div>
                  <textarea className={`${inputCls} min-h-[60px] resize-y`} placeholder="Body (each new line = a paragraph)" value={a.body}
                    onChange={(e) => setC("accordions", C.accordions.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              ))}
            </div>
            <AddBox label="Add accordion" onClick={() => setC("accordions", [...C.accordions, { title: "", body: "" }])} />
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-6 border-t border-line pt-5">
          <p className={labelCls}>Key Features</p>
          <textarea className={`${inputCls} min-h-[56px] resize-y mb-2`} placeholder="Intro paragraph" value={C.keyFeatures.intro}
            onChange={(e) => setC("keyFeatures", { ...C.keyFeatures, intro: e.target.value })} />
          <input className={`${inputCls} mb-3`} placeholder="Section image URL" value={C.keyFeatures.image}
            onChange={(e) => setC("keyFeatures", { ...C.keyFeatures, image: e.target.value })} />
          <ItemRows items={C.keyFeatures.items} onChange={(items) => setC("keyFeatures", { ...C.keyFeatures, items })} />
        </div>

        {/* Why You'll Love It */}
        <div className="mt-6 border-t border-line pt-5">
          <p className={labelCls}>Why You&apos;ll Love It</p>
          <input className={`${inputCls} mb-3`} placeholder="Section image URL" value={C.whyYouLoveIt.image}
            onChange={(e) => setC("whyYouLoveIt", { ...C.whyYouLoveIt, image: e.target.value })} />
          <ItemRows items={C.whyYouLoveIt.items} onChange={(items) => setC("whyYouLoveIt", { ...C.whyYouLoveIt, items })} />
        </div>

        {/* Styling Tips */}
        <div className="mt-6 border-t border-line pt-5">
          <p className={labelCls}>Styling Tips</p>
          <input className={`${inputCls} mb-3`} placeholder="Section image URL" value={C.stylingTips.image}
            onChange={(e) => setC("stylingTips", { ...C.stylingTips, image: e.target.value })} />
          <StringRows values={C.stylingTips.tips} placeholder="Tip" onChange={(tips) => setC("stylingTips", { ...C.stylingTips, tips })} />
          <textarea className={`${inputCls} min-h-[48px] resize-y mt-2`} placeholder="Closing line (optional)" value={C.stylingTips.closing}
            onChange={(e) => setC("stylingTips", { ...C.stylingTips, closing: e.target.value })} />
        </div>

        {/* Behind The Seams */}
        <div className="mt-6 border-t border-line pt-5">
          <p className={labelCls}>Behind The Seams</p>
          <textarea className={`${inputCls} min-h-[56px] resize-y mb-2`} placeholder="Description" value={C.behindTheSeams.description}
            onChange={(e) => setC("behindTheSeams", { ...C.behindTheSeams, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className={inputCls} placeholder="Video URL (mp4)" value={C.behindTheSeams.videoUrl}
              onChange={(e) => setC("behindTheSeams", { ...C.behindTheSeams, videoUrl: e.target.value })} />
            <input className={inputCls} placeholder="Video poster URL" value={C.behindTheSeams.poster}
              onChange={(e) => setC("behindTheSeams", { ...C.behindTheSeams, poster: e.target.value })} />
          </div>
          <StringRows values={C.behindTheSeams.images} placeholder="Image URL" onChange={(images) => setC("behindTheSeams", { ...C.behindTheSeams, images })} />
        </div>
      </section>

      {error && (
        <p className="text-sm text-[#b23a3a] bg-[#f4dede] border border-[#e6bcbc] rounded-md px-4 py-3 text-center">{error}</p>
      )}

      {/* Bottom-centre actions — a clean footer row */}
      <div className="flex items-center justify-center gap-4 border-t border-line pt-6 mt-1">
        <button type="submit" disabled={saving} className="btn-lh justify-center disabled:opacity-60 disabled:cursor-not-allowed">
          {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        <button type="button" onClick={() => router.push(backHref)} className="text-sm text-espresso/60 hover:text-espresso px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}

// A single image slot: upload from device OR paste a URL. Shows the full image
// (never cropped) once set, with a Remove control that returns to the uploader.
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(file?: File | null) {
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) return setErr("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setErr("Image must be under 5 MB.");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok && data.url) onChange(data.url);
    else setErr(data.error || "Upload failed.");
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.08em] text-espresso/55">{label}</span>

      {value ? (
        // Full preview (object-contain → nothing is cut off) + remove.
        <div className="relative border border-line rounded-lg overflow-hidden bg-white aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-cream/90 border border-line text-espresso flex items-center justify-center hover:bg-espresso hover:text-cream transition-colors"
          >
            <svg width="10" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
        </div>
      ) : (
        // Empty → the "+" uploader.
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-line rounded-lg aspect-[3/4] flex flex-col items-center justify-center gap-1.5 text-espresso/40 hover:border-espresso/40 hover:text-espresso/60 transition-colors"
        >
          {uploading ? (
            <span className="text-xs">Uploading…</span>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="text-[11px]">Upload image</span>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input
        className="border border-line rounded-md px-2.5 py-1.5 text-xs bg-white text-espresso focus:outline-none focus:border-espresso transition-colors w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="or paste image URL"
      />
      {err && <p className="text-[11px] text-[#b23a3a]">{err}</p>}
    </div>
  );
}

// ---- Content-editor helpers ----
function SubHead({ title }: { title: string }) {
  return <p className="text-xs uppercase tracking-[0.1em] text-espresso/60 mb-2">{title}</p>;
}

// Dashed, transparent "+ Add" box used for every add-row action.
function AddBox({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-md border border-dashed border-line bg-transparent py-2 text-xs text-espresso/60 transition-colors hover:border-espresso/50 hover:text-espresso"
    >
      + {label}
    </button>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="shrink-0 w-9 rounded-md border border-line text-[#b23a3a] hover:bg-[#f4dede] flex items-center justify-center"
    >
      <svg width="10" viewBox="0 0 16 16" fill="none"><path d="m1 1 14 14M1 15 15 1" stroke="currentColor" strokeWidth="2" /></svg>
    </button>
  );
}

// Title + description rows (Key Features / Why You'll Love It items).
function ItemRows({
  items,
  onChange,
}: {
  items: { title: string; desc: string }[];
  onChange: (v: { title: string; desc: string }[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={`${inputCls} max-w-[38%]`}
            placeholder="Title"
            value={it.title}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
          />
          <input
            className={inputCls}
            placeholder="Description"
            value={it.desc}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
          />
          <DelBtn onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddBox label="Add item" onClick={() => onChange([...items, { title: "", desc: "" }])} />
    </div>
  );
}

// Simple list of string rows (styling tips / image URLs).
function StringRows({
  values,
  placeholder,
  onChange,
}: {
  values: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputCls}
            placeholder={placeholder}
            value={v}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <DelBtn onClick={() => onChange(values.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddBox label={`Add ${placeholder.toLowerCase()}`} onClick={() => onChange([...values, ""])} />
    </div>
  );
}
