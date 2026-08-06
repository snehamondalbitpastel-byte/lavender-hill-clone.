import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/returns/count — number of returns awaiting the admin's first
// action ("requested"). Polled by the sidebar so the notification badge updates
// live when a customer raises a return, without a manual page refresh.
export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await prisma.return.count({ where: { status: "requested" } });
  return Response.json({ pending });
}
