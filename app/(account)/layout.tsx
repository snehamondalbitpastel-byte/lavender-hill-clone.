import type { ReactNode } from "react";
import { Toaster } from "sonner";
import LoginToastWatcher from "./_components/LoginToastWatcher";

// Customer account area (/authentication/login, /authentication/code, /orders).
// A standalone shell — deliberately WITHOUT the store's header/footer/marquee.
// `.account-scope` (globals.css) swaps in the neutral-sans, white-bg visual
// system and overrides the store's uppercase-Raleway heading base rules.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-scope min-h-screen bg-white">
      {children}
      {/* Toasts for the account area (login success, etc.). Separate route group
          from admin, so this never double-fires with the admin Toaster. */}
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3000 }} />
      {/* Fires the deferred "logged in" toast once the redirect destination
          (e.g. /orders) has rendered — after the sign-in loader is gone. */}
      <LoginToastWatcher />
    </div>
  );
}
