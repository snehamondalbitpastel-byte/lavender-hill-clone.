"use client";

import { useCurrency } from "./CurrencyProvider";

// Renders an INR amount in the shopper's SELECTED currency (dynamic, live rates).
// A tiny client island so server components (order pages, receipts) can show
// converted prices without becoming client components themselves. Orders/Stripe
// still store INR — this is display-only, consistent with the rest of the site.
export default function Money({ inr }: { inr: number }) {
  const { money } = useCurrency();
  return <>{money(inr)}</>;
}
