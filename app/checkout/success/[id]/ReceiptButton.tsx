"use client";

import { useT } from "@/app/components/LocaleProvider";

type OrderItem = {
  title: string; colour: string; size: string;
  price: number; qty: number; bundleDiscount: number;
};
type OrderData = {
  orderNumber: string;
  email: string;
  placed: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  addressLines: string[];
};

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceiptButton({ order }: { order: OrderData }) {
  const { t } = useT();
  function download() {
    const rows = order.items
      .map((it) => {
        const label = `${it.title} (${[it.colour, it.size].filter(Boolean).join(" / ")}) × ${it.qty}`;
        return `<tr><td>${label}</td><td style="text-align:right">${inr(it.price * it.qty - (it.bundleDiscount || 0))}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${order.orderNumber}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;max-width:540px;margin:28px auto;color:#2f2a24;padding:0 18px}
table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #eee;font-size:14px}
.tot td{font-weight:700;border-bottom:none;border-top:2px solid #2f2a24}h3{margin:22px 0 6px}p{color:#6b6b6b}</style>
</head><body>
<div style="text-align:center;margin-bottom:22px">
<div style="font:36px Georgia,'Times New Roman',serif;color:#8a8f9e">Lavender Hill</div>
<div style="font-size:11px;letter-spacing:6px;color:#a7abb6">— ENGLAND —</div></div>
<h2 style="margin:0">Receipt · ${order.orderNumber}</h2>
<p style="margin:4px 0 18px">${order.placed}<br>${order.email}</p>
<table>${rows}</table>
<table style="margin-top:10px">
<tr><td>Subtotal</td><td style="text-align:right">${inr(order.subtotal)}</td></tr>
${order.discount > 0 ? `<tr><td>Discounts</td><td style="text-align:right">− ${inr(order.discount)}</td></tr>` : ""}
<tr><td>Shipping</td><td style="text-align:right">${order.shipping > 0 ? inr(order.shipping) : "Free"}</td></tr>
<tr class="tot"><td>Total</td><td style="text-align:right">${inr(order.total)}</td></tr>
</table>
<h3>Delivery</h3>
<p style="line-height:1.6">${order.addressLines.join("<br>")}</p>
<p style="margin-top:26px;font-size:12px;color:#9b9b9b">Thank you for shopping with Lavender Hill.</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${order.orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className="btn-lh">
      {t("order.download_receipt", "Download receipt")}
    </button>
  );
}
