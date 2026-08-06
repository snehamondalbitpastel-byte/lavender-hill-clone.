"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import AccountLogo from "../../_components/AccountLogo";

const LEN = 6;

export default function OtpForm({
  email,
  marketing,
  redirect,
}: {
  email: string;
  marketing: boolean;
  redirect?: string;
}) {
  const router = useRouter();
  // Where to go after a successful sign-in — the product the guest came from,
  // else the account. Only internal paths are allowed (no open redirect).
  const dest =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/orders";
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function focusAt(i: number) {
    inputs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();
  }

  // Once all 6 digits are entered, verify the code server-side. On success the
  // server sets the httpOnly session cookie and we move to /orders.
  async function complete(code: string[]) {
    if (!code.every((d) => d !== "") || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.join(""), marketing }),
      });
      if (res.ok) {
        // Success — DON'T toast here (that would show while the loader is still
        // up). Flag it and redirect; the destination page's watcher shows the
        // toast once the new UI is rendered. `busy` stays true so the loader
        // covers the transition (no flash of the empty OTP boxes).
        try {
          sessionStorage.setItem("lh_login_toast", String(Date.now()));
        } catch {
          /* private mode — skip the deferred toast */
        }
        router.push(dest);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That code isn't right. Try again.");
      setDigits(Array(LEN).fill(""));
      focusAt(0);
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  // Send a fresh code to the same email.
  async function resend() {
    if (resending) return;
    setResending(true);
    setError("");
    setResent(false);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, marketing }),
      });
      if (res.ok) {
        setResent(true);
        setDigits(Array(LEN).fill(""));
        focusAt(0);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't resend the code.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setResending(false);
  }

  function setAt(i: number, value: string) {
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    return next;
  }

  function onChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      setAt(i, "");
      return;
    }
    const char = d[d.length - 1];
    const next = setAt(i, char);
    if (i < LEN - 1) focusAt(i + 1);
    complete(next);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      focusAt(i - 1);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!pasted) return;
    const next = Array(LEN).fill("");
    for (let k = 0; k < pasted.length; k++) next[k] = pasted[k];
    setDigits(next);
    focusAt(pasted.length >= LEN ? LEN - 1 : pasted.length);
    complete(next);
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6">
      {/* Full-screen loader while the code is verified / we redirect in. */}
      {busy && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <span
            className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--acc-line)] border-t-[#1a1a1a]"
            aria-hidden="true"
          />
          <p className="mt-4 text-[0.9rem] text-[#6b6b6b]">Signing you in…</p>
        </div>
      )}

      <div className="mt-14 md:mt-16">
        <AccountLogo className="w-[191px] h-[60px]" />
      </div>

      <main className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-[27.5rem]">
          <h1 className="text-[1.75rem]">Enter code</h1>
          <p className="mt-2 text-[0.95rem] text-[#6b6b6b]">
            Sent to {email || "your email"}{" "}
            <Link
              href="/authentication/login"
              className="ml-1 text-[#1a1a1a] underline decoration-[#c4c4c4] underline-offset-2 hover:decoration-[#1a1a1a]"
            >
              Change
            </Link>
          </p>

          <div className="mt-7 flex gap-2.5 sm:gap-3" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                autoFocus={i === 0}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                disabled={busy}
                className="h-14 w-full rounded-lg border border-[var(--acc-line)] bg-white text-center text-lg text-[#1a1a1a] caret-[var(--acc-accent)] outline-none transition-colors focus:border-[#1a1a1a] disabled:opacity-60"
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-[0.85rem] text-[#c2334d]">{error}</p>
          )}

          <p className="mt-5 text-[0.85rem] text-[#6b6b6b]">
            {resent ? "A new code is on its way." : "Didn't get a code?"}{" "}
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="text-[#1a1a1a] underline decoration-[#c4c4c4] underline-offset-2 transition-colors hover:decoration-[#1a1a1a] disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend"}
            </button>
          </p>
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
