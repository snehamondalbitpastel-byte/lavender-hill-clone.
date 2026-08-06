"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Posts to /api/auth/logout (clears the httpOnly cookie server-side) then
// returns to the sign-in screen.
export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/authentication/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
