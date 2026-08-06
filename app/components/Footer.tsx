// Site footer — mirrors the live Lavender Hill footer (scheme-2 = beige).
// Internal page links use # placeholders (those pages don't exist in the clone);
// social links point to the real brand profiles.

const LINK_COLUMNS = [
  {
    heading: "About Us",
    links: [
      "Our Story",
      "Blog",
      "Press",
      "Become an ambassador",
      "Affiliates",
      "Privacy Policy",
      "Terms & Conditions",
    ],
  },
  {
    heading: "Customer Service",
    links: [
      "FAQ's",
      "Contact Us",
      "Customer Reviews",
      "Shipping and Delivery",
      "Returns and Exchanges",
    ],
  },
  {
    heading: "Product",
    links: [
      "Size Guide",
      "Garment Care",
      "What is Modal?",
      "Our Cashmere",
      "T-shirt Guide",
      "Find Your Perfect T-shirt",
      "Shop All Products",
    ],
  },
];

const SOCIALS = [
  {
    label: "Follow on Facebook",
    href: "https://www.facebook.com/lavenderhillclothing/",
    path: "M10.183 21.85v-8.868H7.2V9.526h2.983V6.982a4.17 4.17 0 0 1 4.44-4.572 22.33 22.33 0 0 1 2.667.144v3.084h-1.83a1.44 1.44 0 0 0-1.713 1.68v2.208h3.423l-.447 3.456h-2.97v8.868h-3.57Z",
  },
  {
    label: "Follow on Instagram",
    href: "https://www.instagram.com/lavenderhillclothing/",
    path: "M12 2.4c-2.607 0-2.934.011-3.958.058-1.022.046-1.72.209-2.33.446a4.705 4.705 0 0 0-1.7 1.107 4.706 4.706 0 0 0-1.108 1.7c-.237.611-.4 1.31-.446 2.331C2.41 9.066 2.4 9.392 2.4 12c0 2.607.011 2.934.058 3.958.046 1.022.209 1.72.446 2.33a4.706 4.706 0 0 0 1.107 1.7c.534.535 1.07.863 1.7 1.108.611.237 1.309.4 2.33.446 1.025.047 1.352.058 3.959.058s2.934-.011 3.958-.058c1.022-.046 1.72-.209 2.33-.446a4.706 4.706 0 0 0 1.7-1.107 4.706 4.706 0 0 0 1.108-1.7c.237-.611.4-1.31.446-2.33.047-1.025.058-1.352.058-3.959s-.011-2.934-.058-3.958c-.047-1.022-.209-1.72-.446-2.33a4.706 4.706 0 0 0-1.107-1.7 4.705 4.705 0 0 0-1.7-1.108c-.611-.237-1.31-.4-2.331-.446C14.934 2.41 14.608 2.4 12 2.4Zm0 1.73c2.563 0 2.867.01 3.88.056.935.042 1.443.199 1.782.33.448.174.768.382 1.104.718.336.336.544.656.718 1.104.131.338.287.847.33 1.783.046 1.012.056 1.316.056 3.879 0 2.563-.01 2.867-.056 3.88-.043.935-.199 1.444-.33 1.782a2.974 2.974 0 0 1-.719 1.104 2.974 2.974 0 0 1-1.103.718c-.339.131-.847.288-1.783.33-1.012.046-1.316.056-3.88.056-2.563 0-2.866-.01-3.878-.056-.936-.042-1.445-.199-1.783-.33a2.974 2.974 0 0 1-1.104-.718 2.974 2.974 0 0 1-.718-1.104c-.131-.338-.288-.847-.33-1.783-.047-1.012-.056-1.316-.056-3.879 0-2.563.01-2.867.056-3.88.042-.935.199-1.443.33-1.782.174-.448.382-.768.718-1.104a2.974 2.974 0 0 1 1.104-.718c.338-.131.847-.288 1.783-.33C9.133 4.14 9.437 4.13 12 4.13Zm0 11.07a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm0-8.13a4.93 4.93 0 1 0 0 9.86 4.93 4.93 0 0 0 0-9.86Zm6.276-.194a1.152 1.152 0 1 1-2.304 0 1.152 1.152 0 0 1 2.304 0Z",
  },
  {
    label: "Follow on Pinterest",
    href: "https://www.pinterest.com/lavenderhillclothing/",
    path: "M11.765 2.401c3.59-.054 5.837 1.4 6.895 3.95.349.842.722 2.39.442 3.675-.112.512-.144 1.048-.295 1.53-.308.983-.708 1.853-1.238 2.603-.72 1.02-1.81 1.706-3.182 2.052-1.212.305-2.328-.152-2.976-.643-.206-.156-.483-.36-.56-.643h-.029c-.046.515-.244 1.062-.383 1.531-.193.65-.23 1.321-.472 1.929a12.345 12.345 0 0 1-.942 1.868c-.184.302-.692 1.335-1.061 1.347-.04-.078-.057-.108-.06-.245-.118-.19-.035-.508-.087-.766-.082-.4-.145-1.123-.06-1.53v-.643c.096-.442.092-.894.207-1.317.25-.92.39-1.895.648-2.848.249-.915.477-1.916.678-2.847.045-.21-.21-.815-.265-1.041-.174-.713-.042-1.7.176-2.236.275-.674 1.08-1.703 2.122-1.439.838.212 1.371 1.118 1.09 2.266-.295 1.205-.677 2.284-.943 3.49-.068.311.05.641.118.827.248.672 1 1.324 2.004 1.072 1.52-.383 2.193-1.76 2.652-3.246.124-.402.109-.781.206-1.225.204-.935.118-2.331-.177-3.061-.472-1.17-1.353-1.92-2.563-2.328L12.707 4.3c-.56-.128-1.626.064-2.004.183-1.69.535-2.737 1.427-3.388 3.032-.222.546-.344 1.1-.383 1.868l-.03.276c.13.686.144 1.14.413 1.653.132.252.447.451.5.765.032.185-.104.464-.147.613-.065.224-.041.48-.147.673-.192.349-.714.087-.943-.061-1.192-.77-2.175-2.995-1.62-5.144.085-.332.09-.62.206-.919.723-1.844 1.802-2.978 3.359-3.95.583-.364 1.37-.544 2.092-.734l1.149-.154Z",
  },
  {
    label: "Follow on TikTok",
    href: "https://www.tiktok.com/@lavenderhillclothing",
    path: "M20.027 10.168a5.125 5.125 0 0 1-4.76-2.294v7.893a5.833 5.833 0 1 1-5.834-5.834c.122 0 .241.011.361.019v2.874c-.12-.014-.237-.036-.36-.036a2.977 2.977 0 0 0 0 5.954c1.644 0 3.096-1.295 3.096-2.94L12.56 2.4h2.75a5.122 5.122 0 0 0 4.72 4.573v3.195",
  },
];

