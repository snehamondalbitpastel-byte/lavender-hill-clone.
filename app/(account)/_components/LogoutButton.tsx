"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/app/components/LocaleProvider";

// Posts to /api/auth/logout (clears the httpOnly cookie server-side) then
// returns to the sign-in screen.
export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    // Keep the loader visible for a beat (min ~800ms) so it reads as a smooth
    // transition rather than a flash, then land on the HOME page (not sign-in).
    await Promise.all([
      fetch("/api/auth/logout", { method: "POST" }),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={logout} disabled={busy} className={className}>
        {t("account.sign_out", "Sign out")}
      </button>

      {/* Full-screen loader while signing out — a centered white card with a
          spinner + localized "Signing out…" (matches the live account UI). */}
      {busy && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40" role="status" aria-live="polite">
          <div className="flex min-w-[340px] flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#e3e3e3] border-t-[#3a3a3a]" aria-hidden="true" />
            <p className="text-[0.95rem] text-[#3a3a3a]">{t("account.signing_out", "Signing out…")}</p>
          </div>
        </div>
      )}
    </>
  );
}
