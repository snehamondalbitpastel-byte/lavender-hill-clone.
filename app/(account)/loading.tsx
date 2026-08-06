import AccountLogo from "./_components/AccountLogo";

// Skeleton shown while an account page (orders / profile) loads. The shell —
// real logo, account icon, and nav — stays solid; only the content cards
// shimmer, so the logo never flashes as a grey bar.
export default function AccountLoading() {
  const bar = "animate-pulse rounded bg-[#ececec]";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 md:px-10">
        <AccountLogo className="w-[160px] h-auto" />
        <span className="text-[#3a3a3a]">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.7 19.2a6.4 6.4 0 0 1 12.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-6 md:px-10 md:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <nav className="flex shrink-0 flex-row gap-6 md:w-[180px] md:flex-col md:gap-4">
            <span className="text-[1.15rem] text-[#8f7060]">Orders</span>
            <span className="text-[1.15rem] text-[#8f7060]">Profile</span>
          </nav>

          <div className="flex w-full max-w-[42rem] flex-1 flex-col gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className={`${bar} mb-3 h-5 w-32`} />
                <div className="h-[4.5rem] animate-pulse rounded-xl border border-[#eee] bg-white" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
