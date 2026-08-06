// Customer (storefront) auth — passwordless email OTP.
//
// Security model:
//  - The 6-digit code is cryptographically random (crypto.randomInt).
//  - We store ONLY a bcrypt hash of it (a DB leak exposes no usable codes).
//  - Codes are single-use, expire in 10 min, and die after 5 wrong attempts.
//  - Requests are rate-limited per email to stop email-bombing / enumeration.
//  - On success we issue a signed JWT in an httpOnly + Secure + SameSite cookie
//    (see lib/customer-session.ts) — JS can never read or copy it.

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";
import { sendCode } from "./email";
import {
  CUSTOMER_SESSION_COOKIE,
  encryptCustomer,
  decryptCustomer,
  type CustomerSession,
} from "./customer-session";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // wrong tries before a code is invalidated
const MAX_CODES_PER_WINDOW = 5; // codes per email…
const REQUEST_WINDOW_MS = 60 * 60 * 1000; // …per hour
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---- Request a code ------------------------------------------------------
export type RequestResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "rate_limited" };

export async function requestCode(
  rawEmail: string,
  marketing: boolean
): Promise<RequestResult> {
  const email = normalizeEmail(rawEmail);
  if (!validEmail(email)) return { ok: false, error: "invalid_email" };

  // Rate-limit: too many codes for this email inside the window.
  const since = new Date(Date.now() - REQUEST_WINDOW_MS);
  const recent = await prisma.loginCode.count({
    where: { email, createdAt: { gte: since } },
  });
  if (recent >= MAX_CODES_PER_WINDOW) return { ok: false, error: "rate_limited" };

  // If the customer already exists, honour their marketing choice now.
  await prisma.customer.updateMany({
    where: { email },
    data: { marketingConsent: marketing },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Replace any previous codes for this email, then store the new one.
  await prisma.$transaction([
    prisma.loginCode.deleteMany({ where: { email } }),
    prisma.loginCode.create({ data: { email, codeHash, expiresAt } }),
  ]);

  // Actually wait for the code email to send (it's a one-time login code — it
  // must go out, not fire-and-forget, which can be cut off when the request
  // ends). Failures are caught so a mail problem never crashes login: the code
  // is already stored and the user can hit "Resend". The transport's timeouts
  // (see lib/email.ts) guarantee this can never hang the request forever.
  try {
    await sendCode(email, code);
  } catch (err) {
    console.error(`[auth] Failed to send sign-in code to ${email}:`, err);
  }
  return { ok: true };
}

// ---- Verify a code -------------------------------------------------------
export type VerifyResult =
  | { ok: true; customer: { id: number; email: string } }
  | { ok: false; error: "invalid" | "no_code" | "expired" | "too_many" | "mismatch" };

export async function verifyCode(
  rawEmail: string,
  rawCode: string,
  marketing: boolean
): Promise<VerifyResult> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "invalid" };
  }

  const row = await prisma.loginCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false, error: "no_code" };

  if (row.expiresAt < new Date()) {
    await prisma.loginCode.deleteMany({ where: { email } });
    return { ok: false, error: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.loginCode.deleteMany({ where: { email } });
    return { ok: false, error: "too_many" };
  }

  const match = await bcrypt.compare(code, row.codeHash); // constant-time
  if (!match) {
    await prisma.loginCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "mismatch" };
  }

  // Success — create the account on first sign-in, then burn all codes.
  const customer = await prisma.customer.upsert({
    where: { email },
    update: {},
    create: { email, marketingConsent: marketing },
  });
  await prisma.loginCode.deleteMany({ where: { email } });

  return { ok: true, customer: { id: customer.id, email: customer.email } };
}

// ---- Session cookie ------------------------------------------------------
export async function createCustomerSession(customer: {
  id: number;
  email: string;
}): Promise<void> {
  const token = await encryptCustomer({
    customerId: customer.id,
    email: customer.email,
  });
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true, // not readable by client-side JS (blocks XSS theft)
    secure: process.env.NODE_ENV === "production", // https-only in prod
    sameSite: "lax", // CSRF mitigation
    expires: new Date(Date.now() + SESSION_TTL_MS),
    path: "/",
  });
}

export async function deleteCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
}

// Read + verify the current customer session (cached per request).
export const getCustomerSession = cache(
  async (): Promise<CustomerSession | null> => {
    const store = await cookies();
    return decryptCustomer(store.get(CUSTOMER_SESSION_COOKIE)?.value);
  }
);

// Server-component guard: redirect to login unless a valid customer session exists.
export const requireCustomer = cache(async (): Promise<CustomerSession> => {
  const session = await getCustomerSession();
  if (!session) redirect("/authentication/login");
  return session;
});
