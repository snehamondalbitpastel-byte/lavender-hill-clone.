// Loading placeholder for the product page — mirrors the real ProductDetail grid
// (gallery 0.65fr + info 0.35fr) so the layout doesn't jump when data arrives.
// Same greys + animate-pulse as <ProductCardSkeleton>.
export default function ProductDetailSkeleton() {
  const block = "bg-espresso/[0.06]";
  const line = "rounded bg-espresso/[0.08]";
  return (
    <section className="w-full px-6 md:px-12 lg:px-14 pt-6 md:pt-10 pb-14 md:pb-20">
      <div className="animate-pulse lg:grid lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)] lg:gap-x-14 xl:gap-x-20 lg:items-start">
        {/* ===== Gallery ===== */}
        <div className="lg:col-start-1 lg:row-start-1">
          {/* Mobile: single big image */}
          <div className={`md:hidden aspect-[2/3] w-full ${block}`} />

          {/* Desktop: thumbnail strip (left) + main image (right) */}
          <div className="hidden md:flex md:gap-6">
            <div className="flex w-14 shrink-0 flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`aspect-[2/3] w-14 ${block}`} />
              ))}
            </div>
            <div className={`flex-1 aspect-[2/3] ${block}`} />
          </div>
        </div>

        {/* ===== Info column ===== */}
        <div className="mt-10 lg:mt-0 lg:col-start-2 lg:row-start-1">
          {/* Title (two lines) */}
          <div className={`h-6 w-3/4 ${line}`} />
          <div className={`mt-2 h-6 w-1/2 ${line}`} />

          {/* Rating (left) + price (right) */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className={`h-3.5 w-24 ${line}`} />
            <div className={`h-4 w-20 ${line}`} />
          </div>

          {/* Colour label + swatches */}
          <div className="mt-8">
            <div className={`h-3.5 w-28 ${line}`} />
            <div className="mt-3 flex flex-wrap gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className={`h-8 w-8 rounded-full ${block}`} />
              ))}
            </div>
          </div>

          {/* Size label + size buttons */}
          <div className="mt-8">
            <div className={`h-3.5 w-20 ${line}`} />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`h-10 w-14 ${line}`} />
              ))}
            </div>
          </div>

          {/* Quantity stepper + Add to cart */}
          <div className="mt-8 flex gap-3">
            <div className={`h-12 w-28 ${line}`} />
            <div className={`h-12 flex-1 ${line}`} />
          </div>

          {/* Accordion rows */}
          <div className="mt-10 space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-line pb-5">
                <div className={`h-3.5 w-40 ${line}`} />
                <div className={`h-3 w-3 ${line}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
