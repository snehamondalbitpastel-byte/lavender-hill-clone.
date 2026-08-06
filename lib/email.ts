// Transactional email — one place all mail goes through, so swapping providers
// is a local change. Uses SMTP (Nodemailer) when SMTP_USER + SMTP_PASS are set;
// otherwise falls back to logging the code to the server console (so the whole
// login flow is testable in development without any email credentials).
//
// For Gmail: SMTP_USER = your address, SMTP_PASS = a 16-char Google App Password
// (NOT your normal password — requires 2-Step Verification).

import nodemailer from "nodemailer";
import { RETURN_WINDOW_DAYS } from "./order-status";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587);
// Accept either SMTP_USER/SMTP_PASS (canonical) or EMAIL_USER/EMAIL_PASS.
const user = process.env.SMTP_USER || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const FROM = process.env.EMAIL_FROM || (user ? `Lavender Hill <${user}>` : "");

// Only build a transport if credentials exist; otherwise stay in dev fallback.
const transporter =
  user && pass
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit SSL; 587 = STARTTLS
        auth: { user, pass },
        // Fail fast instead of hanging forever if the SMTP host is slow or
        // unreachable (some cloud hosts throttle/block outbound mail ports).
        // Without these, a stalled connection blocks the request indefinitely.
        connectionTimeout: 10_000, // ms to establish the TCP connection
        greetingTimeout: 10_000, // ms to wait for the server's 220 greeting
        socketTimeout: 20_000, // ms of socket inactivity before giving up
      })
    : null;

// HTTPS email via Resend — used where outbound SMTP is blocked (e.g. Railway,
// Render, most serverless hosts). Preferred whenever RESEND_API_KEY is set.
// The From must be a Resend-verified domain, or the shared onboarding@resend.dev
// sender for quick setups (override with RESEND_FROM).
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Lavender Hill <onboarding@resend.dev>";

