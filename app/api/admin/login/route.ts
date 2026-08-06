import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

// POST /api/admin/login  { email, password }
// Verifies against the hashed password, then sets the httpOnly session cookie.
// The response body NEVER contains the password or the token.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return Response.json(
      { error: "Please enter your email and password." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  // One generic message for both cases — never reveal which part was wrong.
  if (!user || !ok || user.role !== "admin") {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  await createSession({ userId: user.id, role: user.role, email: user.email });
  return Response.json({ ok: true });
}
