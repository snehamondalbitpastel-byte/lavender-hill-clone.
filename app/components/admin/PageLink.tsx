"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

// Shows a spinner over the clicked pagination cell while the next page's data
// is being fetched (Next 16 useLinkStatus — pending until the server responds).
function PendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="absolute inset-0 flex items-center justify-center rounded-md bg-cream/85">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-espresso/25 border-t-espresso" />
    </span>
  );
}

// A pagination link with a built-in loading indicator. prefetch is off so the
// pending state actually appears on click (prefetched pages navigate instantly).
export default function PageLink({
  href,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      aria-label={ariaLabel}
      className={`relative ${className ?? ""}`}
    >
      {children}
      <PendingSpinner />
    </Link>
  );
}