// One delivery path for every email: Resend (HTTPS) if configured, else SMTP,
// else a dev-console fallback so flows stay testable without any mail creds.
// Resend is called over its plain HTTPS API (no SDK) so delivery never depends
// on an SMTP port — which hosts like Railway block.
async function deliver(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend send failed (${res.status}): ${detail}`);
    }
    return;
  }
  if (transporter) {
    await transporter.sendMail({ from: FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`\n✉  [email:dev] To ${msg.to} — ${msg.subject}\n`);
}

export async function sendCode(email: string, code: string): Promise<void> {
  // Mirrors the live Lavender Hill verification email: centred logo, big spaced
  // code, single-use note, footer with policy links.
  const html = `
  <div style="background:#ffffff;padding:48px 20px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:500px;margin:0 auto;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1;letter-spacing:1px;color:#8a8f9e;font-weight:400;">Lavender Hill</div>
      <div style="font-size:11px;letter-spacing:6px;color:#a7abb6;margin-top:8px;">&mdash; ENGLAND &mdash;</div>

      <p style="font-size:15px;color:#3a3a3a;margin:52px 0 20px;">Your verification code:</p>
      <div style="font-size:34px;line-height:1;letter-spacing:14px;font-weight:700;color:#2f2a24;padding-left:14px;">${code}</div>
      <p style="font-size:14px;color:#6b6b6b;margin:24px 0 0;">This code can only be used once. It expires in 10 minutes.</p>

      <div style="margin-top:56px;border-top:1px solid #eeeeee;padding-top:22px;">
        <p style="font-size:12px;color:#9b9b9b;margin:0;">&copy; Lavender Hill Clothing</p>
        <p style="font-size:12px;margin:10px 0 0;">
          <a href="#" style="color:#5b6b86;text-decoration:none;margin:0 8px;">Privacy policy</a>
          <a href="#" style="color:#5b6b86;text-decoration:none;margin:0 8px;">Terms of service</a>
        </p>
      </div>
    </div>
  </div>`;

  await deliver({
    to: email,
    subject: `${code} is your code`,
    text: `Your Lavender Hill verification code is ${code}. This code can only be used once. It expires in 10 minutes.`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Order lifecycle emails — one place, so every status/refund/return message
// shares the same branded shell. Best-effort by design: the caller wraps this in
// try/catch so a mail failure NEVER breaks a status change or a refund.
// ---------------------------------------------------------------------------

// Branded wrapper (mirrors the login email's look) around a heading + body copy.
function orderShell(heading: string, bodyHtml: string): string {
  return `
  <div style="background:#ffffff;padding:48px 20px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1;letter-spacing:1px;color:#8a8f9e;">Lavender Hill</div>
      <div style="font-size:11px;letter-spacing:6px;color:#a7abb6;margin-top:8px;">&mdash; ENGLAND &mdash;</div>
      <h1 style="font-size:20px;color:#2f2a24;margin:40px 0 16px;font-weight:600;">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#4a4a4a;text-align:left;">${bodyHtml}</div>
      <div style="margin-top:48px;border-top:1px solid #eeeeee;padding-top:22px;">
        <p style="font-size:12px;color:#9b9b9b;margin:0;">&copy; Lavender Hill Clothing</p>
      </div>
    </div>
  </div>`;
}

export type OrderMail =
  | { kind: "shipped"; orderNumber: string; trackingCarrier?: string; trackingNumber?: string }
  | { kind: "delivered"; orderNumber: string }
  | { kind: "cancelled"; orderNumber: string }
  | { kind: "refunded"; orderNumber: string; amount: string }
  | { kind: "return_approved"; orderNumber: string }
  | { kind: "return_rejected"; orderNumber: string; reason?: string }
  | { kind: "return_received"; orderNumber: string }
  | { kind: "return_failed"; orderNumber: string; reason?: string };

// Subject + heading + body copy for each kind of order email.
function composeOrderMail(mail: OrderMail): { subject: string; heading: string; body: string } {
  const n = mail.orderNumber;
  switch (mail.kind) {
    case "shipped": {
      const track =
        mail.trackingNumber
          ? `<p>Tracking: <strong>${mail.trackingCarrier ? mail.trackingCarrier + " " : ""}${mail.trackingNumber}</strong></p>`
          : "";
      return {
        subject: `Your order ${n} has shipped`,
        heading: "Your order is on its way 📦",
        body: `<p>Good news — order <strong>${n}</strong> has been shipped and is on its way to you.</p>${track}`,
      };
    }
    case "delivered":
      return {
        subject: `Your order ${n} was delivered`,
        heading: "Delivered ✅",
        body: `<p>Order <strong>${n}</strong> has been marked as delivered. We hope you love it!</p><p>If anything isn't right, you can request a return from your account within ${RETURN_WINDOW_DAYS} days.</p>`,
      };
    case "cancelled":
      return {
        subject: `Your order ${n} was cancelled`,
        heading: "Order cancelled",
        body: `<p>Order <strong>${n}</strong> has been cancelled. If you were charged, a refund will follow separately.</p>`,
      };
    case "refunded":
      return {
        subject: `Refund processed for order ${n}`,
        heading: "Refund processed",
        body: `<p>A refund of <strong>${mail.amount}</strong> has been processed for order <strong>${n}</strong>. It may take a few business days to appear on your statement.</p>`,
      };
    case "return_approved":
      return {
        subject: `Your return for order ${n} is approved`,
        heading: "Return approved ↩️",
        body: `<p>Your return request for order <strong>${n}</strong> has been approved. We'll be in touch with the next steps to send the item(s) back.</p>`,
      };
    case "return_rejected":
      return {
        subject: `Update on your return for order ${n}`,
        heading: "Return request declined",
        body: `<p>We're sorry — your return request for order <strong>${n}</strong> could not be approved.</p>${
          mail.reason ? `<p>Reason: ${mail.reason}</p>` : ""
        }`,
      };
    case "return_received":
      return {
        subject: `We've received your return for order ${n}`,
        heading: "Return received",
        body: `<p>We've received and verified the returned item(s) for order <strong>${n}</strong>. Your refund is being processed.</p>`,
      };
    case "return_failed":
      return {
        subject: `Update on your return for order ${n}`,
        heading: "Return could not be refunded",
        body: `<p>We received the returned item(s) for order <strong>${n}</strong>, but they did not pass our inspection, so a refund can't be issued.</p>${
          mail.reason ? `<p>Reason: ${mail.reason}</p>` : ""
        }<p>Please contact support if you have any questions.</p>`,
      };
  }
}

export async function sendOrderEmail(to: string, mail: OrderMail): Promise<void> {
  const { subject, heading, body } = composeOrderMail(mail);
  await deliver({
    to,
    subject,
    text: `${heading}\n\n${body.replace(/<[^>]+>/g, "")}`,
    html: orderShell(heading, body),
  });
}

// Back-in-stock alert — a standalone email (no order involved). Sent when a
// colour a shopper subscribed to is restocked. Best-effort like sendOrderEmail.
export async function sendBackInStockEmail(
  to: string,
  opts: { productTitle: string; colour?: string; size?: string; url?: string }
): Promise<void> {
  const variant = [opts.colour, opts.size].filter(Boolean).join(" / ");
  const what = variant ? `${opts.productTitle} (${variant})` : opts.productTitle;
  const subject = `${what} is back in stock`;
  const heading = "Back in stock 🎉";
  const link = opts.url
    ? `<p style="margin-top:20px;"><a href="${opts.url}" style="color:#5b6b86;">Shop it now &rarr;</a></p>`
    : "";
  const body = `<p>Good news — <strong>${what}</strong> is available again. Popular pieces sell fast, so grab yours before it's gone.</p>${link}`;
  await deliver({
    to,
    subject,
    text: `${heading}\n\n${body.replace(/<[^>]+>/g, "")}`,
    html: orderShell(heading, body),
  });
}
