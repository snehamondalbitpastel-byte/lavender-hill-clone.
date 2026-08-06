import { deleteSession } from "@/lib/auth";

// POST /api/admin/logout — clears the session cookie.
export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}
