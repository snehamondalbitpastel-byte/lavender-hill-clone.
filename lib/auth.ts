// Admin auth helpers: password hashing (bcrypt) + the session cookie
// (httpOnly, so browser JavaScript can never read or copy it) + guards.

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  encrypt,
  decrypt,
  SESSION_COOKIE,
  type SessionPayload,
} from "./session";

// ---- Passwords (only the hash is ever stored) ----
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---- Session cookie ----
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encrypt(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable by client-side JS (blocks XSS theft)
    secure: process.env.NODE_ENV === "production", // https-only in prod
    sameSite: "lax",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Read + verify the current session (cached per request).
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  return decrypt(store.get(SESSION_COOKIE)?.value);
});

// Server-component guard: redirect to login unless a valid admin session exists.
export const requireAdmin = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
});

// Route-handler guard: returns the session or null (caller returns 401/403).
export async function getAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session && session.role === "admin" ? session : null;
}
