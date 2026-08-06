import AccountLogo from "../../_components/AccountLogo";

// Loading skeleton for the ORDER DETAIL page. A dedicated boundary so a refresh
// of /orders/[id] shows a detail-shaped skeleton — NOT the orders-list skeleton
// from the group-level (account)/loading.tsx.
export default function OrderDetailLoading() {
  const bar = "animate-pulse rounded bg-[#ececec]";
  const card = "animate-pulse rounded-xl border border-[#eee] bg-white";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-6 py-6 md:px-10">
        <AccountLogo className="w-[160px] h-auto" />
        <span className="text-[#3a3a3a]">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.7 19.2a6.4 6.4 0 0 1 12.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </header>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-6 md:px-10">
        <div className={`${bar} h-3 w-24`} />

        {/* order title + status chips */}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={`${bar} h-7 w-44`} />
            <div className={`${bar} mt-2 h-3 w-72`} />
          </div>
          <div className="flex gap-2">
            <div className={`${bar} h-6 w-24 rounded-full`} />
            <div className={`${bar} h-6 w-20 rounded-full`} />
          </div>
        </div>

        {/* order status card */}
        <div className={`${card} mt-6 h-32`} />

        {/* wide-left / narrow-right grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1.8fr_1fr] md:items-start">
          <div className="flex flex-col gap-6">
            <div className={`${card} h-52`} />
            <div className={`${card} h-72`} />
          </div>
          <div className="flex flex-col gap-6">
            <div className={`${card} h-44`} />
            <div className={`${card} h-40`} />
            <div className={`${card} h-28`} />
          </div>
        </div>
      </main>
    </div>
  );
}
