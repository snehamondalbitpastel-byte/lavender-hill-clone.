import { prisma } from "@/lib/prisma";

// GET /api/looks — the "As Styled By You" carousel looks
// (colours parsed from their JSON string).
export async function GET() {
  const looks = await prisma.look.findMany({ orderBy: { order: "asc" } });

  const result = looks.map((l) => ({
    ...l,
    colors: JSON.parse(l.colors) as string[],
  }));

  return Response.json(result);
}
