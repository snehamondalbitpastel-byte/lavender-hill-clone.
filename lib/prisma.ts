import { PrismaClient } from "@prisma/client";

// A single shared Prisma client. In dev, Next.js hot-reloads modules, which
// would otherwise create many clients (and exhaust DB connections). Caching it
// on globalThis keeps exactly one instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
