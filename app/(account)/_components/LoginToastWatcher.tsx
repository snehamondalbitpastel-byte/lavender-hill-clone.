"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

// Shows the "logged in" toast AFTER the post-login redirect lands, so it appears
// with the destination UI — not while the sign-in loader is still on screen.
// OtpForm sets `lh_login_toast` (a timestamp) right before redirecting; this
// watcher fires on the next route change and clears the flag.
export default function LoginToastWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lh_login_toast");
      if (!raw) return;
      sessionStorage.removeItem("lh_login_toast");
      // Only if it was set moments ago (guards against a stale flag firing later).
      if (Date.now() - Number(raw) < 10000) {
        toast.success("Logged in successfully");
      }
    } catch {
      /* private mode / no sessionStorage — nothing to show */
    }
  }, [pathname]);
  return null;
}