// Accepted payment methods (compact brand badges), in the live footer's order.
const PAYMENTS = [
  "Amex",
  "Apple Pay",
  "Bancontact",
  "Diners",
  "Discover",
  "Google Pay",
  "Wero",
  "Maestro",
  "Mastercard",
  "PayPal",
  "Shop Pay",
  "Union Pay",
  "Visa",
];

type PayStyle = {
  text?: string;
  bg?: string;
  color?: string;
  weight?: number;
  size?: number;
  italic?: boolean;
  circles?: string[];
};

// Per-brand badge style: `circles` for the Mastercard/Maestro double-disc mark,
// otherwise brand-coloured text (optionally on a coloured card).
const PAY: Record<string, PayStyle> = {
  Amex: { text: "AMEX", bg: "#1F72CF", color: "#fff", weight: 700, size: 7 },
  "Apple Pay": { text: "Pay", color: "#000", weight: 600, size: 8 },
  Bancontact: { text: "bancontact", color: "#004E91", weight: 700, size: 5 },
  Diners: { text: "DINERS", color: "#0079BE", weight: 700, size: 5.5 },
  Discover: { text: "DISCOVER", color: "#4d4d4d", weight: 700, size: 5.2 },
  "Google Pay": { text: "GPay", color: "#5F6368", weight: 600, size: 7.5 },
  Wero: { text: "wero", color: "#E5007D", weight: 700, size: 7.5 },
  Maestro: { circles: ["#0099DF", "#EB001B"] },
  Mastercard: { circles: ["#EB001B", "#F79E1B"] },
  PayPal: { text: "PayPal", color: "#003087", weight: 700, italic: true, size: 7.5 },
  "Shop Pay": { text: "shop", bg: "#5A31F4", color: "#fff", weight: 700, size: 8 },
  "Union Pay": { text: "UnionPay", color: "#E21836", weight: 700, size: 6 },
  Visa: { text: "VISA", color: "#1434CB", weight: 800, italic: true, size: 8.5 },
};

