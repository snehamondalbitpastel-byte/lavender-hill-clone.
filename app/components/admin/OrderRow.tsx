"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// A clickable table row — the WHOLE row opens the order's detail page. The order
// number inside stays a real <Link> (keyboard focus + open-in-new-tab still work).
export default function OrderRow({ id, children }: { id: number; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/admin/orders/${id}`)}
      className="border-b border-line/70 last:border-0 cursor-pointer transition-colors hover:bg-espresso/[0.04]"
    >
      {children}
    </tr>
  );
}
