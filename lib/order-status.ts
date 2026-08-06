// ============================================================================
// Order lifecycle — PURE rules & labels (no database import), so this module is
// safe to use from both server and client components. The prisma-backed helpers
// (event logging) live in lib/order-workflow.ts, which re-exports everything here.
//
//   Payment life:      paid → partially_refunded → refunded   (also pending/failed)
//   Fulfillment life:  unfulfilled → processing → packed → shipped → delivered
//                      (or → cancelled, only before it ships)
//   Return track:      requested → approved → received → refunded
//                      (or → rejected)
// ============================================================================

// ---------------------------------------------------------------------------
// FULFILLMENT (goods life) — a strict forward-only chain.
// ---------------------------------------------------------------------------
export const FULFILLMENT_FLOW = [
  "unfulfilled",
  "processing",
  "packed",
  "shipped",
  "delivered",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_FLOW)[number] | "cancelled";

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// The single legal forward step from a given state (null = end of the chain).
export function nextFulfillment(status: string): FulfillmentStatus | null {
  const i = (FULFILLMENT_FLOW as readonly string[]).indexOf(status);
  if (i < 0 || i >= FULFILLMENT_FLOW.length - 1) return null;
  return FULFILLMENT_FLOW[i + 1];
}

// Can the goods move from `from` → `to`? Only the next step forward is allowed
// (no skipping, no going back). Cancelling is handled separately (canCancel).
export function canAdvanceFulfillment(from: string, to: string): boolean {
  return nextFulfillment(from) === to;
}

// An order can be cancelled only while it hasn't shipped yet — you can't un-ship
// a parcel that's already with the courier.
export function canCancel(fulfillmentStatus: string): boolean {
  return (
    fulfillmentStatus === "unfulfilled" ||
    fulfillmentStatus === "processing" ||
    fulfillmentStatus === "packed"
  );
}

// Shipping requires a tracking number — a "shipped" state with no way to track
// it is meaningless to the customer.
export function shippingNeedsTracking(to: string): boolean {
  return to === "shipped";
}

// The timestamp column to stamp when entering a state (null = none).
export function fulfillmentTimestampField(
  to: FulfillmentStatus
): "shippedAt" | "deliveredAt" | "cancelledAt" | null {
  if (to === "shipped") return "shippedAt";
  if (to === "delivered") return "deliveredAt";
  if (to === "cancelled") return "cancelledAt";
  return null;
}

// ---------------------------------------------------------------------------
// PAYMENT (money life)
// ---------------------------------------------------------------------------
export type PaymentStatus =
  | "pending"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "failed";

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  failed: "Failed",
};

// A refund is only possible on money we actually hold, and never for more than
// what's left un-refunded. Returns the resulting payment status.
export function canRefund(
  paymentStatus: string,
  total: number,
  alreadyRefunded: number,
  amount: number
):
  | { ok: true; nextStatus: PaymentStatus; refundedTotal: number }
  | { ok: false; error: string } {
  if (paymentStatus !== "paid" && paymentStatus !== "partially_refunded") {
    return { ok: false, error: "This order can't be refunded in its current state." };
  }
  const remaining = round2(total - alreadyRefunded);
  if (amount <= 0) return { ok: false, error: "Refund amount must be greater than zero." };
  if (amount > remaining + 0.001) {
    return { ok: false, error: `Refund exceeds the remaining ${remaining.toFixed(2)}.` };
  }
  const refundedTotal = round2(alreadyRefunded + amount);
  const nextStatus: PaymentStatus =
    refundedTotal >= round2(total) - 0.001 ? "refunded" : "partially_refunded";
  return { ok: true, nextStatus, refundedTotal };
}

// ---------------------------------------------------------------------------
// RETURNS — customer starts it, admin drives it to a refund.
// ---------------------------------------------------------------------------
// Simplified flow (no "awaiting item" or "inspection" steps): the admin approves,
// marks the item received when it arrives, then refunds.
export const RETURN_FLOW = [
  "requested",
  "approved",
  "received",
  "refunded",
] as const;

// Terminal "unhappy path" branches sit OUTSIDE the linear flow:
//   • rejected  — admin declines the request
//   • cancelled — customer/admin cancels
export type ReturnStatus = (typeof RETURN_FLOW)[number] | "rejected" | "cancelled";

export const RETURN_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  received: "Item received",
  refunded: "Refunded",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// The legal next step for a return (null = terminal). A "requested" return can
// instead be rejected — that branch is checked explicitly by the caller.
export function nextReturn(status: string): ReturnStatus | null {
  const i = (RETURN_FLOW as readonly string[]).indexOf(status);
  if (i < 0 || i >= RETURN_FLOW.length - 1) return null;
  return RETURN_FLOW[i + 1];
}

export function canAdvanceReturn(from: string, to: string): boolean {
  if (from === "requested" && to === "rejected") return true;
  return nextReturn(from) === to;
}

// ---------------------------------------------------------------------------
// RETURN WINDOW — a customer may request a return only within N days of delivery.
// ---------------------------------------------------------------------------
export const RETURN_WINDOW_DAYS = 7;

export function returnWindowOpen(deliveredAt: Date | string | null): boolean {
  if (!deliveredAt) return false; // never delivered → nothing to return yet
  const delivered = new Date(deliveredAt).getTime();
  const windowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - delivered <= windowMs;
}

// The last day a return can be requested = delivery date + the window.
export function returnDeadline(deliveredAt: Date | string | null): Date | null {
  if (!deliveredAt) return null;
  return new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// True if the customer may open a NEW return on this order right now.
export function canRequestReturn(order: {
  fulfillmentStatus: string;
  deliveredAt: Date | string | null;
  paymentStatus: string;
}): boolean {
  return (
    order.fulfillmentStatus === "delivered" &&
    returnWindowOpen(order.deliveredAt) &&
    order.paymentStatus !== "refunded"
  );
}

// ---------------------------------------------------------------------------
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
