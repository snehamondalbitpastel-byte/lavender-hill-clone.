// Returns — helpers shared by the customer request page and the return API.
// The key rule: a customer can only return units they actually still hold, i.e.
// ordered quantity minus whatever is already tied up in a live return.

import { prisma } from "./prisma";

export type ReturnableItem = {
  index: number; // position in the order's items array (the stable line id)
  title: string;
  colour: string;
  size: string;
  image: string;
  price: number;
  orderedQty: number;
  available: number; // units still returnable
};

type OrderItemSnapshot = {
  title?: string; colour?: string; size?: string; image?: string; price?: number; qty?: number;
};

export async function getReturnableItems(orderId: number): Promise<ReturnableItem[]> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return [];
  const items = JSON.parse(order.items || "[]") as OrderItemSnapshot[];

  // Units already committed to a return that hasn't been rejected/cancelled.
  const returns = await prisma.return.findMany({
    where: { orderId, status: { notIn: ["rejected", "cancelled"] } },
  });
  const returnedByIndex: Record<number, number> = {};
  for (const r of returns) {
    const ritems = JSON.parse(r.items || "[]") as { index: number; qty: number }[];
    for (const it of ritems) returnedByIndex[it.index] = (returnedByIndex[it.index] || 0) + it.qty;
  }

  return items.map((it, index) => {
    const orderedQty = Number(it.qty) || 0;
    return {
      index,
      title: it.title ?? "",
      colour: it.colour ?? "",
      size: it.size ?? "",
      image: it.image ?? "",
      price: Number(it.price) || 0,
      orderedQty,
      available: Math.max(0, orderedQty - (returnedByIndex[index] || 0)),
    };
  });
}

export function returnNumberFor(id: number): string {
  return `RET${10000 + id}`;
}
