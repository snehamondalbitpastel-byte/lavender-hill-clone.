import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/app/components/admin/Sidebar";

export const dynamic = "force-dynamic";

// Wraps every admin page EXCEPT /admin/login (which sits outside this route
// group). `requireAdmin()` redirects to the login page if there is no valid
// admin session — a second line of defence behind the proxy.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();
  // Notification badge: returns awaiting the admin's first action.
  const pendingReturns = await prisma.return.count({ where: { status: "requested" } });

  return (
    <div className="flex bg-beige min-h-screen text-espresso">
      <Sidebar email={session.email} pendingReturns={pendingReturns} />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8">
        <div className="mx-auto w-full max-w-[100rem]">{children}</div>
      </main>
      {/* Toasts for admin actions (create / update / delete). Persists across
          in-app navigations because it lives in the shared layout. */}
      <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 3000 }} />
    </div>
  );
}
