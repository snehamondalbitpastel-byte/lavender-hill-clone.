// Customer session token — a signed JWT (jose, HS256), SEPARATE from the admin
// session so the two never mix. Like lib/session.ts it has NO `next/headers`
// import, so `proxy.ts` (Next 16 middleware) can read + verify it too. Cookie
// reading/writing lives in lib/customer-auth.ts.

import { SignJWT, jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// The httpOnly cookie that holds the customer's signed session.
export const CUSTOMER_SESSION_COOKIE = "lh_customer_session";

// Only non-sensitive identifiers live in the token.
export type CustomerSession = {
  customerId: number;
  email: string;
};

// Sign a payload into a token that expires in 30 days.
export async function encryptCustomer(payload: CustomerSession): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedKey);
}

// Verify + decode a token. Returns null if missing, tampered, or expired.
export async function decryptCustomer(
  token?: string
): Promise<CustomerSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as CustomerSession;
  } catch {
    return null;
  }
}
