// ============================================================
// Per-COLOUR inventory. Stock is tracked per colour and lives on each colour
// object inside a product's `colourData` JSON (no dedicated DB column) —
// { name, hex, image, hover, stock }. `stock == null` means that colour isn't
// tracked (treated as unlimited). Sizes of the same colour share its pool.
//
// Pure module: NO prisma / next imports, so it's safe to use on the client
// (ProductDetail, CartProvider) AND the server (orders / returns routes).
// ============================================================

// The most units of a single variant a customer may buy in one order. A
// per-ORDER cap (not per-customer): the same shopper can place another order
// later and buy more, while stock lasts — how normal stores work.
export const MAX_PER_ORDER = 5;

export type ColourStock = {
  name: string;
  hex?: string;
  image?: string;
  hover?: string;
  stock?: number | null; // colour-level fallback (used when the product has NO sizes)
  // Per-SIZE stock for this colour: { XS: 5, S: 5, M: 0, … }. When present it is the
  // source of truth per size; a value of null on a size = that size is untracked.
  sizeStock?: Record<string, number | null>;
};

const clamp0 = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));

// Stock of a specific (colour, size) VARIANT from a colour object. If the colour
// tracks this size (sizeStock has the key) that wins; otherwise fall back to the
// colour-level stock. null = untracked / unlimited.
export function variantStockOf(c: ColourStock | undefined, size?: string): number | null {
  if (!c) return null;
  if (size && c.sizeStock && Object.prototype.hasOwnProperty.call(c.sizeStock, size)) {
    const v = c.sizeStock[size];
    return v == null ? null : clamp0(v);
  }
  return c.stock == null ? null : clamp0(c.stock);
}

// Is the whole colour sold out? True only when EVERY offered size is tracked and 0
// (so a colour with any available/untracked size is not "sold out"). With no sizes
// it falls back to the colour-level stock.
export function colourSoldOutOf(c: ColourStock | undefined, sizes: string[]): boolean {
  if (!c) return false;
  if (!sizes || sizes.length === 0) return c.stock != null && c.stock <= 0;
  return sizes.every((sz) => {
    const v = variantStockOf(c, sz);
    return v != null && v <= 0;
  });
}

// ---- colourData (JSON string) variants, for server routes ----

export function variantStock(colourData: string, colourName: string, size?: string): number | null {
  let arr: ColourStock[] = [];
  try { arr = JSON.parse(colourData || "[]"); } catch { return null; }
  return variantStockOf(arr.find((x) => x.name === colourName), size);
}

// Return a NEW colourData JSON string with the (colour, size) variant's stock
// changed by `delta` (clamped ≥ 0). Prefers the per-size entry; else adjusts the
// colour-level stock. Untracked variants are left unchanged.
export function adjustVariantStock(colourData: string, colourName: string, size: string | undefined, delta: number): string {
  let arr: ColourStock[] = [];
  try { arr = JSON.parse(colourData || "[]"); } catch { return colourData; }
  const next = arr.map((c) => {
    if (c.name !== colourName) return c;
    if (size && c.sizeStock && Object.prototype.hasOwnProperty.call(c.sizeStock, size) && c.sizeStock[size] != null) {
      return { ...c, sizeStock: { ...c.sizeStock, [size]: clamp0(clamp0(c.sizeStock[size]) + delta) } };
    }
    if (c.stock != null) return { ...c, stock: clamp0(clamp0(c.stock) + delta) };
    return c;
  });
  return JSON.stringify(next);
}

// Read one colour's stock from a colourData JSON string. Returns null when the
// colour is missing OR untracked (both mean "no cap / unlimited").
export function colourStock(colourData: string, colourName: string): number | null {
  let arr: ColourStock[] = [];
  try {
    arr = JSON.parse(colourData || "[]");
  } catch {
    return null;
  }
  const c = arr.find((x) => x.name === colourName);
  if (!c || c.stock == null) return null;
  return Math.max(0, Math.floor(Number(c.stock) || 0));
}

// Return a NEW colourData JSON string with the named colour's stock changed by
// `delta` (negative to decrement, positive to restock), clamped ≥ 0. Untracked
// colours (stock == null) are left exactly as-is.
export function adjustColourStock(colourData: string, colourName: string, delta: number): string {
  let arr: ColourStock[] = [];
  try {
    arr = JSON.parse(colourData || "[]");
  } catch {
    return colourData;
  }
  const next = arr.map((c) =>
    c.name === colourName && c.stock != null
      ? { ...c, stock: Math.max(0, Math.floor(Number(c.stock) || 0) + delta) }
      : c
  );
  return JSON.stringify(next);
}

// The effective quantity cap for one variant line = min(available stock, per-order
// max). Untracked colours cap only at the per-order max.
export function maxQtyFor(stock: number | null): number {
  return stock != null ? Math.min(stock, MAX_PER_ORDER) : MAX_PER_ORDER;
}
