// Session token: a signed JWT (jose, HS256). This file has NO `next/headers`
// import on purpose, so it can also be used inside `proxy.ts` (the Next 16
// middleware). Cookie reading/writing lives in lib/auth.ts.

import { SignJWT, jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// Name of the cookie that holds the signed session.
export const SESSION_COOKIE = "lh_admin_session";

// Only NON-sensitive identifiers go in the token — never the password.
export type SessionPayload = {
  userId: number;
  role: string;
  email: string;
};

// Sign a payload into a token that expires in 7 days.
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

// Verify + decode a token. Returns null if missing, tampered, or expired.
export async function decrypt(
  token?: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
