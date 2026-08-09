// Decides a product badge's colour from its TEXT (client-safe — no imports).
//   plum/"on sale" (badge-lh--sale): a "Save …" line or a "25% off" style discount
//   brown (badge-lh):                a promo like "Buy 3+, Save 15%"
// So the auto sale badge AND a manually-typed "Save Rs X" both render plum, while
// promo badges stay brown.
export function isSaleBadge(text: string | null | undefined): boolean {
  const t = String(text ?? "").trim().toLowerCase();
  if (!t) return false;
  if (/^save\b/.test(t)) return true; // "Save Rs 2,600.00", "Save $31.20"
  if (/^-?\s*\d+%\s*(off)?$/.test(t)) return true; // "25% off", "-25%"
  return false; // "Buy 3+, Save 15%" → brown (doesn't start with "save")
}

export function badgeClass(text: string | null | undefined): string {
  return isSaleBadge(text) ? "badge-lh badge-lh--sale" : "badge-lh";
}