function TwoCircles({ a, b }: { a: string; b: string }) {
  return (
    <svg width="24" height="15" viewBox="0 0 24 15" aria-hidden="true">
      <circle cx="9" cy="7.5" r="6" fill={a} />
      <circle cx="15" cy="7.5" r="6" fill={b} fillOpacity="0.85" />
    </svg>
  );
}

function PayCard({ method }: { method: string }) {
  const s: PayStyle = PAY[method] || { text: method, color: "#555", size: 7 };
  return (
    <span
      title={method}
      className="inline-flex items-center justify-center w-[42px] h-[26px] rounded-[3px] border border-line"
      style={{ background: s.bg || "#fff" }}
    >
      {s.circles ? (
        <TwoCircles a={s.circles[0]} b={s.circles[1]} />
      ) : (
        <span
          className="whitespace-nowrap"
          style={{
            fontSize: `${s.size || 7}px`,
            color: s.color,
            fontWeight: s.weight || 600,
            fontStyle: s.italic ? "italic" : "normal",
            letterSpacing: "-0.02em",
          }}
        >
          {s.text}
        </span>
      )}
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="bg-beige text-espresso mt-auto">
      {/* Full-width (.container = 100%) with the theme gutter — near edge-to-edge
          columns, matching the live footer. */}
      <div className="w-full px-6 md:px-12 lg:px-14 py-16 md:py-20">
        {/* Top: newsletter + link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 lg:gap-8">
          {/* Newsletter */}
          <div>
            <p className="eyebrow mb-4">Newsletter</p>
            <p className="text-sm text-espresso/70 mb-5 max-w-xs">
              Sign up to our newsletter to receive exclusive offers.
            </p>
            <div className="max-w-xs">
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                autoComplete="email"
                className="w-full border border-espresso/25 bg-transparent px-3 py-3 text-sm outline-none transition-colors focus:border-espresso placeholder:text-espresso/50"
              />
              <button type="button" className="btn-lh mt-4 text-xs px-8 py-3">
                Subscribe
              </button>
            </div>
          </div>

          {/* Link columns */}
          {LINK_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="eyebrow mb-5">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-espresso/70 hover:text-espresso transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social icons */}
        <ul className="flex gap-5 mt-14">
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="block text-espresso/70 hover:text-espresso transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={s.path} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                </svg>
              </a>
            </li>
          ))}
        </ul>

        {/* Aside: copyright + payment methods */}
        <div className="mt-8 pt-8 border-t border-espresso/15 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-espresso/60 tracking-wide">
            © 2026 - Lavender Hill Clothing · Ecommerce by Shopify
          </p>
          <ul className="flex flex-wrap gap-1.5 md:max-w-[420px] md:justify-end">
            {PAYMENTS.map((p) => (
              <li key={p}>
                <PayCard method={p} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
