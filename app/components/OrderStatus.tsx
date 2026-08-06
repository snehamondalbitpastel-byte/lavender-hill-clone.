// Presentational status badges shared by the admin and customer order screens.
// No database import (pulls only pure labels from lib/order-status), so it's safe
// in any component tree.

import { FULFILLMENT_LABELS, PAYMENT_LABELS, RETURN_LABELS } from "@/lib/order-status";

const FULFILLMENT_STYLE: Record<string, string> = {
  unfulfilled: "bg-[#ece9e4] text-[#6b6257]",
  processing: "bg-[#fdeecb] text-[#8a6d1a]",
  packed: "bg-[#d9e6f2] text-[#2f5c85]",
  shipped: "bg-[#e0dcf0] text-[#5b4b9b]",
  delivered: "bg-[#d4e3cb] text-[#307a07]",
  cancelled: "bg-[#f4d6da] text-[#a23140]",
};

const PAYMENT_STYLE: Record<string, string> = {
  paid: "bg-[#d4e3cb] text-[#307a07]",
  partially_refunded: "bg-[#fdeecb] text-[#8a6d1a]",
  refunded: "bg-[#ece9e4] text-[#6b6257]",
  pending: "bg-[#fdeecb] text-[#8a6d1a]",
  failed: "bg-[#f4d6da] text-[#a23140]",
};

const base =
  "inline-block rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] font-medium whitespace-nowrap";

export function FulfillmentBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? FULFILLMENT_LABELS[status as keyof typeof FULFILLMENT_LABELS] ?? status;
  const style = FULFILLMENT_STYLE[status] ?? "bg-[#ece9e4] text-[#6b6257]";
  return <span className={`${base} ${style}`}>{text}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const label = PAYMENT_LABELS[status as keyof typeof PAYMENT_LABELS] ?? status;
  const style = PAYMENT_STYLE[status] ?? "bg-[#ece9e4] text-[#6b6257]";
  return <span className={`${base} ${style}`}>{label}</span>;
}

const RETURN_STYLE: Record<string, string> = {
  requested: "bg-[#fdeecb] text-[#8a6d1a]", // yellow — pending
  approved: "bg-[#d9e6f2] text-[#2f5c85]", // blue — approved
  received: "bg-[#d9e6f2] text-[#2f5c85]", // blue — item received
  refunded: "bg-[#d4e3cb] text-[#307a07]", // green — refunded
  rejected: "bg-[#f4d6da] text-[#a23140]", // red — rejected
  cancelled: "bg-[#ece9e4] text-[#6b6257]", // grey
};

export function ReturnBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? RETURN_LABELS[status as keyof typeof RETURN_LABELS] ?? status;
  const style = RETURN_STYLE[status] ?? "bg-[#ece9e4] text-[#6b6257]";
  return <span className={`${base} ${style}`}>{text}</span>;
}
