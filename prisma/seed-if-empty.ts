// Seeds the database ONLY when it is empty (no products yet).
//
// This is wired into the DEPLOY start command (see railway.json → start:deploy),
// NOT into local dev. It is safe to run on every deploy/restart:
//   • First deploy  → empty DB → runs the full seed once (fills the store).
//   • Later deploys → data exists → skips, so the manager's orders, customers
//                     and admin edits are NEVER wiped.
//
// Local development is unaffected — you still use `npm run dev` / `npm run seed`.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let count = 0;
  try {
    count = await prisma.product.count();
  } catch {
    count = 0; // tables not created yet → treat as empty
  }

  if (count > 0) {
    console.log(`[seed:if-empty] Database already has ${count} products — skipping seed.`);
    return;
  }

  console.log("[seed:if-empty] Empty database detected — running the one-time seed…");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  console.log("[seed:if-empty] Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[seed:if-empty] Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
