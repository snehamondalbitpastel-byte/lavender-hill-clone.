import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getAdmin } from "@/lib/auth";

// POST /api/admin/upload — multipart file → saved to /public/uploads → { url }.
// Local disk is fine for dev; production would swap this for a blob store
// (Vercel Blob / Cloudinary / S3). Same-origin /uploads/* works with next/image.
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Please choose an image file." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Image must be under 5 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, name), bytes);

  return Response.json({ url: `/uploads/${name}` });
}
