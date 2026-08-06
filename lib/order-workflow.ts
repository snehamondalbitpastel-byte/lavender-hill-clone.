// ============================================================================
// Order lifecycle — server-side helpers (database-backed). Re-exports all the
// PURE rules from lib/order-status.ts so server code can import everything from
// one place, and adds the audit-trail writer that needs Prisma.
//
// Client components should import the pure rules from "@/lib/order-status"
// directly (this module pulls in Prisma and is server-only).
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export * from "./order-status";

// A Prisma client OR an interactive-transaction client — event logging works
// with either, so a status update + its audit row commit together.
type Db = PrismaClient | Prisma.TransactionClient;

export type OrderEventInput = {
  type: string;
  message: string;
  actor?: "system" | "admin" | "customer";
  meta?: Record<string, unknown>;
};

// Append one immutable event to an order's timeline. Pass a transaction client
// so the event and the status change it describes commit together.
export async function logOrderEvent(
  db: Db,
  orderId: number,
  event: OrderEventInput
): Promise<void> {
  await db.orderEvent.create({
    data: {
      orderId,
      type: event.type,
      message: event.message,
      actor: event.actor ?? "system",
      meta: JSON.stringify(event.meta ?? {}),
    },
  });
}

// Convenience wrapper using the shared client when no transaction is needed.
export function logOrderEventGlobal(orderId: number, event: OrderEventInput) {
  return logOrderEvent(prisma, orderId, event);
}
