import { verifyCode, createCustomerSession } from "@/lib/customer-auth";

// POST /api/auth/verify-code — { email, code, marketing? }. On success creates
// the account (if new) and sets the httpOnly session cookie.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const code = String(body.code ?? "");
  const marketing = body.marketing !== false;

  const result = await verifyCode(email, code, marketing);
  if (!result.ok) {
    const message =
      result.error === "expired"
        ? "That code has expired — request a new one."
        : result.error === "too_many"
        ? "Too many attempts — request a new code."
        : result.error === "no_code"
        ? "Request a code first."
        : "That code isn't right. Check it and try again.";
    return Response.json({ error: message }, { status: 400 });
  }

  await createCustomerSession(result.customer);
  return Response.json({ ok: true });
}
