// Shared loading skeletons for the admin panel. Rendered by the loading.tsx
// files so a sidebar click shows an instant, layout-matched placeholder (inside
// the persistent sidebar + main shell) while the target server page compiles and
// fetches — instead of the old screen freezing until the new page is ready.
// Pure presentational (no hooks) → stays a server component.

const line = "rounded bg-espresso/10";
const soft = "rounded bg-espresso/[0.06]";

// Most admin pages: a header (title + action) → search/toolbar → a data table.
export function AdminListSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header: title + "Add" action */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className={`h-7 w-48 ${line}`} />
        <div className={`h-9 w-32 ${line}`} />
      </div>
      {/* Search / toolbar */}
      <div className={`mb-6 h-10 w-full max-w-sm ${line}`} />
      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-line bg-cream">
        <div className="flex gap-4 border-b border-line px-5 py-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-3.5 flex-1 ${line}`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
          >
            <div className={`h-10 w-10 shrink-0 ${soft}`} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-3.5 flex-1 ${line}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// One labelled input placeholder (label line + field box).
function FormField() {
  return (
    <div className="mb-4">
      <div className={`mb-2 h-3 w-24 ${line}`} />
      <div className={`h-9 w-full ${line}`} />
    </div>
  );
}

// The add/edit product page: centered header + ProductForm's two-column card grid
// (left = basics/price cards, right = colours card) + a save bar.
export function ProductFormSkeleton() {
  const card = "bg-cream border border-line rounded-xl shadow-soft p-6";
  return (
    <div className="animate-pulse">
      {/* Centered header (eyebrow + title) */}
      <div className="mb-6 flex flex-col items-center gap-1.5">
        <div className={`h-2.5 w-16 ${line}`} />
        <div className={`h-6 w-40 ${line}`} />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* LEFT: basics + price */}
        <div className="flex flex-col gap-6">
          <section className={card}>
            <div className={`mb-4 h-4 w-20 ${line}`} />
            {[0, 1, 2, 3].map((i) => (
              <FormField key={i} />
            ))}
          </section>
          <section className={card}>
            <div className={`mb-4 h-4 w-16 ${line}`} />
            {[0, 1, 2].map((i) => (
              <FormField key={i} />
            ))}
          </section>
        </div>
        {/* RIGHT: colours */}
        <div className="flex flex-col gap-6">
          <section className={card}>
            <div className={`mb-4 h-4 w-24 ${line}`} />
            <div className="flex flex-col gap-4">
              {[0, 1].map((r) => (
                <div key={r} className="flex gap-3">
                  <div className={`h-16 w-16 shrink-0 ${soft}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-8 w-full ${line}`} />
                    <div className={`h-8 w-2/3 ${line}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      {/* Save bar */}
      <div className={`mt-6 h-11 w-40 ${line}`} />
    </div>
  );
}
