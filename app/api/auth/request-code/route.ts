import { requestCode } from "@/lib/customer-auth";
import { getLocale } from "@/lib/i18n";

// POST /api/auth/request-code — { email, marketing? }. Generates + emails a
// 6-digit code. Always the same shape of response for valid emails (no leak of
// whether the account exists); 429 on rate-limit, 400 on a malformed email.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "");
  const marketing = body.marketing !== false; // default true (checkbox on)

  // Localize the code email to the shopper's currently-selected UI language.
  const locale = await getLocale();
  const result = await requestCode(email, marketing, locale);
  if (!result.ok) {
    if (result.error === "rate_limited") {
      return Response.json(
        { error: "Too many code requests. Please try again later." },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
