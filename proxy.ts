// Next.js 16 "proxy" (formerly middleware). Runs before matched routes and does
// an OPTIMISTIC auth check — it only reads the signed cookie, no database call,
// so it stays fast. The real checks also happen in the admin layout + routes.

import { NextRequest, NextResponse } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";
import { decryptCustomer, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Customer area (/orders, /profile): needs a valid customer session ---
  if (pathname.startsWith("/orders") || pathname.startsWith("/profile")) {
    const customer = await decryptCustomer(
      req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value
    );
    if (!customer) {
      return NextResponse.redirect(
        new URL("/authentication/login", req.nextUrl)
      );
    }
    return NextResponse.next();
  }

  // --- Admin area (below) ---
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);
  const isAdmin = !!session && session.role === "admin";

  const isLoginPage = pathname === "/admin/login";
  // The auth endpoints must stay reachable while logged out.
  const isAuthApi =
    pathname === "/api/admin/login" || pathname === "/api/admin/logout";

  // Already signed in and hitting the login page → go to the dashboard.
  if (isLoginPage && isAdmin) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  // Any other admin page / admin API without a valid admin session → block.
  if (!isAdmin && !isLoginPage && !isAuthApi) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  return NextResponse.next();
}

// Admin surfaces + the customer account area. The rest of the storefront is
// untouched.
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/orders/:path*",
    "/profile/:path*",
  ],
};
