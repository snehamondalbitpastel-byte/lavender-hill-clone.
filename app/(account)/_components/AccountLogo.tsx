import Image from "next/image";

// The "Lavender Hill — England" wordmark used across the account pages.
// Exact asset from the live account UI (Shopify CDN), intrinsic ratio 191:60.
// Display size is set per screen via `className` (e.g. w-[191px] h-[60px]).
const LOGO_SRC =
  "https://cdn.shopify.com/s/files/1/0294/5973/files/LHC_newlogo_d3bb9732-413d-4e55-a611-ab5ce4918d6d_x320.png?v=1662718531";

export default function AccountLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Lavender Hill — England"
      width={191}
      height={60}
      priority
      sizes="191px"
      className={`object-contain ${className}`}
    />
  );
}
