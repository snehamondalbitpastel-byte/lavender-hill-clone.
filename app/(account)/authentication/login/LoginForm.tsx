"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AccountLogo from "../../_components/AccountLogo";

export default function LoginForm({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, marketing }),
      });
      if (res.ok) {
        const rd = redirect ? `&redirect=${encodeURIComponent(redirect)}` : "";
        router.push(
          `/authentication/code?email=${encodeURIComponent(value)}&m=${
            marketing ? 1 : 0
          }${rd}`
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6">
      <div className="mt-14 md:mt-16">
        <AccountLogo className="w-[191px] h-[60px]" />
      </div>

      {/* Form, vertically centered in the space between logo and footer */}
      <main className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-[27.5rem]">
          <h1 className="text-[1.75rem]">Sign in</h1>
          <p className="mt-1 text-[0.95rem] text-[#6b6b6b]">
            Sign in or create an account
          </p>

          <form onSubmit={onSubmit} className="mt-7" noValidate>
            {/* Floating-label email + inline arrow submit */}
            <div className="relative">
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer h-14 w-full rounded-lg border border-[var(--acc-line)] bg-white px-4 pr-14 pt-3 text-[0.95rem] text-[#1a1a1a] outline-none transition-colors focus:border-[#1a1a1a]"
              />
              <label
                htmlFor="email"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] text-[#6b6b6b] transition-all peer-focus:top-[0.7rem] peer-focus:translate-y-0 peer-focus:text-[0.7rem] peer-[:not(:placeholder-shown)]:top-[0.7rem] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[0.7rem]"
              >
                Email
              </label>
              <button
                type="submit"
                aria-label="Continue"
                disabled={busy}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#1a1a1a] transition-colors hover:bg-[#f2f2f2] disabled:opacity-40"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a1a1a] border-t-transparent" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h13M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-[0.8rem] text-[#c2334d]">{error}</p>
            )}

            {/* News & offers — checked by default (as on the live site) */}
            <label className="mt-4 flex cursor-pointer select-none items-center gap-2.5">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#c4c4c4] bg-white transition-colors peer-checked:border-[var(--acc-accent)] peer-checked:bg-[var(--acc-accent)]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6.2 5 8.6 9.5 3.4"
                    stroke="#fff"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[0.9rem] text-[#1a1a1a]">
                Email me with news and offers
              </span>
            </label>

            <p className="mt-6 text-center text-[0.8rem] leading-relaxed text-[#6b6b6b]">
              By continuing, you agree to our{" "}
              <a href="#" className="underline decoration-[#c4c4c4] underline-offset-2 hover:text-[#1a1a1a]">
                Terms of service
              </a>
            </p>
          </form>
        </div>
      </main>

      <footer className="py-8">
        <a
          href="#"
          className="text-[0.85rem] text-[#6b6b6b] transition-colors hover:text-[#1a1a1a]"
        >
          Privacy policy
        </a>
      </footer>
    </div>
  );
}
