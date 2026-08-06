// Loading placeholder that mirrors <ProductCard> — same 2/3 image + title/price/
// swatch layout, so the grid doesn't jump when the real cards arrive.
export default function ProductCardSkeleton() {
  return (
    <div className="group animate-pulse">
      <div className="relative aspect-[2/3] overflow-hidden bg-espresso/[0.06]" />
      <div className="flex flex-col items-center gap-2.5 pt-4">
        <div className="h-3.5 w-3/4 rounded bg-espresso/[0.08]" />
        <div className="h-3 w-16 rounded bg-espresso/[0.08]" />
        <div className="flex gap-1.5 pt-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="h-3.5 w-3.5 rounded-full bg-espresso/[0.08]" />
          ))}
        </div>
      </div>
    </div>
  );
}
